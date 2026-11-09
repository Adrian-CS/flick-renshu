/** Clasificación de un gesto en una tecla: toque o deslizamiento en una de 4 direcciones. */
import type { Direction } from './kana';

/** Fracción del ancho de la tecla que hay que mover el dedo para que cuente como deslizar. */
export const FLICK_THRESHOLD_RATIO = 0.25;
/** Mínimo absoluto en px (para teclas estrechas). */
export const FLICK_THRESHOLD_MIN_PX = 15;

export function flickThreshold(keyWidth: number): number {
  return Math.max(keyWidth * FLICK_THRESHOLD_RATIO, FLICK_THRESHOLD_MIN_PX);
}

/**
 * Dirección a partir del desplazamiento (en coordenadas de pantalla: y crece hacia abajo).
 * Si la distancia no supera el umbral es un toque; si no, manda el eje dominante
 * (empate → horizontal).
 */
export function classifyGesture(dx: number, dy: number, keyWidth: number): Direction {
  if (Math.hypot(dx, dy) < flickThreshold(keyWidth)) return 'tap';
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

/**
 * Centro horizontal del abanico: el de la tecla, desplazado lo justo para que la cruz
 * (3 celdas de ancho) no se salga del contenedor.
 */
export function clampFanX(keyCenterX: number, cell: number, containerWidth: number): number {
  const half = cell * 1.5;
  if (containerWidth < half * 2) return containerWidth / 2;
  return Math.min(Math.max(keyCenterX, half), containerWidth - half);
}
