/**
 * «Mis textos»: textos que pega el usuario (letras de canciones, lo que quiera) para
 * escribirlos línea a línea. Se guardan solo en el dispositivo (IndexedDB); nunca en el repo.
 */
import { normalizeKana, strokesFor } from './kana';

export interface TextRecord {
  id?: number;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  /** Inicio de cada línea en la canción (ms), si está sincronizado. */
  timings?: number[];
  /** Vídeo de YouTube con la canción. */
  youtubeId?: string;
  /** Dónde empieza la canción en el vídeo (ms), p. ej. tras la intro de un videoclip. */
  youtubeStartMs?: number;
}

/** Audio de un texto (solo en el dispositivo). */
export interface TextAudio {
  /** id del texto */
  id: number;
  name: string;
  type: string;
  data: ArrayBuffer;
}

/** Líneas no vacías, sin espacios a los lados. */
export function textLines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** La línea para el teclado virtual (hiragana sin espacios), o null si no se puede escribir con él. */
export function virtualLine(line: string): string | null {
  const s = normalizeKana(line).replace(/\s+/g, '');
  return s && strokesFor(s) ? s : null;
}

/** El teclado virtual solo sirve si todas las líneas están en kana escribible. */
export function canUseVirtual(lines: readonly string[]): boolean {
  return lines.length > 0 && lines.every((l) => virtualLine(l) !== null);
}

/** ¿Parece romaji / teclado inglés? (letras latinas en lo escrito) */
export function looksLikeRomaji(value: string): boolean {
  return /[a-zA-Z]/.test(value);
}
