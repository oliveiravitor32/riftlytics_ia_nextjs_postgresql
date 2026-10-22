/**
 * Gemini API (Google AI Studio) shapes we use, from the docs:
 * https://ai.google.dev/api/generate-content
 * https://ai.google.dev/gemini-api/docs/structured-output
 * Only the fields we send or read; the tests' fake (jest/gemini-mock) is
 * built on these same interfaces.
 */

export interface GeminiPart {
  text: string;
}

export interface GeminiContent {
  role?: 'user' | 'model';
  parts: GeminiPart[];
}

/** POST /v1beta/models/{model}:generateContent */
export interface GenerateContentRequest {
  contents: GeminiContent[];
  generationConfig?: {
    responseMimeType?: 'application/json' | 'text/plain';
    responseSchema?: unknown;
    temperature?: number;
    /** Gemini 3: how much the model reasons first (minimal | low | high) */
    thinkingConfig?: { thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high' };
  };
}

export interface GeminiCandidate {
  content?: GeminiContent;
  /** STOP | MAX_TOKENS | SAFETY | RECITATION | OTHER ... */
  finishReason?: string;
}

export interface GenerateContentResponse {
  candidates?: GeminiCandidate[];
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/** Error body (google.rpc.Status), e.g. 429 RESOURCE_EXHAUSTED */
export interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
    details?: {
      '@type': string;
      /** On RetryInfo, e.g. "31s" */
      retryDelay?: string;
    }[];
  };
}
