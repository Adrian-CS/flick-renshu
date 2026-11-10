/**
 * Sesión de práctica: gesto a gesto contra un objetivo en hiragana (modo estricto:
 * un gesto equivocado no escribe nada, cuenta como fallo y hay que repetir).
 * Lógica pura sin DOM; la UI llama a press()/tick() y vuelve a pintar.
 * Adaptado de Teclear (HangulTraining).
 */
import { applyModifier, flickKana, KEY_LABEL, MOD_KEY, strokeId, strokesForKana, type Stroke } from './kana';
import type { StrokeStat } from './stats';

/** Pausas más largas (mirar por la ventana del tren…) cuentan como esto. */
export const MAX_GAP_MS = 5000;
/** Cuántos objetivos siguientes se muestran por adelantado. */
export const LOOKAHEAD = 4;

export interface DrillOptions {
  /** Da el siguiente objetivo (hiragana escribible con el teclado). */
  next: (previous: string | undefined) => string;
  hintDelayMs: number;
  /** Duración: la sesión termina al acabar el primer objetivo tras este tiempo activo. */
  durationMs: number;
  now?: () => number;
}

export type PressResult = 'correct' | 'wrong' | 'ignored';

export type KanaState = 'done' | 'done-error' | 'current' | 'pending';

export interface DrillMetrics {
  /** Tiempo activo desde el primer gesto (pausas largas recortadas). */
  durationMs: number;
  /** Kana completadas. */
  kana: number;
  /** Kana por minuto. */
  kpm: number;
  /** Gestos correctos / todos los gestos, 0–1. */
  accuracy: number;
  /** Gestos en los que apareció la pista. */
  hints: number;
  /** Objetivos completados. */
  items: number;
}

interface Acc {
  attempts: number;
  errors: number;
  hints: number;
  totalMs: number;
}

interface Step {
  stroke: Stroke;
  /** Índice de la kana del objetivo a la que pertenece el gesto. */
  kanaIndex: number;
}

export class DrillSession {
  target = '';
  /** Kana del objetivo (puntos de código). */
  kana: string[] = [];
  steps: Step[] = [];
  /** Índice en `steps` del siguiente gesto esperado. */
  position = 0;
  /** Lo escrito del objetivo actual. */
  typed = '';
  /** Objetivos siguientes (para verlos por adelantado). */
  upcoming: string[] = [];
  hintVisible = false;
  finished = false;
  itemsDone = 0;
  /** Lo que escribió el último gesto equivocado (para el aviso en rojo); se borra al acertar. */
  lastWrong: string | null = null;

  private readonly now: () => number;
  private startedAt: number | null = null;
  private activeMs = 0;
  private lastProgressAt: number;
  private correct = 0;
  private wrong = 0;
  private hints = 0;
  private kanaDone = 0;
  private stepHadError = false;
  private stepHadHint = false;
  private kanaErrors = new Set<number>();
  private readonly perStroke = new Map<string, Acc>();

  constructor(private readonly opts: DrillOptions) {
    this.now = opts.now ?? (() => Date.now());
    this.lastProgressAt = this.now();
    let prev: string | undefined;
    const first = opts.next(undefined);
    prev = first;
    for (let i = 0; i < LOOKAHEAD; i++) {
      prev = opts.next(prev);
      this.upcoming.push(prev);
    }
    this.load(first);
  }

  get expected(): Stroke | null {
    return this.steps[this.position]?.stroke ?? null;
  }

  /** Estado de cada kana del objetivo actual, para colorearlas. */
  kanaStates(): KanaState[] {
    const current = this.steps[this.position]?.kanaIndex ?? this.kana.length;
    return this.kana.map((_, i) => {
      if (i < current) return this.kanaErrors.has(i) ? 'done-error' : 'done';
      return i === current ? 'current' : 'pending';
    });
  }

  press(stroke: Stroke): PressResult {
    if (this.finished) return 'ignored';
    const expected = this.expected;
    if (!expected) return 'ignored';

    const t = this.now();
    if (this.startedAt === null) {
      this.startedAt = t;
      this.lastProgressAt = t;
    }

    if (strokeId(stroke) !== strokeId(expected)) {
      this.wrong++;
      this.stepHadError = true;
      this.kanaErrors.add(this.steps[this.position]!.kanaIndex);
      this.lastWrong = this.produced(stroke);
      return 'wrong';
    }

    const gap = Math.min(t - this.lastProgressAt, MAX_GAP_MS);
    this.activeMs += gap;
    this.record(strokeId(expected), gap);
    this.correct++;
    this.lastWrong = null;
    this.typed = this.apply(this.typed, expected);
    this.position++;
    this.lastProgressAt = t;
    this.stepHadError = false;
    this.stepHadHint = false;
    this.hintVisible = false;

    if (this.position >= this.steps.length) {
      this.itemsDone++;
      this.kanaDone += this.kana.length;
      if (this.activeMs >= this.opts.durationMs) this.finished = true;
      else this.advance();
    }
    return 'correct';
  }

  /** Llamar periódicamente; devuelve true cuando la pista acaba de aparecer. */
  tick(): boolean {
    if (this.finished || this.hintVisible) return false;
    if (this.now() - this.lastProgressAt < this.opts.hintDelayMs) return false;
    this.hintVisible = true;
    if (!this.stepHadHint) {
      this.stepHadHint = true;
      this.hints++;
    }
    return true;
  }

  /** Tiempo activo hasta ahora, con la pausa en curso (recortada). */
  elapsedMs(): number {
    if (this.startedAt === null || this.finished) return this.activeMs;
    return this.activeMs + Math.min(this.now() - this.lastProgressAt, MAX_GAP_MS);
  }

  get durationMs(): number {
    return this.opts.durationMs;
  }

  get started(): boolean {
    return this.startedAt !== null;
  }

  /** Terminar antes de tiempo. */
  stop(): void {
    this.finished = true;
  }

  metrics(): DrillMetrics {
    const presses = this.correct + this.wrong;
    const minutes = this.activeMs / 60000;
    return {
      durationMs: Math.round(this.activeMs),
      kana: this.kanaDone,
      kpm: minutes > 0 ? Math.round((this.kanaDone / minutes) * 10) / 10 : 0,
      accuracy: presses > 0 ? this.correct / presses : 1,
      hints: this.hints,
      items: this.itemsDone,
    };
  }

  /** Resultados por gesto de esta sesión, para sumarlos a los totales. */
  strokeDeltas(): StrokeStat[] {
    const updatedAt = this.now();
    return [...this.perStroke].map(([id, s]) => ({
      id,
      attempts: s.attempts,
      errors: s.errors,
      hints: s.hints,
      avgMs: s.attempts > 0 ? s.totalMs / s.attempts : 0,
      updatedAt,
    }));
  }

  private produced(stroke: Stroke): string {
    if (stroke.key === MOD_KEY) return KEY_LABEL[MOD_KEY];
    return flickKana(stroke.key, stroke.dir) ?? '';
  }

  private apply(text: string, stroke: Stroke): string {
    if (stroke.key !== MOD_KEY) return text + (flickKana(stroke.key, stroke.dir) ?? '');
    const chars = Array.from(text);
    const next = chars.length ? applyModifier(chars[chars.length - 1]!) : null;
    return next ? chars.slice(0, -1).join('') + next : text;
  }

  private record(id: string, ms: number): void {
    const s = this.perStroke.get(id) ?? { attempts: 0, errors: 0, hints: 0, totalMs: 0 };
    s.attempts++;
    if (this.stepHadError) s.errors++;
    if (this.stepHadHint) s.hints++;
    s.totalMs += ms;
    this.perStroke.set(id, s);
  }

  private advance(): void {
    const next = this.upcoming.shift()!;
    this.upcoming.push(this.opts.next(this.upcoming[this.upcoming.length - 1] ?? next));
    this.load(next);
  }

  private load(target: string): void {
    const kana = Array.from(target);
    const steps: Step[] = [];
    kana.forEach((k, kanaIndex) => {
      const s = strokesForKana(k);
      if (!s) throw new Error(`No se puede escribir «${k}» con el teclado`);
      for (const stroke of s) steps.push({ stroke, kanaIndex });
    });
    this.target = target;
    this.kana = kana;
    this.steps = steps;
    this.position = 0;
    this.typed = '';
    this.kanaErrors = new Set();
    this.lastProgressAt = this.now();
    this.hintVisible = false;
    this.stepHadError = false;
    this.stepHadHint = false;
  }
}
