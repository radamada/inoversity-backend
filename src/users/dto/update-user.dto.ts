import { IsOptional, IsString, IsBoolean, MaxLength, MinLength, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Numele trebuie să aibă minim 2 caractere' })
  @MaxLength(100)
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
