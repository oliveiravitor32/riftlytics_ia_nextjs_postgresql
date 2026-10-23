/**
 * Custom error classes for application-wide error handling
 */

/**
 * Base error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly context: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Riot API specific errors
 */
export class RiotApiError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    context: Record<string, unknown> = {}
  ) {
    super(message, statusCode, context);
    Object.setPrototypeOf(this, RiotApiError.prototype);
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends RiotApiError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Rate limit exceeded. Please try again later.', 429, { retryAfter });
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, context: Record<string, unknown> = {}) {
    super(`${resource} not found`, 404, context);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Not signed in (missing, expired or forged session)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Entre com o Google para continuar') {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Signed in, but not allowed (e.g. not on the posting allowlist)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Seu acesso ainda não foi liberado') {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(
    service: string,
    message: string,
    context: Record<string, unknown> = {}
  ) {
    super(`External service error from ${service}: ${message}`, 503, {
      service,
      ...context,
    });
    this.service = service;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Type guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Extract status code from any error type
 */
export function getErrorStatusCode(error: unknown): number {
  return isAppError(error) ? error.statusCode : 500;
}
