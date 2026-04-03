import { IsEmail, IsString, MinLength, MaxLength, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
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
  @MinLength(8, { message: 'Parola trebuie să aibă minim 8 caractere' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'Parola trebuie să conțină cel puțin o literă mare, o literă mică și o cifră' })
  @MaxLength(72, { message: 'Parola poate avea maxim 72 de caractere' })
  password: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  termsAccepted: boolean;
}
