import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma CLI doesn't read .env.local on its own
config({ path: '.env.local', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Migrations need a direct (session) connection, not the transaction pooler
  // `generate` (postinstall/CI) runs without it; migrate fails clearly if empty
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
});
