import { describe, expect, it } from 'vitest';
import { autoHintLevel, itemWeight, mastery, mergeStat, pickWeighted, strokeWeight, troubleStrokes, weakestStrokes, type StrokeStat } from '@/lib/stats';

function stat(id: string, attempts: number, errors = 0, hints = 0, avgMs = 500): StrokeStat {
  return { id, attempts, errors, hints, avgMs, updatedAt: 0 };
}
const map = (...s: StrokeStat[]) => new Map(s.map((x) => [x.id, x]));

describe('strokeWeight', () => {
  it('nuevo: 3; dominado: 1', () => {
    expect(strokeWeight(undefined)).toBe(3);
    expect(strokeWeight(stat('a:tap', 0))).toBe(3);
    expect(strokeWeight(stat('a:tap', 20))).toBe(1);
  });
  it('crece con fallos, pistas y lentitud', () => {
    const base = strokeWeight(stat('x', 20));
    expect(strokeWeight(stat('x', 20, 5))).toBeGreaterThan(base);
    expect(strokeWeight(stat('x', 20, 0, 5))).toBeGreaterThan(base);
    expect(strokeWeight(stat('x', 20, 0, 0, 1500))).toBeGreaterThan(base);
  });
  it('la lentitud está acotada', () => {
    expect(strokeWeight(stat('x', 20, 0, 0, 100000))).toBe(3);
  });
  it('pocos intentos: aún cuenta como algo nuevo', () => {
    expect(strokeWeight(stat('x', 5))).toBeCloseTo(1.5);
  });
});

describe('itemWeight', () => {
  it('media de los gestos de la palabra (が = か + 小゛゜)', () => {
    const s = map(stat('ka:tap', 20, 10)); // peso 4; mod:tap sin ver → 3
    expect(itemWeight('か', s)).toBe(4);
    expect(itemWeight('が', s)).toBe(3.5);
  });
  it('lo que no se puede escribir pesa 1', () => {
    expect(itemWeight('abc', new Map())).toBe(1);
  });
});

describe('pickWeighted', () => {
  it('proporcional al peso', () => {
    const s = map(stat('a:tap', 20), stat('a:left', 20, 20)); // あ: 1, い: 7
    const counts = { あ: 0, い: 0 } as Record<string, number>;
    let seed = 0;
    const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 4000; i++) counts[pickWeighted(['あ', 'い'], { stats: s, random })]!++;
    expect(counts['い']! / counts['あ']!).toBeGreaterThan(5);
    expect(counts['い']! / counts['あ']!).toBeLessThan(9);
  });
  it('evita el anterior si hay alternativa', () => {
    for (let i = 0; i < 50; i++) expect(pickWeighted(['あ', 'い'], { stats: new Map(), avoid: 'あ' })).toBe('い');
    expect(pickWeighted(['あ'], { stats: new Map(), avoid: 'あ' })).toBe('あ');
  });
  it('el foco duplica el peso', () => {
    expect(pickWeighted(['あ', 'い'], { stats: new Map(), focus: new Set(['い']), random: () => 0.4 })).toBe('い');
    expect(pickWeighted(['あ', 'い'], { stats: new Map(), random: () => 0.4 })).toBe('あ');
  });
  it('lista vacía: error', () => {
    expect(() => pickWeighted([], { stats: new Map() })).toThrow();
  });
});

describe('weakestStrokes', () => {
  it('peores primero, solo con intentos suficientes y débiles de verdad', () => {
    const s = map(stat('a', 20, 2), stat('b', 20, 10), stat('c', 1, 1), stat('d', 20));
    expect(weakestStrokes(s).map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('mergeStat', () => {
  it('suma intentos y promedia el tiempo ponderado', () => {
    const m = mergeStat(stat('a', 2, 1, 0, 1000), { ...stat('a', 6, 1, 2, 600), updatedAt: 5 });
    expect(m).toEqual({ id: 'a', attempts: 8, errors: 2, hints: 2, avgMs: 700, updatedAt: 5 });
  });
  it('sin previo: copia', () => {
    expect(mergeStat(undefined, stat('a', 1))).toEqual(stat('a', 1));
  });
});

describe('mastery / autoHintLevel', () => {
  const ids = ['ka:tap', 'ka:left'];
  it('sin práctica: 0 y pistas completas', () => {
    expect(mastery(ids, new Map())).toBe(0);
    expect(autoHintLevel(ids, new Map())).toBe('all');
  });
  it('practicado y bien: solo あ', () => {
    const s = map(stat('ka:tap', 8), stat('ka:left', 8));
    expect(autoHintLevel(ids, s)).toBe('row');
  });
  it('dominado: sin etiqueta', () => {
    const s = map(stat('ka:tap', 30), stat('ka:left', 30));
    expect(autoHintLevel(ids, s)).toBe('none');
    expect(mastery(ids, s)).toBe(1);
  });
  it('un gesto débil devuelve las pistas', () => {
    const s = map(stat('ka:tap', 30), stat('ka:left', 30, 15));
    expect(autoHintLevel(ids, s)).toBe('all');
  });
});

describe('troubleStrokes', () => {
  it('solo los que tuvieron fallos o pistas, peores primero', () => {
    const d = [stat('a', 2), stat('b', 4, 1), stat('c', 1, 1, 1), stat('d', 3, 0, 1)];
    expect(troubleStrokes(d).map((x) => x.id)).toEqual(['c', 'b', 'd']);
  });
});
