/**
 * Seeds the initial players (the former hardcoded preset list).
 * Idempotent: re-running updates instead of duplicating.
 * Run: npx prisma db seed
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: '.env.local', quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

const players = [
  { gameName: 'FlyerCloud', tagLine: 'br1' },
  { gameName: 'Neutro7', tagLine: 'BR1' },
  { gameName: 'SAVYORI', tagLine: 'br1' },
  { gameName: 'PistolaCanoCurto', tagLine: 'BR2' },
  { gameName: 'Pistola Torta', tagLine: 'br1' },
];

async function main() {
  for (const p of players) {
    await prisma.player.upsert({
      where: { gameName_tagLine: p },
      update: {},
      create: { ...p, region: 'br1', displayName: p.gameName },
    });
  }
  console.log(`Seed: ${players.length} jogadores cadastrados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
