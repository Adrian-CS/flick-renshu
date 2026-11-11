/** Datos de la página de progreso: mapa de calor por gesto y evolución por sesión. */
import { DIRECTIONS, FAN_KEYS, KEY_LABEL, MOD_KEY, flickKana, strokeId, type Direction, type KeyId } from './kana';
import { GROUP_LABEL, PHASE_LABEL, getLesson, type PhaseId } from './lessons';
import type { StatsMap } from './stats';
import type { SessionRecord } from './db';

export type HeatMetric = 'errors' | 'hints' | 'time';

export const HEAT_METRIC_LABEL: Readonly<Record<HeatMetric, string>> = {
  errors: 'Fallos',
  hints: 'Pistas',
  time: 'Tiempo',
};

/** Intentos mínimos para colorear una celda (con menos, el dato no dice nada). */
export const MIN_ATTEMPTS = 3;

/** Límites de cada nivel 0–4 (el valor ≤ límite → ese nivel; por encima del último → 4). */
const THRESHOLDS: Readonly<Record<HeatMetric, readonly number[]>> = {
  errors: [0.02, 0.05, 0.1, 0.2], // proporción de intentos con fallo
  hints: [0.02, 0.05, 0.1, 0.2],
  time: [600, 800, 1100, 1500], // ms de media
};

export function heatLevel(metric: HeatMetric, value: number): 0 | 1 | 2 | 3 | 4 {
  const t = THRESHOLDS[metric];
  const i = t.findIndex((limit) => value <= limit);
  return (i < 0 ? 4 : i) as 0 | 1 | 2 | 3 | 4;
}

export interface HeatCell {
  id: string;
  key: KeyId;
  dir: Direction;
  /** Lo que escribe el gesto ('小゛゜' para la tecla de modificar). */
  label: string;
  attempts: number;
  errors: number;
  hints: number;
  avgMs: number;
  /** Valor de la métrica (proporción o ms), null si no hay intentos suficientes. */
  value: number | null;
  level: 0 | 1 | 2 | 3 | 4 | null;
}

function metricValue(metric: HeatMetric, s: { attempts: number; errors: number; hints: number; avgMs: number }): number {
  if (metric === 'time') return s.avgMs;
  return (metric === 'errors' ? s.errors : s.hints) / s.attempts;
}

/** Una celda por gesto de cada tecla con abanico, más 小゛゜. */
export function heatCells(stats: StatsMap, metric: HeatMetric): HeatCell[] {
  const strokes: { key: KeyId; dir: Direction; label: string }[] = [
    ...FAN_KEYS.flatMap((key) =>
      DIRECTIONS.flatMap((dir) => {
        const k = flickKana(key, dir);
        return k ? [{ key: key as KeyId, dir, label: k }] : [];
      }),
    ),
    { key: MOD_KEY, dir: 'tap', label: KEY_LABEL[MOD_KEY] },
  ];
  return strokes.map(({ key, dir, label }) => {
    const id = strokeId({ key, dir });
    const s = stats.get(id);
    const attempts = s?.attempts ?? 0;
    const enough = s !== undefined && attempts >= MIN_ATTEMPTS;
    const value = enough ? metricValue(metric, s) : null;
    return {
      id,
      key,
      dir,
      label,
      attempts,
      errors: s?.errors ?? 0,
      hints: s?.hints ?? 0,
      avgMs: s?.avgMs ?? 0,
      value,
      level: value === null ? null : heatLevel(metric, value),
    };
  });
}

/** "row-ka/mix" → "か 行 · Mezcla"; "sys:…" → "… · sistema"; "text:3" → "Mis textos". */
export function sessionLabel(lessonKey: string): string {
  const system = lessonKey.startsWith('sys:');
  const key = system ? lessonKey.slice(4) : lessonKey;
  let label: string;
  if (key.startsWith('text:')) label = 'Mis textos';
  else {
    const [id, phase] = key.split('/');
    const lesson = getLesson(id ?? '');
    label = lesson ? `${lesson.title}${lesson.phases.length > 1 && phase ? ` · ${PHASE_LABEL[phase as PhaseId] ?? phase}` : ''}` : key;
  }
  return system ? `${label} · sistema` : label;
}

/** Grupo de la sesión para filtrar (1–4, o 'texts'). */
export function sessionGroup(lessonKey: string): string {
  const key = lessonKey.replace(/^sys:/, '');
  if (key.startsWith('text:')) return 'texts';
  return String(getLesson(key.split('/')[0] ?? '')?.group ?? '');
}

export const SESSION_GROUP_LABEL: Readonly<Record<string, string>> = {
  ...Object.fromEntries(Object.entries(GROUP_LABEL).map(([k, v]) => [k, v])),
  texts: 'Mis textos',
};

export type KeyboardFilter = 'virtual' | 'system';

export function isSystemSession(s: SessionRecord): boolean {
  return s.lessonKey.startsWith('sys:');
}

export interface SeriesPoint {
  startedAt: number;
  kpm: number;
  accuracy: number;
  kana: number;
  label: string;
}

/** Sesiones de un teclado (y opcionalmente un grupo), de la más antigua a la más reciente. */
export function kpmSeries(sessions: readonly SessionRecord[], keyboard: KeyboardFilter, group?: string, limit?: number): SeriesPoint[] {
  const points = sessions
    .filter((s) => isSystemSession(s) === (keyboard === 'system') && s.kana > 0)
    .filter((s) => !group || sessionGroup(s.lessonKey) === group)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => ({ startedAt: s.startedAt, kpm: s.kpm, accuracy: s.accuracy, kana: s.kana, label: sessionLabel(s.lessonKey) }));
  return limit ? points.slice(-limit) : points;
}

export interface Totals {
  sessions: number;
  kana: number;
  durationMs: number;
  bestKpm: number;
  /** Media de kana/min de las 5 últimas sesiones. */
  recentKpm: number;
}

export function totals(points: readonly SeriesPoint[], sessions: readonly SessionRecord[]): Totals {
  const recent = points.slice(-5);
  return {
    sessions: sessions.length,
    kana: sessions.reduce((a, s) => a + s.kana, 0),
    durationMs: sessions.reduce((a, s) => a + s.durationMs, 0),
    bestKpm: points.reduce((a, p) => Math.max(a, p.kpm), 0),
    recentKpm: recent.length ? Math.round((recent.reduce((a, p) => a + p.kpm, 0) / recent.length) * 10) / 10 : 0,
  };
}

/** Marcas «redondas» del eje y desde 0 hasta cubrir `max` (4–6 marcas). */
export function niceTicks(max: number): number[] {
  if (!(max > 0)) return [0, 10, 20, 30, 40];
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough)!;
  const ticks: number[] = [];
  for (let v = 0; v < max + step; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks.length > 6 ? ticks.slice(0, 6) : ticks;
}

/** 125_000 → "2 min"; 4_000_000 → "1 h 7 min". */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
