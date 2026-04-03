import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  MinLength,
  Min,
  Max,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({ example: 'Leadership Participativ' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  description: string;

  @ApiProperty({ example: 109.99 })
  @IsNumber()
  @Min(0)
  @Max(99999, { message: 'Prețul nu poate depăși 99999' })
  @Type(() => Number)
  @Transform(({ value }) => Math.round(value * 100) / 100)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Maxim 20 de taguri' })
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Fiecare tag poate avea maxim 100 de caractere' })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Maxim 50 de obiective de învățare' })
  @IsString({ each: true })
  @MaxLength(300, { each: true, message: 'Fiecare obiectiv poate avea maxim 300 de caractere' })
  whatYouLearn?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, { message: 'Maxim 30 de cerințe' })
  @IsString({ each: true })
  @MaxLength(300, { each: true, message: 'Fiecare cerință poate avea maxim 300 de caractere' })
  requirements?: string[];

  @ApiPropertyOptional({ example: 'beginner' })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'], { message: 'Nivel invalid. Valori acceptate: beginner, intermediate, advanced' })
  level?: string;

  @ApiPropertyOptional({ example: 'ro' })
  @IsOptional()
  @IsEnum(['ro', 'en', 'fr', 'de', 'es', 'it'], { message: 'Limbă invalidă. Valori acceptate: ro, en, fr, de, es, it' })
  language?: string;

  @ApiPropertyOptional({ description: 'Admin only: override instructor (MongoDB ObjectId)' })
  @IsOptional()
  @IsString()
  instructorId?: string;
}
