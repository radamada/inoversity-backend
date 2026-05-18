import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  IsInt,
  Min,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'correctIndexesInBounds', async: false })
class CorrectIndexesInBoundsConstraint implements ValidatorConstraintInterface {
  validate(value: number[], args: ValidationArguments) {
    const obj = args.object as any;
    if (!Array.isArray(obj.options) || obj.options.length === 0) return false;
    if (!Array.isArray(value) || value.length === 0) return false;
    return value.every((v) => Number.isInteger(v) && v >= 0 && v < obj.options.length);
  }
  defaultMessage(args: ValidationArguments) {
    const obj = args.object as any;
    const len = Array.isArray(obj.options) ? obj.options.length : 0;
    return `correctIndexes trebuie să conțină indexuri valide între 0 și ${Math.max(0, len - 1)}`;
  }
}

export class QuizQuestionDto {
  @IsString()
  @MaxLength(1000)
  question: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  options: string[];

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @Validate(CorrectIndexesInBoundsConstraint)
  correctIndexes: number[];
}

export class CurriculumLessonDto {
  @IsOptional()
  @IsString()
  lessonId?: string | null;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cdnVideoId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsIn(['video', 'quiz'])
  type?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  @ArrayMaxSize(100)
  questions?: QuizQuestionDto[];
}

export class CurriculumSectionDto {
  @IsOptional()
  @IsString()
  sectionId?: string | null;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumLessonDto)
  @ArrayMaxSize(100)
  lessons: CurriculumLessonDto[];
}

export class SaveCurriculumDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumSectionDto)
  @ArrayMaxSize(50, { message: 'Curriculumul nu poate depăși 50 de secțiuni' })
  curriculum: CurriculumSectionDto[];
}
