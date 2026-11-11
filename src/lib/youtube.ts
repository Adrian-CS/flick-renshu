/** Enlaces de YouTube para el karaoke (adaptado de HangulTraining): un texto guarda solo el id. */

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Id del vídeo a partir de un enlace de YouTube / YouTube Music o del id suelto:
 * youtube.com/watch?v=…, music.youtube.com/watch?v=…, youtu.be/…, /shorts/…, /embed/…, /live/….
 */
export function parseYoutubeId(input: string): string | null {
  const s = input.trim();
  if (ID.test(s)) return s;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v');
    const m = /^\/(?:shorts|embed|live|v)\/([^/]+)/.exec(url.pathname);
    if (!id && m) id = m[1]!;
  }
  return id && ID.test(id) ? id : null;
}

/** Inicio en un enlace compartido (?t=42, ?t=1m5s, &start=42), en ms, o null. */
export function parseYoutubeStart(link: string): number | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`);
  } catch {
    return null;
  }
  const t = url.searchParams.get('t') ?? url.searchParams.get('start');
  if (!t) return null;
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t);
  if (!m) return null;
  const ms = (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) * 1000;
  return ms > 0 ? ms : null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
