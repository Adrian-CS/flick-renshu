/**
 * Teclado フリック de 12 teclas (iOS «かな» / Gboard 12キー).
 *
 * Solo las teclas «normales» tienen mapa por ahora. や, わ, 小゛゜ y 、。?! están en la
 * disposición pero sin kana hasta confirmar su comportamiento con capturas del iPhone.
 */

export const DIRECTIONS = ['tap', 'left', 'up', 'right', 'down'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const KEY_IDS = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'mod', 'wa', 'punct'] as const;
export type KeyId = (typeof KEY_IDS)[number];

/** Disposición en pantalla: 4 filas × 3 columnas. */
export const KEY_LAYOUT: readonly (readonly KeyId[])[] = [
  ['a', 'ka', 'sa'],
  ['ta', 'na', 'ha'],
  ['ma', 'ya', 'ra'],
  ['mod', 'wa', 'punct'],
];

/** Etiqueta de cada tecla (lo que se ve en la tecla del teclado real). */
export const KEY_LABEL: Readonly<Record<KeyId, string>> = {
  a: 'あ', ka: 'か', sa: 'さ', ta: 'た', na: 'な', ha: 'は', ma: 'ま', ya: 'や', ra: 'ら',
  mod: '小゛゜', wa: 'わ', punct: '、。?!',
};

/** Las 5 kana de una tecla, en orden de DIRECTIONS: toque, izquierda, arriba, derecha, abajo. */
type Fan = readonly [tap: string, left: string, up: string, right: string, down: string];

/** Teclas cuyo abanico es la fila del silabario completa (あいうえお). */
export const BASIC_KEYS = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ra'] as const;
export type BasicKeyId = (typeof BASIC_KEYS)[number];

const BASIC_FANS: Readonly<Record<BasicKeyId, Fan>> = {
  a: ['あ', 'い', 'う', 'え', 'お'],
  ka: ['か', 'き', 'く', 'け', 'こ'],
  sa: ['さ', 'し', 'す', 'せ', 'そ'],
  ta: ['た', 'ち', 'つ', 'て', 'と'],
  na: ['な', 'に', 'ぬ', 'ね', 'の'],
  ha: ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ma: ['ま', 'み', 'む', 'め', 'も'],
  ra: ['ら', 'り', 'る', 'れ', 'ろ'],
};

export function isBasicKey(key: KeyId): key is BasicKeyId {
  return (BASIC_KEYS as readonly string[]).includes(key);
}

/** Lo que escribe la tecla `key` con el gesto `dir`, o null si no está definido (aún). */
export function flickKana(key: KeyId, dir: Direction): string | null {
  if (!isBasicKey(key)) return null;
  return BASIC_FANS[key][DIRECTIONS.indexOf(dir)] ?? null;
}

/** Abanico completo de una tecla (null en las posiciones sin definir). */
export function keyFan(key: KeyId): Readonly<Record<Direction, string | null>> {
  return Object.fromEntries(DIRECTIONS.map((d) => [d, flickKana(key, d)])) as Record<Direction, string | null>;
}

/** Un gesto: una tecla y una dirección. */
export interface Stroke {
  key: KeyId;
  dir: Direction;
}

export function strokeId(s: Stroke): string {
  return `${s.key}:${s.dir}`;
}

const STROKE_OF = new Map<string, Stroke>();
for (const key of BASIC_KEYS) {
  for (const dir of DIRECTIONS) STROKE_OF.set(BASIC_FANS[key][DIRECTIONS.indexOf(dir)]!, { key, dir });
}

/** Gesto que escribe la kana, o null si no se escribe con un único gesto de una tecla básica. */
export function strokeFor(kana: string): Stroke | null {
  return STROKE_OF.get(kana) ?? null;
}

/** Todos los gestos definidos (tecla × dirección) con su kana. */
export function allStrokes(): (Stroke & { kana: string })[] {
  return BASIC_KEYS.flatMap((key) => DIRECTIONS.map((dir) => ({ key, dir, kana: flickKana(key, dir)! })));
}

/**
 * Secuencia de gestos para escribir un texto en hiragana, o null si contiene algo
 * que aún no se sabe escribir (dakuten, pequeñas, や/わ, puntuación…).
 */
export function strokesFor(text: string): Stroke[] | null {
  const out: Stroke[] = [];
  for (const ch of Array.from(text)) {
    const s = strokeFor(ch);
    if (!s) return null;
    out.push(s);
  }
  return out;
}
