/**
 * Estadística por gesto (tecla + dirección) y repetición ponderada: los gestos débiles
 * salen más. Adaptado de Teclear (HangulTraining), con gestos en lugar de jamo.
 */
import { strokeId, strokesFor } from './kana';
import type { HintLevel } from './hints';

export interface StrokeStat {
  /** strokeId: "ka:up", "mod:tap"… */
  id: string;
  attempts: number;
  /** Intentos en los que hubo al menos un fallo antes de acertar. */
  errors: number;
  /** Intentos en los que apareció la pista. */
  hints: number;
  /** Tiempo medio hasta acertar, en ms. */
  avgMs: number;
  updatedAt: number;
}

export type StatsMap = ReadonlyMap<string, StrokeStat>;

/** Peso de un gesto nunca practicado: más que uno dominado, para que se introduzca. */
const UNSEEN = 3;
/** Por debajo de este tiempo medio un gesto no se considera lento. */
const FAST_MS = 700;
/** Intentos a partir de los cuales ya no se considera nuevo. */
const CONFIDENT_ATTEMPTS = 10;

/** Cuánto necesita práctica un gesto. 1 = dominado; crece con fallos, pistas y lentitud. */
export function strokeWeight(stat: StrokeStat | undefined): number {
  if (!stat || stat.attempts === 0) return UNSEEN;
  const errorRate = stat.errors / stat.attempts;
  const hintRate = stat.hints / stat.attempts;
  const slowness = Math.min(Math.max((stat.avgMs - FAST_MS) / 800, 0), 2);
  const novelty = stat.attempts < CONFIDENT_ATTEMPTS ? (CONFIDENT_ATTEMPTS - stat.attempts) / CONFIDENT_ATTEMPTS : 0;
  return 1 + 6 * errorRate + 3 * hintRate + slowness + novelty;
}

/** Peso de un elemento (kana, palabra…): media de los pesos de sus gestos. */
export function itemWeight(item: string, stats: StatsMap): number {
  const strokes = strokesFor(item);
  if (!strokes || strokes.length === 0) return 1;
  let sum = 0;
  for (const s of strokes) sum += strokeWeight(stats.get(strokeId(s)));
  return sum / strokes.length;
}

export interface PickOptions {
  stats: StatsMap;
  /** Elementos con peso extra (lo nuevo de la lección). */
  focus?: ReadonlySet<string>;
  /** Elemento que evitar (normalmente el anterior). */
  avoid?: string;
  random?: () => number;
}

const FOCUS_BOOST = 2;

/** Elige un elemento con probabilidad proporcional a su peso. */
export function pickWeighted(items: readonly string[], opts: PickOptions): string {
  if (items.length === 0) throw new Error('pickWeighted: sin elementos');
  const random = opts.random ?? Math.random;
  const candidates = items.length > 1 && opts.avoid !== undefined ? items.filter((i) => i !== opts.avoid) : items;
  const weights = candidates.map((i) => itemWeight(i, opts.stats) * (opts.focus?.has(i) ? FOCUS_BOOST : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]!;
    if (r < 0) return candidates[i]!;
  }
  return candidates[candidates.length - 1]!;
}

/** Los gestos más débiles, el peor primero (solo los que tienen al menos `minAttempts`). */
export function weakestStrokes(stats: StatsMap | readonly StrokeStat[], limit = 5, minAttempts = 3): StrokeStat[] {
  const list = Array.isArray(stats) ? stats : [...(stats as StatsMap).values()];
  return list
    .filter((s) => s.attempts >= minAttempts && strokeWeight(s) > 1.3)
    .sort((a, b) => strokeWeight(b) - strokeWeight(a))
    .slice(0, limit);
}

/** Gestos con fallos o pistas en una sesión, los peores primero. */
export function troubleStrokes(deltas: readonly StrokeStat[], limit = 5): StrokeStat[] {
  const score = (s: StrokeStat) => (2 * s.errors + s.hints) / Math.max(s.attempts, 1);
  return deltas
    .filter((s) => s.errors + s.hints > 0)
    .sort((a, b) => score(b) - score(a) || b.errors - a.errors)
    .slice(0, limit);
}

/** Suma los resultados de una sesión a los totales guardados. */
export function mergeStat(prev: StrokeStat | undefined, delta: StrokeStat): StrokeStat {
  if (!prev) return { ...delta };
  const attempts = prev.attempts + delta.attempts;
  const avgMs = attempts === 0 ? 0 : (prev.avgMs * prev.attempts + delta.avgMs * delta.attempts) / attempts;
  return {
    id: prev.id,
    attempts,
    errors: prev.errors + delta.errors,
    hints: prev.hints + delta.hints,
    avgMs,
    updatedAt: Math.max(prev.updatedAt, delta.updatedAt),
  };
}

/** Dominio de un conjunto de gestos, 0–1: media de 1/peso (1 = todos dominados). */
export function mastery(strokeIds: readonly string[], stats: StatsMap): number {
  if (strokeIds.length === 0) return 0;
  const sum = strokeIds.reduce((a, id) => a + (stats.get(id) ? 1 / strokeWeight(stats.get(id)) : 0), 0);
  return sum / strokeIds.length;
}

/**
 * Pistas graduales: 5 kana mientras algún gesto de la lección sea nuevo o débil,
 * solo あ cuando van bien, sin etiqueta cuando están todos dominados.
 */
export function autoHintLevel(strokeIds: readonly string[], stats: StatsMap): HintLevel {
  if (strokeIds.length === 0) return 'all';
  const weights = strokeIds.map((id) => strokeWeight(stats.get(id)));
  const minAttempts = Math.min(...strokeIds.map((id) => stats.get(id)?.attempts ?? 0));
  const worst = Math.max(...weights);
  if (minAttempts >= 15 && worst <= 1.6) return 'none';
  if (minAttempts >= 5 && worst <= 2.5) return 'row';
  return 'all';
}
