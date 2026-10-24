/**
 * Error → JSON response for the /api routes: 429 with Retry-After for rate
 * limits, the error's own status otherwise; only 5xx are logged.
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';
import { RateLimitError, getErrorMessage, getErrorStatusCode } from './errors';

export function errorResponse(error: unknown, label: string) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfter: error.retryAfter },
      { status: 429, headers: { 'Retry-After': String(error.retryAfter) } }
    );
  }
  const status = getErrorStatusCode(error);
  if (status >= 500) {
    logger.error(`${label}: Error`, { error: getErrorMessage(error) });
  }
  return NextResponse.json({ error: getErrorMessage(error) }, { status });
}
