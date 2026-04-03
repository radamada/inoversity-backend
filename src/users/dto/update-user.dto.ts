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
  // Only CDN/HTTP(S) URLs accepted — prevents setting arbitrary data URIs or javascript: URLs
  @IsUrl({ require_tld: false }, { message: 'Avatar-ul trebuie să fie un URL valid' })
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
