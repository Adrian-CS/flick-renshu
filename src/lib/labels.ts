/** Textos para mostrar gestos. */
import { DIRECTIONS, KEY_IDS, KEY_LABEL, MOD_KEY, flickKana, type Direction, type KeyId } from './kana';

export const ARROW: Readonly<Record<Direction, string>> = { tap: 'toque', left: '←', up: '↑', right: '→', down: '↓' };

/** "ka:up" → { key: 'ka', dir: 'up' } (o null si no es válido). */
export function parseStrokeId(id: string): { key: KeyId; dir: Direction } | null {
  const [key, dir] = id.split(':');
  if (!(KEY_IDS as readonly string[]).includes(key!) || !(DIRECTIONS as readonly string[]).includes(dir!)) return null;
  return { key: key as KeyId, dir: dir as Direction };
}

/** "ka:up" → "か ↑ = く"; "mod:tap" → "小゛゜". */
export function strokeLabel(id: string): string {
  const s = parseStrokeId(id);
  if (!s) return id;
  if (s.key === MOD_KEY) return KEY_LABEL[MOD_KEY];
  const kana = flickKana(s.key, s.dir) ?? '';
  return s.dir === 'tap' ? `${KEY_LABEL[s.key]} toque` : `${KEY_LABEL[s.key]} ${ARROW[s.dir]} = ${kana}`;
}
