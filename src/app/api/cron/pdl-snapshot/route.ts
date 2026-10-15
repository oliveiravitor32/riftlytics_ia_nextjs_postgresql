/**
 * API Route: GET /api/cron/pdl-snapshot
 * Called once a day by Vercel Cron (see vercel.json) to store PDL snapshots.
 * Protected by CRON_SECRET: Vercel sends it as "Authorization: Bearer <secret>".
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureDailySnapshots } from '@/src/services/snapshotService';

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
