/** Qué se ve escrito en cada tecla según el nivel de pistas. */
import { DIRECTIONS, KEY_LABEL, keyFan, type Direction, type KeyId } from './kana';

/** all: las 5 kana; row: solo la de la fila あ (la del toque); none: tecla sin etiqueta. */
export const HINT_LEVELS = ['all', 'row', 'none'] as const;
export type HintLevel = (typeof HINT_LEVELS)[number];

export const HINT_LEVEL_LABEL: Readonly<Record<HintLevel, string>> = {
  all: '5 kana',
  row: 'Solo あ',
  none: 'Sin etiqueta',
};

export interface KeyFace {
  /** Texto grande del centro ('' = nada). */
  center: string;
  /** Kana pequeñas alrededor (solo con nivel 'all'). */
  around: Partial<Record<Exclude<Direction, 'tap'>, string>>;
}

export function keyFace(key: KeyId, level: HintLevel): KeyFace {
  const fan = keyFan(key);
  const defined = DIRECTIONS.some((d) => fan[d] !== null);
  // las teclas aún sin mapa muestran siempre su etiqueta (no son parte del ejercicio)
  if (!defined) return { center: KEY_LABEL[key], around: {} };
  if (level === 'none') return { center: '', around: {} };
  const center = fan.tap ?? KEY_LABEL[key];
  if (level === 'row') return { center, around: {} };
  const around: KeyFace['around'] = {};
  for (const d of ['left', 'up', 'right', 'down'] as const) {
    const k = fan[d];
    if (k) around[d] = k;
  }
  return { center, around };
}
