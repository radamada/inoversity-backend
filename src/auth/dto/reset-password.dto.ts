import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Parola trebuie să aibă minim 8 caractere' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'Parola trebuie să conțină cel puțin o literă mare, o literă mică și o cifră' })
  @MaxLength(72, { message: 'Parola poate avea maxim 72 de caractere' })
  password: string;
}
