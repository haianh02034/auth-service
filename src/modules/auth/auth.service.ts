import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { jwtConfig } from '../../config/jwt.config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private sessionsService: SessionsService,
    private jwtService: JwtService,
  ) {}

  async validateUser(login: string, password: string): Promise<User | null> {
    const user = await this.findUserByLogin(login);

    if (!user || !user.is_active) {
      return null;
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async register(registerDto: RegisterDto): Promise<{ user: User; message: string }> {
    try {
      const user = await this.usersService.create(registerDto);
      return {
        user,
        message: 'User registered successfully',
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async login(
    loginDto: LoginDto,
    userAgent: string,
    ipAddress: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: User;
    requiresTwoFactor?: boolean;
  }> {
    const user = await this.validateUser(loginDto.login, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check 2FA if enabled
    if (user.two_factor_enabled) {
      if (!loginDto.twoFactorCode) {
        return { requiresTwoFactor: true, user, accessToken: '', refreshToken: '' };
      }

      const isValidTwoFactor = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: loginDto.twoFactorCode,
        window: 2,
      });

      if (!isValidTwoFactor) {
        throw new UnauthorizedException('Invalid two-factor authentication code');
      }
    }

    const tokens = await this.generateTokens(user);

    // Create session
    await this.sessionsService.createSession(
      user.id,
      tokens.refreshToken,
      userAgent,
      ipAddress,
    );

    // Update last seen
    await this.usersService.updateLastSeen(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.sessionsService.findByRefreshToken(refreshToken);

    if (!session || session.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = session.user;
    if (!user.is_active) {
      throw new UnauthorizedException('User account is disabled');
    }

    const tokens = await this.generateTokens(user);

    // Update session with new refresh token
    await this.sessionsService.updateRefreshToken(session.id, tokens.refreshToken);
    await this.sessionsService.updateLastActivity(session.id);

    return tokens;
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const session = await this.sessionsService.findByRefreshToken(refreshToken);

    if (session) {
      await this.sessionsService.deleteSession(session.id);
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: number): Promise<{ message: string }> {
    await this.sessionsService.deleteUserSessions(userId);
    return { message: 'Logged out from all devices' };
  }

  async getUserSessions(userId: number) {
    return await this.sessionsService.findUserSessions(userId);
  }

  async generateTwoFactorSecret(userId: number): Promise<{ secret: string; qrCode: string }> {
    const user = await this.usersService.findById(userId);

    const secret = speakeasy.generateSecret({
      name: `Chat App (${user.email})`,
      issuer: 'Chat Application',
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  async enableTwoFactor(userId: number, secret: string, token: string): Promise<{ message: string }> {
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.usersService.enableTwoFactor(userId, secret);

    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(userId: number, password: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);

    const isPasswordValid = await this.usersService.validatePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.usersService.disableTwoFactor(userId);

    return { message: 'Two-factor authentication disabled successfully' };
  }

  private async findUserByLogin(login: string): Promise<User | null> {
    // Try to find by email first
    if (login.includes('@')) {
      return await this.usersService.findByEmail(login);
    }

    // Otherwise, try to find by username
    return await this.usersService.findByUsername(login);
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      username: user.username,
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: jwtConfig.accessTokenExpiresIn,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenId: uuidv4() },
      { expiresIn: jwtConfig.refreshTokenExpiresIn },
    );

    return { accessToken, refreshToken };
  }
}
