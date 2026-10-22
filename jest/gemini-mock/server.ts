/**
 * Answers Gemini's generateContent (generativelanguage.googleapis.com) with a
 * deterministic matchup table built from the prompt's two champions, in the
 * documented response shape (src/types/gemini-api.ts). No free-tier quota is
 * spent by the tests. Failures (429, bad JSON...) are faked by the tests
 * themselves through `geminiFault`.
 */

import { MATCHUP_ASPECTS } from '@/src/lib/matchup';
import type {
  GeminiErrorResponse,
  GenerateContentRequest,
  GenerateContentResponse,
} from '@/src/types/gemini-api';

/** Every call the fake answered (prompt text), for "was the AI called?" */
export const geminiCalls: string[] = [];

/** Set by a test to make the next calls fail; reset it after */
export const geminiFault: { next: Response | null } = { next: null };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** The fake's text for champion `name` on `aspect` */
export const fakeTip = (name: string, aspect: string) =>
  `${name}: dica de ${aspect.toLowerCase()}`;

export function geminiRateLimited(retryDelay = '31s'): Response {
  const body: GeminiErrorResponse = {
    error: {
      code: 429,
      message: 'Resource has been exhausted (e.g. check quota).',
      status: 'RESOURCE_EXHAUSTED',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay },
      ],
    },
  };
  return json(body, 429);
}

export function geminiText(text: string): Response {
  const body: GenerateContentResponse = {
    candidates: [
      { content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' },
    ],
  };
  return json(body);
}

export function withGeminiMock(realFetch: typeof fetch): typeof fetch {
  return (async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    if (url.host !== 'generativelanguage.googleapis.com') {
      return realFetch(input, init);
    }
    if (!/:generateContent$/.test(url.pathname)) {
      throw new Error(`Endpoint do Gemini sem mock: ${url.pathname}`);
    }
    const key = new Headers(init?.headers).get('x-goog-api-key');
    if (!key) {
      return json(
        {
          error: {
            code: 403,
            message: 'API key missing',
            status: 'PERMISSION_DENIED',
          },
        },
        403
      );
    }
    if (geminiFault.next) return geminiFault.next.clone();

    const request = JSON.parse(String(init?.body)) as GenerateContentRequest;
    const prompt = request.contents[0].parts[0].text;
    geminiCalls.push(prompt);
    const [, a, b] = prompt.match(/: (.+) vs (.+) na fase de rotas/) ?? [];
    return geminiText(
      JSON.stringify({
        linhas: MATCHUP_ASPECTS.map((aspecto) => ({
          aspecto,
          a: fakeTip(a, aspecto),
          b: fakeTip(b, aspecto),
        })),
      })
    );
  }) as typeof fetch;
}
