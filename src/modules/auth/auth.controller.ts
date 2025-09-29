import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Response,
  Get,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { jwtConfig } from '../../config/jwt.config';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
    @Response({ passthrough: true }) res,
  ) {
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await this.authService.login(loginDto, userAgent, ipAddress);

    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true };
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, jwtConfig.cookieOptions);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req,
    @Response({ passthrough: true }) res,
  ) {
    // Try to get refresh token from cookie first, then from body
    const refreshToken = req.cookies?.refreshToken || refreshTokenDto.refreshToken;

    const tokens = await this.authService.refreshToken(refreshToken);

    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, jwtConfig.cookieOptions);

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req, @Response({ passthrough: true }) res) {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Request() req, @Response({ passthrough: true }) res) {
    await this.authService.logoutAll(req.user.userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    return { message: 'Logged out from all devices' };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Request() req) {
    return await this.authService.getUserSessions(req.user.userId);
  }

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  async generateTwoFactorSecret(@Request() req) {
    return await this.authService.generateTwoFactorSecret(req.user.userId);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async enableTwoFactor(
    @Request() req,
    @Body() body: { secret: string; token: string },
  ) {
    return await this.authService.enableTwoFactor(
      req.user.userId,
      body.secret,
      body.token,
    );
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disableTwoFactor(
    @Request() req,
    @Body() body: { password: string },
  ) {
    return await this.authService.disableTwoFactor(req.user.userId, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return req.user;
  }
}
