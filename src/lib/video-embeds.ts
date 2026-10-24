/**
 * Video links in a Resenha message → players embedded under it. Only known
 * hosts, rebuilt from the id we parsed (never the pasted URL), so a message
 * can't embed an arbitrary page:
 *  - YouTube (watch, youtu.be, shorts, with ?t=): youtube-nocookie.com,
 *    which sets no tracking cookie until the video plays
 *  - Medal: medal.tv/clip/<id>/<share code> (https://docs.medal.tv/player)
 *  - Streamable: streamable.com/e/<id>
 */

export type VideoProvider = 'youtube' | 'medal' | 'streamable';

export interface VideoEmbed {
  provider: VideoProvider;
  /** iframe src */
  embedUrl: string;
  /** The link as pasted, for "open in a new tab" */
  url: string;
}

/** At most this many players per message (the rest stay as links) */
export const MAX_EMBEDS = 2;

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

/** Message text → plain text and link pieces, for rendering clickable links */
export function splitLinks(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    // A link at the end of a sentence: keep the punctuation out of it
    const href = match[0].replace(/[.,!?;:)]+$/, '');
    const start = match.index;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: href, href });
    last = start + href.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** "1m30s", "90s" or "90" → seconds */
function seconds(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || !m[0]) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

const YOUTUBE_ID = /^[\w-]{11}$/;
const MEDAL_ID = /^[\w-]+$/;
const STREAMABLE_ID = /^[a-z0-9]+$/i;

function embedFor(raw: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, '');
  const path = url.pathname.split('/').filter(Boolean);

  if (host === 'youtube.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be'
        ? path[0]
        : path[0] === 'watch'
          ? url.searchParams.get('v')
          : path[0] === 'shorts' || path[0] === 'live'
            ? path[1]
            : null;
    if (!id || !YOUTUBE_ID.test(id)) return null;
    const start = seconds(url.searchParams.get('t'));
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`,
      url: raw,
    };
  }

  if (host === 'medal.tv') {
    // medal.tv/clip/<id>/<code> or medal.tv/games/<game>/clips/<id>/<code>
    const at = path.findIndex((p) => p === 'clip' || p === 'clips');
    const [id, code] = at >= 0 ? path.slice(at + 1, at + 3) : [];
    if (!id || !MEDAL_ID.test(id) || (code && !MEDAL_ID.test(code))) {
      return null;
    }
    return {
      provider: 'medal',
      embedUrl: `https://medal.tv/clip/${id}${code ? `/${code}` : ''}?autoplay=0&muted=0&loop=0`,
      url: raw,
    };
  }

  if (host === 'streamable.com') {
    const id = path[0] === 'e' ? path[1] : path[0];
    if (!id || !STREAMABLE_ID.test(id)) return null;
    return {
      provider: 'streamable',
      embedUrl: `https://streamable.com/e/${id}`,
      url: raw,
    };
  }

  return null;
}

/** The message's video links that can be embedded, in order, no repeats */
export function videoEmbeds(text: string): VideoEmbed[] {
  const found: VideoEmbed[] = [];
  for (const part of splitLinks(text)) {
    const embed = part.href ? embedFor(part.href) : null;
    if (embed && !found.some((e) => e.embedUrl === embed.embedUrl)) {
      found.push(embed);
    }
  }
  return found.slice(0, MAX_EMBEDS);
}
