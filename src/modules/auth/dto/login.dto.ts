import { IsString, IsEmail, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  login: string; // email or username

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
