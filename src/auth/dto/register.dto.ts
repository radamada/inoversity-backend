import { IsEmail, IsString, MinLength, MaxLength, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ion@example.com' })
  @IsEmail({}, { message: 'Email invalid' })
  email: string;

  @ApiProperty({ example: 'Ion Popescu' })
  @IsString()
  @MinLength(2, { message: 'Numele trebuie să aibă minim 2 caractere' })
  @MaxLength(50, { message: 'Numele poate avea maxim 50 de caractere' })
  @Matches(/^[A-Za-zÀ-ÖØ-öø-ÿăîâșțĂÎÂȘȚ]+([- ][A-Za-zÀ-ÖØ-öø-ÿăîâșțĂÎÂȘȚ]+)*$/, {
    message: 'Numele poate conține doar litere, spații și cratimă (ex: Ion Popescu, Maria-Ioana)',
  })
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
