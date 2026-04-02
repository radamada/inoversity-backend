import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Mongoose CastError (invalid ObjectId) → 400
    if (exception instanceof MongooseError.CastError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        message: 'ID invalid',
      });
    }

    // Mongoose ValidationError → 400
    if (exception instanceof MongooseError.ValidationError) {
      const messages = Object.values(exception.errors).map((e) => e.message);
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        message: messages.length === 1 ? messages[0] : messages,
      });
    }

    // MongoDB duplicate key error (E11000) → 409
    if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as any).code === 11000
    ) {
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        timestamp: new Date().toISOString(),
        message: 'Înregistrare duplicată',
      });
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    // For HttpExceptions, use NestJS response; for unknown errors, never leak details
    if (exception instanceof HttpException) {
      const exResponse = exception.getResponse();
      return response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        ...(typeof exResponse === 'string' ? { message: exResponse } : (exResponse as object)),
      });
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      message: 'Eroare internă de server',
    });
  }
}
