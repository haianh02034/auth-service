import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserSession } from './entities/session.entity';
import { v4 as uuidv4 } from 'uuid';
import * as UAParser from 'ua-parser-js';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(UserSession)
    private sessionsRepository: Repository<UserSession>,
  ) {}

  async createSession(
    userId: number,
    refreshToken: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<UserSession> {
    const parser = new UAParser(userAgent);
    const deviceInfo = {
      browser: parser.getBrowser(),
      os: parser.getOS(),
      device: parser.getDevice(),
    };

    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session = this.sessionsRepository.create({
      user_id: userId,
      session_token: sessionToken,
      refresh_token: refreshToken,
      device_info: deviceInfo,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt,
    });

    return await this.sessionsRepository.save(session);
  }

  async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    return await this.sessionsRepository.findOne({
      where: { refresh_token: refreshToken },
      relations: ['user'],
    });
  }

  async findBySessionToken(sessionToken: string): Promise<UserSession | null> {
    return await this.sessionsRepository.findOne({
      where: { session_token: sessionToken },
      relations: ['user'],
    });
  }

  async findUserSessions(userId: number): Promise<UserSession[]> {
    return await this.sessionsRepository.find({
      where: { user_id: userId },
      order: { last_activity_at: 'DESC' },
    });
  }

  async updateLastActivity(sessionId: number): Promise<void> {
    await this.sessionsRepository.update(sessionId, {
      last_activity_at: new Date(),
    });
  }

  async updateRefreshToken(sessionId: number, refreshToken: string): Promise<void> {
    await this.sessionsRepository.update(sessionId, {
      refresh_token: refreshToken,
    });
  }

  async deleteSession(sessionId: number): Promise<void> {
    await this.sessionsRepository.delete(sessionId);
  }

  async deleteUserSessions(userId: number, excludeSessionId?: number): Promise<void> {
    const query = this.sessionsRepository.createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId });

    if (excludeSessionId) {
      query.andWhere('id != :sessionId', { sessionId: excludeSessionId });
    }

    await query.execute();
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.sessionsRepository.delete({
      expires_at: LessThan(new Date()),
    });
  }
}
