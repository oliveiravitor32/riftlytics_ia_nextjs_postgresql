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

const PHOTOS =
  'https://iezfoswxrvkmbbbtcnvz.supabase.co/storage/v1/object/public/fotos_de_perfil/';

const players: { gameName: string; tagLine: string; photo?: string }[] = [
  { gameName: 'FlyerCloud', tagLine: 'br1', photo: 'vitor.jpg' },
  { gameName: 'Neutro7', tagLine: 'BR1', photo: 'samuel.jpg' },
  { gameName: 'SAVYORI', tagLine: 'br1', photo: 'guilherme.jpg' },
  { gameName: 'PistolaCanoCurto', tagLine: 'BR2', photo: 'cleiton.jpg' },
  { gameName: 'Pistola Torta', tagLine: 'br1', photo: 'alemao.jpg' },
  { gameName: 'Viniez', tagLine: 'ROCK' },
  { gameName: 'Phelps', tagLine: '9388', photo: 'phelipe.jpg' },
];

async function main() {
  for (const { gameName, tagLine, photo } of players) {
    const avatarUrl = photo ? `${PHOTOS}${photo}` : null;
    await prisma.player.upsert({
      where: { gameName_tagLine: { gameName, tagLine } },
      update: { avatarUrl },
      create: {
        gameName,
        tagLine,
        region: 'br1',
        displayName: gameName,
        avatarUrl,
      },
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
