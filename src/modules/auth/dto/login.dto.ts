import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;

  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
