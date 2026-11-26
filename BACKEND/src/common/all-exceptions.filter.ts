import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { QueryFailedError } from 'typeorm';

/**
 * Exception filter globale: intercetta ogni errore in un unico punto.
 * Ogni errore esce nel formato del contratto API: { statusCode, error, message, details? }.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errori');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message, details } = this.normalizza(exception);
    response.status(statusCode).json({
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'Error',
      message,
      ...(details ? { details } : {}),
    });
  }

  private normalizza(exception: unknown): { statusCode: number; message: string; details?: Record<string, string> } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') return { statusCode, message: body };
      const { message, details } = body as { message?: string | string[]; details?: Record<string, string> };
      return { statusCode, message: Array.isArray(message) ? message.join('; ') : (message ?? exception.message), details };
    }
    // 23505 = violazione di un vincolo UNIQUE: rete di sicurezza contro le richieste concorrenti.
    if (exception instanceof QueryFailedError && (exception.driverError as { code?: string })?.code === '23505') {
      return { statusCode: HttpStatus.CONFLICT, message: 'Elemento già presente' };
    }
    // Classe 22 = dati non validi per il tipo di colonna (es. byte NUL in un testo): errore del client, non del server.
    if (exception instanceof QueryFailedError && String((exception.driverError as { code?: string })?.code).startsWith('22')) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Valore non valido' };
    }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Errore interno del server' };
  }
}
