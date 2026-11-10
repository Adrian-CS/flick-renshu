/** Palabras de JMdict (public/data/words.json, generado por scripts/build-words.ts). */
import { strokesFor } from './kana';

/** [lectura en hiragana, formas con kanji separadas por ・ ('' si solo kana)] */
export type WordRow = [reading: string, kanji: string];

export interface WordsMeta {
  source: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  format: string;
  dictDate: string;
  count: number;
}

export interface WordsFile {
  meta: WordsMeta;
  words: WordRow[];
}

let cache: Promise<WordsFile> | null = null;

/** Carga (una vez) el fichero de palabras. */
export function loadWords(): Promise<WordsFile> {
  cache ??= fetch('/data/words.json').then((r) => {
    if (!r.ok) throw new Error(`words.json: HTTP ${r.status}`);
    return r.json() as Promise<WordsFile>;
  });
  cache.catch(() => (cache = null));
  return cache;
}

export function kanaLength(s: string): number {
  return Array.from(s).length;
}

/** ¿Se escribe solo con gestos directos (sin 小゛゜)? */
export function isPlainWord(reading: string): boolean {
  const s = strokesFor(reading);
  return s !== null && s.every((x) => x.key !== 'mod');
}
