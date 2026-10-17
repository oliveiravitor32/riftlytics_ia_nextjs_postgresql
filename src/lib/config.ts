/**
 * Application configuration read from environment variables.
 * Database URLs are read where used (src/lib/db.ts, prisma.config.ts).
 */

export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  logLevel: (process.env.LOG_LEVEL || 'debug') as
    | 'debug'
    | 'info'
    | 'warn'
    | 'error',
  riotApi: {
    apiKey: process.env.RIOT_API_KEY || '',
    // account-v1 and match-v5 regional routing (the group plays in BR)
    baseUrl: 'https://americas.api.riotgames.com',
  },
} as const;

export type Config = typeof config;
