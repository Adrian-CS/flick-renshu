/** Comparación de una sesión con la anterior de la misma lección. */
import type { DrillMetrics } from './drill';

export interface Comparison {
  kpm: number;
  /** En puntos porcentuales. */
  accuracy: number;
  hints: number;
}

export function compareSessions(cur: DrillMetrics, prev: DrillMetrics | undefined): Comparison | null {
  if (!prev) return null;
  return {
    kpm: Math.round((cur.kpm - prev.kpm) * 10) / 10,
    accuracy: Math.round((cur.accuracy - prev.accuracy) * 1000) / 10,
    hints: cur.hints - prev.hints,
  };
}

/** "+3,2" / "−1" / "±0" */
export function formatDelta(n: number, unit = ''): string {
  const abs = Math.abs(n).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  if (n === 0) return `±0${unit}`;
  return `${n > 0 ? '+' : '−'}${abs}${unit}`;
}
