/**
 * API Route: GET /api/posts/[id]/match (Bearer token)
 * The full card of the match a Resenha message comments on, so the Resenha
 * can show it without leaving the page. Signed-in only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/src/lib/api-error';
import { requireUser } from '@/src/services/authService';
import { matchCardOf } from '@/src/services/resenhaService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request);
    return NextResponse.json(await matchCardOf((await params).id));
  } catch (error) {
    return errorResponse(error, 'Post match API');
  }
}
