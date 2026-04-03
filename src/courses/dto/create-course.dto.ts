import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  Min,
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
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatYouLearn?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
