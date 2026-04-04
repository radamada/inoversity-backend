import { IsOptional, IsString, IsBoolean, MaxLength, MinLength, IsUrl, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Numele trebuie să aibă minim 2 caractere' })
  @MaxLength(50, { message: 'Numele poate avea maxim 50 de caractere' })
  @Matches(/^[A-Za-zÀ-ÖØ-öø-ÿăîâșțĂÎÂȘȚ]+([- ][A-Za-zÀ-ÖØ-öø-ÿăîâșțĂÎÂȘȚ]+)*$/, {
    message: 'Numele poate conține doar litere, spații și cratimă (ex: Ion Popescu, Maria-Ioana)',
  })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  // Only HTTPS CDN URLs accepted (set via POST /users/me/avatar upload endpoint)
  @IsUrl({ protocols: ['https'], require_tld: true }, { message: 'Avatar-ul trebuie să fie un URL HTTPS valid' })
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;
}
