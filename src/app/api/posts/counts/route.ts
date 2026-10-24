/**
 * API Route: GET /api/posts/counts?ids=<match id>,<match id> (Bearer token)
 * How many Resenha messages comment each match, for the cards' counters.
 * Signed-in only, like the Resenha itself.
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/src/lib/api-error';
import { MAX_COUNT_IDS } from '@/src/lib/resenha';
import { requireUser } from '@/src/services/authService';
import { countByMatch } from '@/src/services/resenhaService';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const ids = (request.nextUrl.searchParams.get('ids') ?? '')
      .split(',')
      .filter(Boolean);
    if (ids.length === 0 || ids.length > MAX_COUNT_IDS) {
      return NextResponse.json(
        { error: `Informe de 1 a ${MAX_COUNT_IDS} partidas` },
        { status: 400 }
      );
    }
    return NextResponse.json(await countByMatch(ids));
  } catch (error) {
    return errorResponse(error, 'Post counts API');
  }
}
