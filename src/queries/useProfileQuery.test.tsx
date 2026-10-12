/**
 * useProfileQuery: calls our /api/profile route and handles rate limiting
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useProfileQuery } from '@/src/queries/useProfileQuery';
import { isRateLimitError } from '@/src/queries/useRankQuery';

const fetchMock = jest.fn();

function response(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(body),
  } as Response);
}

describe('useProfileQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches the profile from /api/profile with the region', async () => {
    const profile = { name: 'Tester', rankInfo: null, flexRankInfo: null };
    fetchMock.mockImplementation(() => response(profile));

    const { result } = renderHook(
      () => useProfileQuery('Tester#br1', { region: 'br1' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/Tester%23br1?region=br1'
    );
  });

  it('does not fetch when summoner name is null', () => {
    const { result } = renderHook(() => useProfileQuery(null), { wrapper });

    expect(result.current.status).toBe('pending');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('429 becomes a rate limit error with retryAfter and is not retried', async () => {
    fetchMock.mockImplementation(() =>
      response({ error: 'Rate limit', context: { retryAfter: 12 } }, 429)
    );

    const { result } = renderHook(() => useProfileQuery('Tester#br1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isRateLimitError(result.current.error)).toBe(true);
    expect(
      isRateLimitError(result.current.error) && result.current.error.retryAfter
    ).toBe(12);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('other errors are retried (up to 2 times) and expose the message', async () => {
    fetchMock.mockImplementation(() =>
      response({ error: 'Summoner not found' }, 500)
    );

    const { result } = renderHook(() => useProfileQuery('Nope#br1'), {
      wrapper,
    });

    // The hook's own backoff is 1s + 2s between attempts
    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    });
    expect(result.current.error?.message).toBe('Summoner not found');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 10_000);
});
