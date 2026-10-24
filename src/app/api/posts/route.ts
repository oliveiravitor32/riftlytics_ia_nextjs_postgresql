/**
 * API Route: /api/posts (Bearer = Supabase access token)
 *   GET  ?before=<post id>  Resenha page, newest first (signed-in only)
 *   POST { text, replyToId? } New message (allowlist only, 10 a minute)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/src/lib/redis';
import { RateLimitError } from '@/src/lib/errors';
import { errorResponse } from '@/src/lib/api-error';
import { POSTS_PER_MINUTE, newPostSchema } from '@/src/lib/resenha';
import { requirePoster, requireUser } from '@/src/services/authService';
import { createPost, listPosts } from '@/src/services/resenhaService';

const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(POSTS_PER_MINUTE, '1 m'),
  prefix: `${process.env.CACHE_PREFIX ?? 'riftlytics:'}posts-limit`,
});

export async function GET(request: NextRequest) {
  try {
    const viewer = await requireUser(request);
    const before = request.nextUrl.searchParams.get('before');
    return NextResponse.json(await listPosts(viewer, before));
  } catch (error) {
    return errorResponse(error, 'Posts API');
  }
}

export async function POST(request: NextRequest) {
  try {
    const author = await requirePoster(request);
    const parsed = newPostSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Mensagem inválida' },
        { status: 400 }
      );
    }

    const { success, reset } = await limiter.limit(author.id);
    if (!success) {
      throw new RateLimitError(
        Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      );
    }

    return NextResponse.json(
      await createPost(author, parsed.data.text, parsed.data.replyToId),
      {
        status: 201,
      }
    );
  } catch (error) {
    return errorResponse(error, 'Posts API');
  }
}
