/**
 * API Route: GET /api/me (Bearer = Supabase access token)
 * The signed-in account and whether it may post in the Resenha.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/src/lib/logger';
import { getErrorMessage, getErrorStatusCode } from '@/src/lib/errors';
import { canPost, getSessionUser } from '@/src/services/authService';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ user, canPost: await canPost(user.email) });
  } catch (error) {
    logger.error('Me API: Error', { error: getErrorMessage(error) });
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatusCode(error) }
    );
  }
}
