import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCodes } from '../constants/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const status = exception.getStatus();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        const message = resp.message;

        if (Array.isArray(message)) {
          const fieldErrors: Record<string, string> = {};
          for (const msg of message) {
            if (typeof msg === 'string') {
              const parts = msg.split(': ');
              const field = parts[0]?.toLowerCase() ?? 'unknown';
              fieldErrors[field] = msg;
            }
          }
          return response.status(status).json({
            status: 'fail',
            data: fieldErrors,
          });
        }
      }

      const code = (exceptionResponse as Record<string, unknown>)?.code as string | undefined;
      const respMessage = (exceptionResponse as Record<string, unknown>)?.message as string | undefined;

      const effectiveCode = code ?? (status === HttpStatus.TOO_MANY_REQUESTS ? ErrorCodes.G_002.code : undefined);

      return response.status(status).json({
        status: 'error',
        message: respMessage ?? exception.message,
        ...(effectiveCode ? { code: effectiveCode } : {}),
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ErrorCodes.G_001.message,
      code: ErrorCodes.G_001.code,
    });
  }
}
