import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserSession } from '../../sessions/entities/session.entity';

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ unique: true })
  username: string;

  @Column()
  @Exclude()
  password_hash: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.OFFLINE,
  })
  status: UserStatus;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ default: 'vi' })
  language: string;

  @Column({ default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_admin: boolean;

  @Column({ default: false })
  two_factor_enabled: boolean;

  @Column({ nullable: true })
  @Exclude()
  two_factor_secret: string;

  @Column({ nullable: true })
  last_seen_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => UserSession, session => session.user)
  sessions: UserSession[];
}
