/**
 * API Route: GET /api/cron/pdl-snapshot
 * Called by Vercel Cron at 23:55 in Brasília (vercel.json) to store the day's
 * final PDL snapshot of every group player.
 * Protected by CRON_SECRET: Vercel sends it as "Authorization: Bearer <secret>".
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureDailySnapshots } from '@/src/services/profileService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await captureDailySnapshots();
  const status = result.failed.length === result.players ? 502 : 200;
  return NextResponse.json(result, { status });
}
