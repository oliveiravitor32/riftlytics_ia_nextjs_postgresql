/**
 * Matchup tips (pure logic): the fixed prompt sent to the AI, the expected
 * answer shape and the pair order used as the cache key.
 * The AI call is src/services/geminiService.ts; the cache is matchupService.
 *
 * Made to be read in a minute: a summary of who wins what (tags), then a few
 * short actions per champion. One answer serves both sides: "a" is always
 * champA and "b" champB.
 */

import { z } from 'zod';

/** A tip stays valid for 2 months, then is generated again on demand */
export const MATCHUP_TTL_DAYS = 60;

/** New (AI-generated) matchups per person per hour; stored ones are free */
export const NEW_MATCHUPS_PER_HOUR = 10;

/** Who has the edge: champion a, champion b or neither */
export const SIDES = ['a', 'b', 'igual'] as const;
export type Side = (typeof SIDES)[number];

export const LEVELS = ['Fácil', 'Médio', 'Difícil'] as const;
export type Level = (typeof LEVELS)[number];

/** Action rows, in this order: label → what each cell tells */
const ROW_GUIDE = {
  Trocas: 'como trocar dano (curtas ou longas, quando entrar e sair)',
  Wave: 'onde manter a wave e por quê',
  'Depois do 6': 'como jogar depois do nível 6',
  'Estando atrás': 'como jogar estando atrás',
} as const;

export const MATCHUP_ROWS = Object.keys(
  ROW_GUIDE
) as (keyof typeof ROW_GUIDE)[];

const MAX_WORDS = 10;

const side = z.enum(SIDES);
const level = z.enum(LEVELS);
// A little slack over MAX_WORDS: the model counts words loosely
const cell = z
  .string()
  .trim()
  .min(1)
  .refine((text) => text.split(/\s+/).length <= MAX_WORDS + 4);

const tipSchema = z.object({
  vantagem: z.object({ quem: side, motivo: cell }),
  trocas: z.object({ curtas: side, longas: side }),
  jungle: side,
  roaming: side,
  dificuldade: z.object({ a: level, b: level }),
  linhas: z
    .array(z.object({ aspecto: z.string(), a: cell, b: cell }))
    .length(MATCHUP_ROWS.length)
    .refine((rows) => rows.every((r, i) => r.aspecto === MATCHUP_ROWS[i])),
});

export type MatchupTip = z.infer<typeof tipSchema>;

/** The AI's JSON text (or a stored value) → tip; throws if it isn't one */
export function parseMatchupTip(value: unknown): MatchupTip {
  return tipSchema.parse(typeof value === 'string' ? JSON.parse(value) : value);
}

/** Alphabetical pair: A×B and B×A share one cached answer */
export function orderPair(first: string, second: string) {
  const swapped = first.localeCompare(second) > 0;
  return {
    champA: swapped ? second : first,
    champB: swapped ? first : second,
    swapped,
  };
}

const flip = (s: Side): Side => (s === 'a' ? 'b' : s === 'b' ? 'a' : s);

/** Stored tip (champA, champB) → the order the user asked for */
export function orientTip(tip: MatchupTip, swapped: boolean): MatchupTip {
  if (!swapped) return tip;
  return {
    vantagem: { ...tip.vantagem, quem: flip(tip.vantagem.quem) },
    trocas: {
      curtas: flip(tip.trocas.curtas),
      longas: flip(tip.trocas.longas),
    },
    jungle: flip(tip.jungle),
    roaming: flip(tip.roaming),
    dificuldade: { a: tip.dificuldade.b, b: tip.dificuldade.a },
    linhas: tip.linhas.map(({ aspecto, a, b }) => ({ aspecto, a: b, b: a })),
  };
}

/** "a" is about `champA`, "b" about `champB` */
export function buildMatchupPrompt(champA: string, champB: string): string {
  return [
    `League of Legends: ${champA} (a) vs ${champB} (b) na fase de rotas.`,
    'Para quem tem 1 minuto antes da partida: preencha o JSON, sem texto fora dele.',
    'Campos de quem leva vantagem: "a", "b" ou "igual".',
    '- vantagem.quem: quem ganha a rota; vantagem.motivo: o porquê, em poucas palavras.',
    '- trocas.curtas e trocas.longas: quem vence trocas curtas e quem vence trocas longas.',
    '- jungle: quem ganha mais com a ajuda do jungle.',
    '- roaming: quem tem prioridade para roaming.',
    `- dificuldade.a e dificuldade.b: ${LEVELS.join(', ')}, para quem joga cada campeão.`,
    'linhas: uma por aspecto, nesta ordem (campo "aspecto" = o nome antes dos dois-pontos), com a ação para cada campeão:',
    ...MATCHUP_ROWS.map((r) => `- ${r}: ${ROW_GUIDE[r]}`),
    'Regras de escrita:',
    `- Cada frase com no máximo ${MAX_WORDS} palavras, começando por um verbo.`,
    '- Marque com **asteriscos duplos** a palavra mais importante de cada frase (só uma).',
    '- Português do Brasil com acentuação correta.',
    '- Cite só habilidades e mecânicas reais desses campeões (Q, W, E, R, passiva); nunca invente termos. Na dúvida, seja genérico.',
  ].join('\n');
}

const SIDE_SCHEMA = { type: 'STRING', enum: [...SIDES] };

/** Gemini's responseSchema (OpenAPI subset) for the same shape */
export const MATCHUP_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    vantagem: {
      type: 'OBJECT',
      properties: { quem: SIDE_SCHEMA, motivo: { type: 'STRING' } },
      required: ['quem', 'motivo'],
    },
    trocas: {
      type: 'OBJECT',
      properties: { curtas: SIDE_SCHEMA, longas: SIDE_SCHEMA },
      required: ['curtas', 'longas'],
    },
    jungle: SIDE_SCHEMA,
    roaming: SIDE_SCHEMA,
    dificuldade: {
      type: 'OBJECT',
      properties: {
        a: { type: 'STRING', enum: [...LEVELS] },
        b: { type: 'STRING', enum: [...LEVELS] },
      },
      required: ['a', 'b'],
    },
    linhas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          aspecto: { type: 'STRING', enum: [...MATCHUP_ROWS] },
          a: { type: 'STRING' },
          b: { type: 'STRING' },
        },
        required: ['aspecto', 'a', 'b'],
        propertyOrdering: ['aspecto', 'a', 'b'],
      },
    },
  },
  required: [
    'vantagem',
    'trocas',
    'jungle',
    'roaming',
    'dificuldade',
    'linhas',
  ],
  propertyOrdering: [
    'vantagem',
    'trocas',
    'jungle',
    'roaming',
    'dificuldade',
    'linhas',
  ],
} as const;

/** "Espere a **fumaça** acabar" → [text, bold, text] pieces for rendering */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false }
    );
}
