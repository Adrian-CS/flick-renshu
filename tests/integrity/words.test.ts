import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { strokesFor } from '@/lib/kana';
import { PHRASES } from '@/data/phrases';
import type { WordsFile } from '@/lib/words';

const file = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'public', 'data', 'words.json'), 'utf8')) as WordsFile;

describe('public/data/words.json', () => {
  it('lleva la atribución y la licencia de JMdict', () => {
    expect(file.meta.source).toMatch(/JMdict/);
    expect(file.meta.license).toBe('CC BY-SA 4.0');
    expect(file.meta.count).toBe(file.words.length);
  });

  it('un número razonable de palabras', () => {
    expect(file.words.length).toBeGreaterThan(5000);
    expect(file.words.length).toBeLessThan(30000);
  });

  it('todas las lecturas se escriben con el teclado, 2–8 kana, sin repetir', () => {
    const seen = new Set<string>();
    for (const [r, k] of file.words) {
      expect(strokesFor(r), r).not.toBeNull();
      expect(Array.from(r).length).toBeGreaterThanOrEqual(2);
      expect(Array.from(r).length).toBeLessThanOrEqual(8);
      expect(seen.has(r), r).toBe(false);
      expect(typeof k).toBe('string');
      seen.add(r);
    }
  });

  it('contiene palabras básicas', () => {
    const readings = new Set(file.words.map(([r]) => r));
    for (const w of ['がっこう', 'でんしゃ', 'さくら', 'ねこ', 'きょう']) expect(readings.has(w), w).toBe(true);
  });
});

describe('frases', () => {
  it('todas se escriben con el teclado', () => {
    for (const p of PHRASES) expect(strokesFor(p.kana), p.kana).not.toBeNull();
  });
  it('sin repetir', () => {
    expect(new Set(PHRASES.map((p) => p.kana)).size).toBe(PHRASES.length);
  });
});
