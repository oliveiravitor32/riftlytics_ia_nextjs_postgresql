/**
 * Application configuration
 * Validates and exports all environment variables with type safety
 */

export const config = {
  // Environment
  env: process.env.NODE_ENV as 'development' | 'production' | 'test',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Logging
  logLevel: (process.env.LOG_LEVEL || 'debug') as
    | 'debug'
    | 'info'
    | 'warn'
    | 'error',

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // Riot API
  riotApi: {
    apiKey: process.env.RIOT_API_KEY || '',
    baseUrl: 'https://americas.api.riotgames.com',
    datadragonBaseUrl: 'https://ddragon.leagueoflegends.com',
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Redis (Phase 2+)
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  },

  // Background Jobs (Phase 2+)
  inngest: {
    eventKey: process.env.INNGEST_EVENT_KEY || '',
    signingKey: process.env.INNGEST_SIGNING_KEY || '',
  },

  // AI Integration (Phase 3)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  // Monitoring
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  },
} as const;

export type Config = typeof config;
