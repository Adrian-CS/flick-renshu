import { describe, expect, it } from 'vitest';
import { parseYoutubeId, parseYoutubeStart } from '@/lib/youtube';

describe('parseYoutubeId', () => {
  it('formatos de enlace', () => {
    const id = 'dQw4w9WgXcQ';
    for (const s of [
      id,
      `https://www.youtube.com/watch?v=${id}`,
      `https://music.youtube.com/watch?v=${id}&list=x`,
      `youtu.be/${id}?si=abc`,
      `https://m.youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/live/${id}`,
    ]) {
      expect(parseYoutubeId(s), s).toBe(id);
    }
  });
  it('lo que no es un vídeo', () => {
    for (const s of ['', 'hola', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=corto']) {
      expect(parseYoutubeId(s), s).toBeNull();
    }
  });
});

describe('parseYoutubeStart', () => {
  it('segundos y formato h/m/s', () => {
    expect(parseYoutubeStart('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe(42000);
    expect(parseYoutubeStart('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s')).toBe(65000);
    expect(parseYoutubeStart('https://www.youtube.com/embed/dQw4w9WgXcQ?start=7')).toBe(7000);
  });
  it('sin inicio', () => {
    expect(parseYoutubeStart('https://youtu.be/dQw4w9WgXcQ')).toBeNull();
    expect(parseYoutubeStart('https://youtu.be/dQw4w9WgXcQ?t=0')).toBeNull();
    expect(parseYoutubeStart('no es url ::')).toBeNull();
  });
});
