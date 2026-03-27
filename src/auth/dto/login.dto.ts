import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'ion@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'parola123' })
  @IsString()
  @MinLength(6)
  password: string;
}
