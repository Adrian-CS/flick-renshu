/** Una sesión en marcha (teclado virtual o del sistema) y cómo guardarla al terminar. */
import type { DrillMetrics, DrillSession } from '@/lib/drill';
import type { SystemDrill } from '@/lib/systemDrill';
import type { HintLevel } from '@/lib/hints';
import { troubleStrokes, type StrokeStat } from '@/lib/stats';
import { saveSession, sessionsFor, type SessionRecord } from '@/lib/db';

export type Drill =
  | { kind: 'virtual'; session: DrillSession; hint: HintLevel }
  | { kind: 'system'; session: SystemDrill };

export interface Run {
  drill: Drill;
  /** Clave para guardar y comparar sesiones ("row-ka/mix", "sys:row-ka/mix", "text:3"…). */
  key: string;
  title: string;
  startedAt: number;
  /** Referencia con kanji de cada objetivo. */
  display: Map<string, string>;
  /** Textos: líneas en orden; la sesión acaba al escribirlas todas. */
  lines?: readonly string[];
}

export interface Result {
  metrics: DrillMetrics;
  prev?: SessionRecord;
  weak: StrokeStat[];
}

export function sessionKey(base: string, keyboard: 'virtual' | 'system'): string {
  return keyboard === 'system' ? `sys:${base}` : base;
}

/** Termina la sesión, la guarda (si se escribió algo) y devuelve el resumen. */
export async function finishRun(run: Run): Promise<Result> {
  const { session } = run.drill;
  session.stop();
  const metrics = session.metrics();
  const deltas = run.drill.kind === 'virtual' ? run.drill.session.strokeDeltas() : [];
  const prev = (await sessionsFor(run.key).catch(() => []))[0];
  if (metrics.kana > 0) await saveSession({ ...metrics, lessonKey: run.key, startedAt: run.startedAt }, deltas).catch(() => undefined);
  return { metrics, prev, weak: troubleStrokes(deltas) };
}
