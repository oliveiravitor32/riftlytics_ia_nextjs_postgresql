/**
 * Matchup tips (pure logic): the fixed prompt sent to the AI, the expected
 * answer shape and the pair order used as the cache key.
 * The AI call is src/services/geminiService.ts; the cache is matchupService.
 */

import { z } from 'zod';

/** Table rows, always these, in this order: label → what the AI answers */
const ASPECT_GUIDE = {
  Vantagem: 'quem tem vantagem na rota e por quê',
  Trocas: 'como trocar dano na fase de rotas',
  Wave: 'onde e como a wave deve ficar',
  Roaming: 'quem tem prioridade para roaming',
  'Ajuda do jungle': 'quem ganha mais com a ajuda do jungle',
  'Depois do 6': 'como se comportar depois do nível 6',
  'Estando atrás': 'como jogar estando atrás',
  Dificuldade: 'dificuldade do matchup para esse campeão',
} as const;

export const MATCHUP_ASPECTS = Object.keys(
  ASPECT_GUIDE
) as (keyof typeof ASPECT_GUIDE)[];

/** A tip stays valid for 2 months, then is generated again on demand */
export const MATCHUP_TTL_DAYS = 60;

/** New (AI-generated) matchups per person per hour; stored ones are free */
export const NEW_MATCHUPS_PER_HOUR = 10;

export type MatchupRow = { aspecto: string; a: string; b: string };

const rowsSchema = z
  .object({
    linhas: z
      .array(
        z.object({
          aspecto: z.string(),
          a: z.string().trim().min(1),
          b: z.string().trim().min(1),
        })
      )
      .length(MATCHUP_ASPECTS.length),
  })
  .refine(({ linhas }) =>
    linhas.every((row, i) => row.aspecto === MATCHUP_ASPECTS[i])
  );

/** The AI's JSON text → rows; throws if it isn't exactly the expected table */
export function parseMatchupRows(text: string): MatchupRow[] {
  return rowsSchema.parse(JSON.parse(text)).linhas;
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

/** Stored rows (champA, champB) → the order the user asked for */
export function orientRows(rows: MatchupRow[], swapped: boolean): MatchupRow[] {
  return swapped
    ? rows.map(({ aspecto, a, b }) => ({ aspecto, a: b, b: a }))
    : rows;
}

/** Column "a" is about `champA`, column "b" about `champB` */
export function buildMatchupPrompt(champA: string, champB: string): string {
  return [
    `League of Legends: ${champA} vs ${champB} na fase de rotas.`,
    'Responda em português do Brasil, só com a tabela, sem texto fora dela.',
    'Uma linha para cada aspecto, nesta ordem (campo "aspecto" = o nome antes dos dois-pontos):',
    ...MATCHUP_ASPECTS.map((a) => `- ${a}: ${ASPECT_GUIDE[a]}`),
    `Na coluna "a" fale de ${champA}; na coluna "b", de ${champB}.`,
    'Cada célula com uma frase curta e direta (até 20 palavras).',
  ].join('\n');
}

/** Gemini's responseSchema (OpenAPI subset) for the same shape */
export const MATCHUP_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    linhas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          aspecto: { type: 'STRING', enum: [...MATCHUP_ASPECTS] },
          a: { type: 'STRING' },
          b: { type: 'STRING' },
        },
        required: ['aspecto', 'a', 'b'],
        propertyOrdering: ['aspecto', 'a', 'b'],
      },
    },
  },
  required: ['linhas'],
} as const;
