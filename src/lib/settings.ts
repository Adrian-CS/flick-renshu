/** Ajustes de práctica. */
import type { HintLevel } from './hints';

export interface Settings {
  /** Duración de una sesión, en minutos. */
  durationMin: number;
  /** 'auto': según el dominio de la lección (pistas graduales). */
  hintMode: 'auto' | HintLevel;
  /** Si dudas más de esto, se señala el gesto esperado en el teclado. */
  hintDelayMs: number;
  /** virtual: el teclado de la app; system: el teclado フリック del móvil. */
  keyboard: 'virtual' | 'system';
}

export const DEFAULT_SETTINGS: Settings = {
  durationMin: 2,
  hintMode: 'auto',
  hintDelayMs: 2500,
  keyboard: 'virtual',
};

export const DURATION_OPTIONS = [1, 2, 3, 5] as const;
export const HINT_DELAY_OPTIONS = [1500, 2500, 4000] as const;
