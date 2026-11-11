import { describe, expect, it } from 'vitest';
import { formatDuration, heatCells, heatLevel, kpmSeries, niceTicks, sessionGroup, sessionLabel, totals } from '@/lib/progress';
import type { SessionRecord } from '@/lib/db';
import type { StrokeStat } from '@/lib/stats';

const stat = (id: string, attempts: number, errors = 0, hints = 0, avgMs = 500): StrokeStat => ({ id, attempts, errors, hints, avgMs, updatedAt: 0 });
const rec = (lessonKey: string, startedAt: number, kpm: number, kana = 10): SessionRecord => ({
  lessonKey, startedAt, kpm, kana, accuracy: 0.9, hints: 0, items: 1, durationMs: 60000,
});

describe('heatLevel', () => {
  it('niveles por proporción de fallos', () => {
    expect(heatLevel('errors', 0)).toBe(0);
    expect(heatLevel('errors', 0.05)).toBe(1);
    expect(heatLevel('errors', 0.07)).toBe(2);
    expect(heatLevel('errors', 0.15)).toBe(3);
    expect(heatLevel('errors', 0.5)).toBe(4);
  });
  it('niveles por tiempo', () => {
    expect(heatLevel('time', 500)).toBe(0);
    expect(heatLevel('time', 2000)).toBe(4);
  });
});

describe('heatCells', () => {
  const cells = heatCells(new Map([['ka:up', stat('ka:up', 10, 3)], ['ka:tap', stat('ka:tap', 2, 2)]]), 'errors');
  it('una celda por gesto con abanico más 小゛゜', () => {
    expect(cells).toHaveLength(53 + 1);
    expect(cells.find((c) => c.id === 'mod:tap')?.label).toBe('小゛゜');
  });
  it('valor y nivel', () => {
    expect(cells.find((c) => c.id === 'ka:up')).toMatchObject({ label: 'く', attempts: 10, value: 0.3, level: 4 });
  });
  it('sin intentos suficientes: sin color', () => {
    expect(cells.find((c) => c.id === 'ka:tap')).toMatchObject({ value: null, level: null, attempts: 2 });
    expect(cells.find((c) => c.id === 'a:tap')).toMatchObject({ value: null, level: null, attempts: 0 });
  });
});

describe('sesiones', () => {
  it('etiquetas', () => {
    expect(sessionLabel('row-ka/mix')).toBe('か 行 · Mezcla');
    expect(sessionLabel('dir-left/mix')).toBe('← = い');
    expect(sessionLabel('sys:w-3/mix')).toBe('Palabras de 3 kana · sistema');
    expect(sessionLabel('text:4')).toBe('Mis textos');
    expect(sessionLabel('raro')).toBe('raro');
  });
  it('grupos', () => {
    expect(sessionGroup('row-ka/tap')).toBe('1');
    expect(sessionGroup('sys:dakuten/mix')).toBe('3');
    expect(sessionGroup('sys:text:1')).toBe('texts');
  });
  it('serie de kana/min por teclado, en orden', () => {
    const s = [rec('row-a/mix', 3, 30), rec('sys:row-a/mix', 2, 50), rec('row-ka/mix', 1, 20), rec('w-3/mix', 4, 40, 0)];
    expect(kpmSeries(s, 'virtual').map((p) => p.kpm)).toEqual([20, 30]); // sin la de 0 kana
    expect(kpmSeries(s, 'system').map((p) => p.kpm)).toEqual([50]);
    expect(kpmSeries(s, 'virtual', '1', 1).map((p) => p.kpm)).toEqual([30]);
  });
  it('totales', () => {
    const s = [rec('row-a/mix', 1, 20), rec('row-a/mix', 2, 40)];
    expect(totals(kpmSeries(s, 'virtual'), s)).toEqual({ sessions: 2, kana: 20, durationMs: 120000, bestKpm: 40, recentKpm: 30 });
  });
});

describe('ejes y formato', () => {
  it('marcas redondas', () => {
    expect(niceTicks(87)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(12)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(0)).toEqual([0, 10, 20, 30, 40]);
  });
  it('duración', () => {
    expect(formatDuration(125000)).toBe('2 min');
    expect(formatDuration(4020000)).toBe('1 h 7 min');
  });
});
