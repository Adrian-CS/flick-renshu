import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = join(import.meta.dirname, '..', '..', 'public');

describe('PWA manifest', () => {
  const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8')) as {
    start_url: string;
    display: string;
    icons: { src: string }[];
  };

  it('es instalable como app independiente', () => {
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('todos los iconos existen', () => {
    for (const icon of manifest.icons) expect(existsSync(join(PUBLIC, icon.src))).toBe(true);
  });
});
