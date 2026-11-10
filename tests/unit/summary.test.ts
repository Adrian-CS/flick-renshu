import { describe, expect, it } from 'vitest';
import { compareSessions, formatDelta } from '@/lib/summary';

const m = (kpm: number, accuracy: number, hints: number) => ({ durationMs: 1, kana: 1, items: 1, kpm, accuracy, hints });

describe('summary', () => {
  it('sin sesión anterior: nada que comparar', () => {
    expect(compareSessions(m(1, 1, 0), undefined)).toBeNull();
  });
  it('diferencias', () => {
    expect(compareSessions(m(42.5, 0.95, 1), m(40, 0.9, 3))).toEqual({ kpm: 2.5, accuracy: 5, hints: -2 });
  });
  it('formato', () => {
    expect(formatDelta(2.5)).toBe('+2,5');
    expect(formatDelta(-1, ' %')).toBe('−1 %');
    expect(formatDelta(0)).toBe('±0');
  });
});
