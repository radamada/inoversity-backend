import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('ID invalid');
    }
    return value;
  }
}

/**
 * Like ParseObjectIdPipe but allows the value to be omitted entirely
 * (undefined / empty string). Validates only when a value is present.
 * Use for optional @Query() parameters that must be a valid ObjectId
 * when provided — closes NoSQL injection via `?id[$ne]=` etc.
 */
@Injectable()
export class ParseOptionalObjectIdPipe implements PipeTransform<unknown, string | undefined> {
  transform(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
      throw new BadRequestException('ID invalid');
    }
    return value;
  }
}
