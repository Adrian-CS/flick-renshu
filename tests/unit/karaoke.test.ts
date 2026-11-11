import { describe, expect, it } from 'vitest';
import {
  Clock, formatClock, formatLrc, formatLrcTime, lineAt, onTime, parseLrc, shiftTimes, shouldWait, startPosition, validTimes, WAIT_LEAD_MS,
} from '@/lib/karaoke';

describe('LRC', () => {
  it('lee líneas y tiempos, ignora metadatos y pausas', () => {
    const lrc = '[ti:prueba]\n[ar:yo]\n[00:01.50]あめが ふる\n[00:04.00]\n[00:05.2]かぜが ふく\n[01:02.345]おわり';
    expect(parseLrc(lrc)).toEqual({ lines: ['あめが ふる', 'かぜが ふく', 'おわり'], times: [1500, 5200, 62345] });
  });
  it('varias marcas en una línea (estribillo repetido) y orden por tiempo', () => {
    expect(parseLrc('[00:10.00][00:30.00]ラララ\n[00:20.00]ルル')).toEqual({ lines: ['ラララ', 'ルル', 'ラララ'], times: [10000, 20000, 30000] });
  });
  it('texto normal: null', () => {
    expect(parseLrc('きょうは\nはれ')).toBeNull();
    expect(parseLrc('[00:01.00]ひとつだけ')).toBeNull();
  });
  it('escribir LRC (ida y vuelta)', () => {
    expect(formatLrcTime(83450)).toBe('01:23.45');
    expect(formatLrcTime(5)).toBe('00:00.01');
    const lines = ['あ', 'い'];
    const times = [1500, 62345];
    expect(parseLrc(formatLrc(lines, times))).toEqual({ lines, times: [1500, 62350] });
  });
  it('reloj', () => {
    expect(formatClock(83450)).toBe('1:23');
    expect(formatClock(-5)).toBe('0:00');
  });
});

describe('tiempos', () => {
  it('validTimes', () => {
    expect(validTimes([0, 100, 100, 200], 4)).toBe(true);
    expect(validTimes([0, 100], 3)).toBe(false);
    expect(validTimes([100, 50], 2)).toBe(false);
    expect(validTimes(undefined, 0)).toBe(false);
  });
  it('lineAt', () => {
    const t = [1000, 5000, 9000];
    expect(lineAt(t, 0)).toBe(-1);
    expect(lineAt(t, 1000)).toBe(0);
    expect(lineAt(t, 8999)).toBe(1);
    expect(lineAt(t, 60000)).toBe(2);
  });
  it('shiftTimes', () => {
    expect(shiftTimes([300, 1000], -500)).toEqual([0, 500]);
    expect(shiftTimes([300, 1000], 500)).toEqual([800, 1500]);
  });
  it('startPosition: un poco antes de la línea', () => {
    expect(startPosition([1000, 5000], 1)).toBe(3000);
    expect(startPosition([1000, 5000], 0)).toBe(0);
  });
});

describe('modos', () => {
  const times = [1000, 5000, 9000];
  it('te espera: pausa al llegar a la línea siguiente sin haber terminado', () => {
    expect(shouldWait(times, 0, 4000)).toBe(false);
    expect(shouldWait(times, 0, 5000 - WAIT_LEAD_MS)).toBe(true);
    expect(shouldWait(times, 1, 5000)).toBe(false); // ya terminó la primera
    expect(shouldWait(times, 2, 99999)).toBe(false); // última línea: no hay a quién esperar
  });
  it('a tiempo: antes de que empiece la siguiente (con margen)', () => {
    expect(onTime(times, 0, 5400)).toBe(true);
    expect(onTime(times, 0, 5600)).toBe(false);
    expect(onTime(times, 2, 17000)).toBe(true); // última: 8 s
    expect(onTime(times, 2, 18000)).toBe(false);
  });
});

describe('Clock', () => {
  it('cuenta solo mientras suena; pausa y salto', () => {
    let t = 0;
    const c = new Clock(() => t);
    expect(c.now()).toBe(0);
    c.play();
    t = 1000;
    expect(c.now()).toBe(1000);
    c.pause();
    t = 5000;
    expect(c.now()).toBe(1000);
    expect(c.playing).toBe(false);
    c.seek(3000);
    c.play();
    t = 5500;
    expect(c.now()).toBe(3500);
    c.seek(10000);
    t = 6000;
    expect(c.now()).toBe(10500);
  });
});
