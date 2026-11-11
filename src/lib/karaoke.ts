/**
 * Karaoke para Mis textos: tiempos de inicio de cada línea (LRC o sincronizados a mano),
 * una fuente de tiempo (cronómetro o audio) y la lógica de los modos.
 */

export interface Lrc {
  lines: string[];
  /** Inicio de cada línea, en ms. */
  times: number[];
}

const TAG = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;

/** Lee un texto LRC. Null si no tiene al menos 2 líneas con tiempo. */
export function parseLrc(text: string): Lrc | null {
  const entries: { t: number; line: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const tags = [...raw.matchAll(TAG)];
    if (tags.length === 0) continue;
    const line = raw.replace(TAG, '').trim();
    if (!line) continue; // pausas instrumentales
    for (const m of tags) {
      const sec = Number(m[2]!.replace(':', '.'));
      entries.push({ t: Math.round((Number(m[1]) * 60 + sec) * 1000), line });
    }
  }
  if (entries.length < 2) return null;
  entries.sort((a, b) => a.t - b.t);
  return { lines: entries.map((e) => e.line), times: entries.map((e) => e.t) };
}

/** 83_450 → "01:23.45" */
export function formatLrcTime(ms: number): string {
  const cs = Math.round(ms / 10);
  const min = Math.floor(cs / 6000);
  const sec = (cs % 6000) / 100;
  return `${String(min).padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`;
}

export function formatLrc(lines: readonly string[], times: readonly number[]): string {
  return lines.map((l, i) => `[${formatLrcTime(times[i] ?? 0)}]${l}`).join('\n');
}

/** 83_450 → "1:23" */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** ¿Hay un tiempo por línea y van en orden? */
export function validTimes(times: readonly number[] | undefined, lineCount: number): times is number[] {
  return !!times && times.length === lineCount && times.every((t, i) => t >= 0 && (i === 0 || t >= times[i - 1]!));
}

/** Índice de la línea que suena en `t` (la última que ha empezado), o -1 antes de la primera. */
export function lineAt(times: readonly number[], t: number): number {
  let i = -1;
  while (i + 1 < times.length && times[i + 1]! <= t) i++;
  return i;
}

/** Retrasa (+) o adelanta (−) todos los tiempos. */
export function shiftTimes(times: readonly number[], deltaMs: number): number[] {
  return times.map((t) => Math.max(0, t + deltaMs));
}

export type KaraokeMode = 'free' | 'karaoke' | 'wait';

export const KARAOKE_MODE_LABEL: Readonly<Record<KaraokeMode, string>> = {
  free: 'A tu ritmo',
  karaoke: 'Karaoke',
  wait: 'La canción te espera',
};

/** Margen antes del inicio de la línea siguiente en el que se pausa (para no cortar su primera sílaba). */
export const WAIT_LEAD_MS = 150;

/**
 * Modo «te espera»: con `done` líneas terminadas (de `times`), ¿hay que pausar en `t`?
 * Sí cuando la canción llega a la línea siguiente a la que se está escribiendo.
 */
export function shouldWait(times: readonly number[], done: number, t: number): boolean {
  return done + 1 < times.length && t >= times[done + 1]! - WAIT_LEAD_MS;
}

/** Margen tras el inicio de la línea siguiente que aún cuenta como «a tiempo». */
export const ON_TIME_GRACE_MS = 500;

/** ¿La línea `i`, terminada en `completedAt` (tiempo de la canción), se terminó a tiempo? */
export function onTime(times: readonly number[], i: number, completedAt: number, lastLineMs = 8000): boolean {
  const limit = i + 1 < times.length ? times[i + 1]! : times[i]! + lastLineMs;
  return completedAt <= limit + ON_TIME_GRACE_MS;
}

/** Fuente de tiempo de la canción. */
export interface TimeSource {
  now(): number;
  play(): void;
  pause(): void;
  seek(ms: number): void;
  readonly playing: boolean;
}

/** Cronómetro con pausa (la canción suena en otra app). */
export class Clock implements TimeSource {
  private base = 0;
  private since: number | null = null;

  constructor(private readonly clock: () => number = () => performance.now()) {}

  get playing(): boolean {
    return this.since !== null;
  }

  now(): number {
    return this.base + (this.since === null ? 0 : this.clock() - this.since);
  }

  play(): void {
    this.since ??= this.clock();
  }

  pause(): void {
    this.base = this.now();
    this.since = null;
  }

  seek(ms: number): void {
    this.base = Math.max(0, ms);
    if (this.since !== null) this.since = this.clock();
  }
}

/** Dónde empezar la canción para escribir desde la línea `from`: un poco antes. */
export function startPosition(times: readonly number[], from: number, leadInMs = 2000): number {
  return Math.max(0, (times[from] ?? 0) - leadInMs);
}
