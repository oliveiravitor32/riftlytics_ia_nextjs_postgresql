/**
 * API Route: GET /api/cron/fechamento
 * Daily close, called by Vercel Cron at the end of the day in Brasília
 * (vercel.json): the final PDL snapshot and the new matches of every group
 * player. Also used locally for the first load of matches
 * (npm run fechamento).
 * Protected by CRON_SECRET: Vercel sends it as "Authorization: Bearer <secret>".
 */

import { NextRequest, NextResponse } from 'next/server';
import { closeDay, playersFullyFailed } from '@/src/services/dailyCloseService';

export const dynamic = 'force-dynamic';
// New matches of a day take a few Riot windows to fetch
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await closeDay();
  const status = playersFullyFailed(result) === result.players ? 502 : 200;
  return NextResponse.json(result, { status });
}
