/**
 * API Route: GET /api/resumo?dia=YYYY-MM-DD
 * Text of the daily WhatsApp summary (null when the day had nothing to tell),
 * for the bot on GitHub Actions (bot/send.mjs). Defaults to today in Brasília.
 * Protected by CRON_SECRET ("Authorization: Bearer <secret>").
 */

import { NextRequest, NextResponse } from 'next/server';
import { collectDaySummary } from '@/src/services/dailySummaryService';
import { gameDay } from '@/src/services/snapshotService';
import { buildSummaryText } from '@/src/lib/daily-summary';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dia = request.nextUrl.searchParams.get('dia');
  if (dia && !/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    return NextResponse.json(
      { error: 'dia deve ser AAAA-MM-DD' },
      { status: 400 }
    );
  }
  const day = dia ? new Date(`${dia}T00:00:00Z`) : gameDay();

  const summary = await collectDaySummary(day);
  return NextResponse.json({ text: buildSummaryText(summary) });
}
