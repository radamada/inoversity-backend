import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'ion@example.com' })
  @IsEmail()
  // Normalize email to lowercase — User schema stores lowercase, ensures consistent lookup
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @ApiProperty({ example: 'parola123' })
  @IsString()
  @MinLength(6)
  // Cap at 72 chars — bcrypt silently truncates beyond this, preventing DoS amplification
  @MaxLength(72, { message: 'Parola poate avea maxim 72 de caractere' })
  password: string;
}
