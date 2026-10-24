/**
 * API Route: POST /api/posts/[id]/reactions { emoji } (Bearer token)
 * Toggles the caller's reaction on a Resenha message (allowlist only) and
 * answers the message's reactions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/src/lib/api-error';
import { reactionSchema } from '@/src/lib/resenha';
import { requirePoster } from '@/src/services/authService';
import { toggleReaction } from '@/src/services/resenhaService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const viewer = await requirePoster(request);
    const parsed = reactionSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      return NextResponse.json({ error: 'Reação inválida' }, { status: 400 });
    }
    return NextResponse.json(
      await toggleReaction(viewer, (await params).id, parsed.data.emoji)
    );
  } catch (error) {
    return errorResponse(error, 'Reactions API');
  }
}
