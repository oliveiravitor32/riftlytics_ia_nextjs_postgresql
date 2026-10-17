import {
  ExternalServiceError,
  NotFoundError,
  RateLimitError,
  RiotApiError,
  getErrorMessage,
  getErrorStatusCode,
  isAppError,
} from './errors';

describe('app errors', () => {
  it('carry the HTTP status the routes answer with', () => {
    expect(new NotFoundError('Summoner').statusCode).toBe(404);
    expect(new RateLimitError(12).statusCode).toBe(429);
    expect(new ExternalServiceError('Riot API', 'down').statusCode).toBe(503);
    expect(new RiotApiError('forbidden', 403).statusCode).toBe(403);
  });

  it('RateLimitError exposes Retry-After (default 60s) in its context', () => {
    expect(new RateLimitError(12)).toMatchObject({
      retryAfter: 12,
      context: { retryAfter: 12 },
    });
    expect(new RateLimitError().retryAfter).toBe(60);
  });

  it('keep instanceof working across the hierarchy', () => {
    const error = new RateLimitError(5);
    expect(error).toBeInstanceOf(RiotApiError);
    expect(isAppError(error)).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
  });

  it('serialize for logs with name, message, status and context', () => {
    expect(
      JSON.parse(JSON.stringify(new NotFoundError('Summoner', { id: 1 })))
    ).toEqual({
      name: 'NotFoundError',
      message: 'Summoner not found',
      statusCode: 404,
      context: { id: 1 },
    });
  });
});

describe('getErrorMessage / getErrorStatusCode', () => {
  it('read errors, strings and anything else', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('texto')).toBe('texto');
    expect(getErrorMessage({ weird: true })).toBe(
      'An unexpected error occurred'
    );
  });

  it('use the app error status, 500 otherwise', () => {
    expect(getErrorStatusCode(new NotFoundError('X'))).toBe(404);
    expect(getErrorStatusCode(new Error('boom'))).toBe(500);
    expect(getErrorStatusCode('boom')).toBe(500);
  });
});
