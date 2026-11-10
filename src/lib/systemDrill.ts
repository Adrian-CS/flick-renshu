/**
 * Sesión con el teclado del sistema. El usuario escribe seguido (puede componer varios
 * objetivos sin confirmar); la sesión compara el valor del input con los objetivos
 * pendientes y avisa cuando se puede vaciar el input (nada en composición, todo bien).
 */
import { MAX_GAP_MS, LOOKAHEAD, type DrillMetrics, type KanaState } from './drill';
import { chars, comparableText, hasKanji, matchChars, type MatchState } from './systemInput';

export interface SystemDrillOptions {
  next: (previous: string | undefined) => string;
  durationMs: number;
  now?: () => number;
}

export type SystemState = MatchState | 'converted';

export class SystemDrill {
  /** Objetivo actual (tal cual, para mostrarlo). */
  current = '';
  upcoming: string[] = [];
  state: SystemState = 'ok';
  /** Caracteres del objetivo actual ya escritos bien. */
  matchedInCurrent = 0;
  finished = false;
  itemsDone = 0;

  private readonly now: () => number;
  /** Objetivos completados que siguen en el input (aún no se ha vaciado). */
  private pending: string[] = [];
  private startedAt: number | null = null;
  private activeMs = 0;
  private lastProgressAt: number;
  private kanaDone = 0;
  private errors = 0;
  /** Posición (en el objetivo actual) de los caracteres que tuvieron error. */
  private errorAt = new Set<number>();
  private inError = false;
  /** Avance total (kana completadas + bien escritas del actual) en el último feed. */
  private progress = 0;

  constructor(private readonly opts: SystemDrillOptions) {
    this.now = opts.now ?? (() => Date.now());
    this.lastProgressAt = this.now();
    this.current = opts.next(undefined);
    let prev = this.current;
    for (let i = 0; i < LOOKAHEAD; i++) {
      prev = opts.next(prev);
      this.upcoming.push(prev);
    }
  }

  get durationMs(): number {
    return this.opts.durationMs;
  }

  get started(): boolean {
    return this.startedAt !== null;
  }

  /** Caracteres (normalizados) del objetivo actual. */
  currentChars(): string[] {
    return chars(this.current);
  }

  kanaStates(): KanaState[] {
    const n = this.currentChars().length;
    return Array.from({ length: n }, (_, i) => {
      if (i < this.matchedInCurrent) return this.errorAt.has(i) ? 'done-error' : 'done';
      return i === this.matchedInCurrent ? 'current' : 'pending';
    });
  }

  /**
   * Nuevo valor del input. `composing` es el texto aún sin confirmar (vacío si no hay).
   * Devuelve `clear: true` cuando la UI puede vaciar el input; al hacerlo, llama a cleared().
   */
  feed(value: string, composing: string): { clear: boolean } {
    if (this.finished) return { clear: false };
    const t = this.now();
    if (this.startedAt === null) {
      if (!value) return { clear: false };
      this.startedAt = t;
      this.lastProgressAt = t;
    }

    const targets = [...this.pending, this.current, ...this.upcoming];
    // lo que se compone puede llegar como mucho al siguiente objetivo
    const anyKanji = [...this.pending, this.current, this.upcoming[0] ?? ''].some(hasKanji);
    const typed = chars(comparableText(value, composing, anyKanji));
    const pendingLen = this.pending.reduce((a, p) => a + chars(p).length, 0);

    const match = matchChars(typed, chars(targets.join('')));
    // completar objetivos mientras lo escrito los cubra
    let offset = pendingLen;
    while (match.matched >= offset + chars(this.current).length) {
      offset += chars(this.current).length;
      if (this.complete(t)) return { clear: false };
    }

    this.matchedInCurrent = Math.max(0, match.matched - offset);
    const progress = this.kanaDone + this.matchedInCurrent;
    if (progress > this.progress) {
      this.activeMs += Math.min(t - this.lastProgressAt, MAX_GAP_MS);
      this.lastProgressAt = t;
    }
    this.progress = progress;
    const committed = comparableText(value, composing, true);
    const converted = !hasKanji(this.current) && hasKanji(committed);
    const state: SystemState = match.state === 'wrong' && converted ? 'converted' : match.state;

    if (state === 'wrong' || state === 'converted') {
      if (!this.inError) {
        this.errors++;
        this.errorAt.add(this.matchedInCurrent);
        this.inError = true;
      }
    } else {
      this.inError = false;
    }
    this.state = state;

    // vaciar: nada en composición, todo bien y justo en el límite de un objetivo
    const clear = !composing && state === 'ok' && this.pending.length > 0 && match.matched === offset && typed.length === offset;
    return { clear };
  }

  /** La UI ha vaciado el input: lo completado ya no está en él. */
  cleared(): void {
    this.pending = [];
  }

  elapsedMs(): number {
    if (this.startedAt === null || this.finished) return this.activeMs;
    return this.activeMs + Math.min(this.now() - this.lastProgressAt, MAX_GAP_MS);
  }

  stop(): void {
    this.finished = true;
  }

  metrics(): DrillMetrics {
    const minutes = this.activeMs / 60000;
    const total = this.kanaDone + this.errors;
    return {
      durationMs: Math.round(this.activeMs),
      kana: this.kanaDone,
      kpm: minutes > 0 ? Math.round((this.kanaDone / minutes) * 10) / 10 : 0,
      accuracy: total > 0 ? this.kanaDone / total : 1,
      hints: 0,
      items: this.itemsDone,
    };
  }

  /** Completa el objetivo actual; devuelve true si con eso termina la sesión. */
  private complete(t: number): boolean {
    if (this.kanaDone + chars(this.current).length > this.progress) {
      this.activeMs += Math.min(t - this.lastProgressAt, MAX_GAP_MS);
      this.lastProgressAt = t;
    }
    this.kanaDone += chars(this.current).length;
    this.progress = this.kanaDone;
    this.itemsDone++;
    this.pending.push(this.current);
    this.errorAt = new Set();
    this.matchedInCurrent = 0;
    if (this.activeMs >= this.opts.durationMs) {
      this.finished = true;
      return true;
    }
    const prev = this.upcoming[this.upcoming.length - 1] ?? this.current;
    this.current = this.upcoming.shift()!;
    this.upcoming.push(this.opts.next(prev));
    return false;
  }
}
