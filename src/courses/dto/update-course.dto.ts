import { PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';

/**
 * Update body for a course. Extinde CreateCourseDto ca clasă reală (nu
 * `Partial<...>`, care s-ar șterge în `Object` la runtime și ar dezactiva
 * ValidationPipe-ul global). Astfel `whitelist` + `forbidNonWhitelisted`
 * resping câmpurile care NU sunt în DTO (published, rating, reviewCount,
 * enrollmentCount, slug etc.) cu 400, în loc să le lase în `$set`.
 *
 * `instructorId` rămâne în DTO (override admin documentat), dar service-ul
 * îl ignoră pentru non-admini.
 */
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
