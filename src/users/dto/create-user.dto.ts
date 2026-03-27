import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'ion@example.com' })
  @IsEmail({}, { message: 'Email invalid' })
  email: string;

  @ApiProperty({ example: 'Ion Popescu' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'parola123' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  termsAccepted?: boolean;
  termsAcceptedAt?: Date;
}
