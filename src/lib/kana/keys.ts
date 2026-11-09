/**
 * Teclado フリック de 12 teclas (iOS «かな», con フリックのみ).
 * Comportamiento de や, わ, 、。?! y 小゛゜ comprobado en el iPhone del usuario (nov. 2026).
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

/** Teclas con abanico (todas menos 小゛゜, que modifica la kana anterior). */
export const FAN_KEYS = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'punct'] as const;
export type FanKeyId = (typeof FAN_KEYS)[number];

/** Teclas cuyo abanico es una fila completa del silabario (あいうえお). */
export const BASIC_KEYS = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ra'] as const;
export type BasicKeyId = (typeof BASIC_KEYS)[number];

/** La tecla 小゛゜: sin abanico; solo actúa al tocarla (deslizar no hace nada). */
export const MOD_KEY = 'mod' satisfies KeyId;

/** Abanico en orden de DIRECTIONS: toque, izquierda, arriba, derecha, abajo (null = nada). */
type Fan = readonly [tap: string, left: string | null, up: string | null, right: string | null, down: string | null];

const FANS: Readonly<Record<FanKeyId, Fan>> = {
  a: ['あ', 'い', 'う', 'え', 'お'],
  ka: ['か', 'き', 'く', 'け', 'こ'],
  sa: ['さ', 'し', 'す', 'せ', 'そ'],
  ta: ['た', 'ち', 'つ', 'て', 'と'],
  na: ['な', 'に', 'ぬ', 'ね', 'の'],
  ha: ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ma: ['ま', 'み', 'む', 'め', 'も'],
  ya: ['や', '「', 'ゆ', '」', 'よ'],
  ra: ['ら', 'り', 'る', 'れ', 'ろ'],
  wa: ['わ', 'を', 'ん', 'ー', null],
  punct: ['、', '。', '？', '！', null],
};

export function isFanKey(key: KeyId): key is FanKeyId {
  return key !== MOD_KEY;
}

export function isBasicKey(key: KeyId): key is BasicKeyId {
  return (BASIC_KEYS as readonly string[]).includes(key);
}

/** Lo que escribe la tecla `key` con el gesto `dir`, o null si no escribe nada (o es 小゛゜). */
export function flickKana(key: KeyId, dir: Direction): string | null {
  if (!isFanKey(key)) return null;
  return FANS[key][DIRECTIONS.indexOf(dir)] ?? null;
}

/** Abanico completo de una tecla (null en las posiciones vacías). */
export function keyFan(key: KeyId): Readonly<Record<Direction, string | null>> {
  return Object.fromEntries(DIRECTIONS.map((d) => [d, flickKana(key, d)])) as Record<Direction, string | null>;
}

/** Un gesto: una tecla y una dirección. Para 小゛゜ la dirección es siempre 'tap'. */
export interface Stroke {
  key: KeyId;
  dir: Direction;
}

export const MOD_STROKE: Stroke = { key: MOD_KEY, dir: 'tap' };

export function strokeId(s: Stroke): string {
  return `${s.key}:${s.dir}`;
}

/** Todos los gestos que escriben algo (tecla × dirección) con su resultado. */
export function allStrokes(): (Stroke & { kana: string })[] {
  return FAN_KEYS.flatMap((key) =>
    DIRECTIONS.flatMap((dir) => {
      const kana = flickKana(key, dir);
      return kana ? [{ key, dir, kana }] : [];
    }),
  );
}

const STROKE_OF = new Map<string, Stroke>(allStrokes().map(({ key, dir, kana }) => [kana, { key, dir }]));

/** Gesto único que escribe la kana, o null si hace falta 小゛゜ o no se puede escribir. */
export function strokeFor(kana: string): Stroke | null {
  return STROKE_OF.get(kana) ?? null;
}
