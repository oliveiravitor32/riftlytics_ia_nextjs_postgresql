/**
 * Gemini (Google AI Studio, free tier) for the matchup tips, server only.
 * One generateContent call with a fixed JSON schema; the answer is validated
 * before anyone sees or stores it.
 * https://ai.google.dev/api/generate-content
 */

import 'server-only';
import {
  AppError,
  ExternalServiceError,
  RateLimitError,
} from '@/src/lib/errors';
import {
  MATCHUP_RESPONSE_SCHEMA,
  buildMatchupPrompt,
  parseMatchupRows,
  type MatchupRow,
} from '@/src/lib/matchup';
import type {
  GeminiErrorResponse,
  GenerateContentRequest,
  GenerateContentResponse,
} from '@/src/types/gemini-api';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Alias of the newest Flash model; GEMINI_MODEL pins another one
const DEFAULT_MODEL = 'gemini-flash-latest';
const TIMEOUT_MS = 30_000;

/** "31s" → 31; Gemini's RetryInfo on a 429 */
function retryAfterOf(body: GeminiErrorResponse | null): number {
  const delay = body?.error.details?.find((d) => d.retryDelay)?.retryDelay;
  const seconds = delay ? Math.ceil(parseFloat(delay)) : NaN;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

/** Rows about champA (column a) and champB (column b) */
export async function generateMatchupRows(
  champA: string,
  champB: string
): Promise<MatchupRow[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AppError('GEMINI_API_KEY não configurada', 500);

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const body: GenerateContentRequest = {
    contents: [
      { role: 'user', parts: [{ text: buildMatchupPrompt(champA, champB) }] },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MATCHUP_RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  };

  const res = await fetch(`${API_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const error = (await res
      .json()
      .catch(() => null)) as GeminiErrorResponse | null;
    if (res.status === 429) throw new RateLimitError(retryAfterOf(error));
    throw new ExternalServiceError('Gemini', `status ${res.status}`, {
      status: error?.error.status,
    });
  }

  const data = (await res.json()) as GenerateContentResponse;
  const text = data.candidates?.[0]?.content?.parts.map((p) => p.text).join('');
  try {
    return parseMatchupRows(text ?? '');
  } catch {
    throw new ExternalServiceError('Gemini', 'resposta fora do formato', {
      finishReason: data.candidates?.[0]?.finishReason,
    });
  }
}
