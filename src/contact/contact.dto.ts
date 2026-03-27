import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({ example: 'Ion Popescu' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ion@example.com' })
  @IsEmail({}, { message: 'Email invalid' })
  email: string;

  @ApiProperty({ example: 'Întrebare despre un curs' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Bună ziua, am o întrebare...' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
