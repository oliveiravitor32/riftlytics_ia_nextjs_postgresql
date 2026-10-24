/**
 * API Route: DELETE /api/posts/[id] (Bearer = Supabase access token)
 * Removes a Resenha message: its author or an admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/src/services/authService';
import { deletePost } from '@/src/services/resenhaService';
import { errorResponse } from '@/src/lib/api-error';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const viewer = await requireUser(request);
    await deletePost(viewer, (await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, 'Posts API');
  }
}
