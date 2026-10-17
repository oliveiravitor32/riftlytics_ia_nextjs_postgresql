/**
 * Browser-side client for our /api routes, shared by every query hook.
 * Non-2xx answers become ApiRequestError; 429s carry Riot's wait time and
 * are never retried (retrying would only burn more of the Riot quota).
 */

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function isRateLimitError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 429;
}

/** Calls an /api route and parses its JSON, throwing ApiRequestError on failure */
async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (response.ok) return response.json();

  const body = await response.json().catch(() => ({}));
  // rank/refresh send retryAfter at the top level, the other routes in context
  const retryAfter =
    Number(
      body.retryAfter ??
        body.context?.retryAfter ??
        response.headers.get('Retry-After')
    ) || undefined;
  throw new ApiRequestError(
    body.error ?? `Falha na requisição (${response.status})`,
    response.status,
    retryAfter
  );
}

export const getJson = <T>(url: string) => requestJson<T>(url);
export const postJson = <T>(url: string) =>
  requestJson<T>(url, { method: 'POST' });

/** react-query `retry`: up to 2 retries, except for rate limits */
export function retryUnlessRateLimited(failureCount: number, error: Error) {
  return !isRateLimitError(error) && failureCount < 2;
}
