import { describe, expect, it } from 'vitest';
import { MODIFIER_CYCLES, applyModifier, strokeFor, strokeId, strokesFor, strokesForKana } from '@/lib/kana';

/** Toca 小゛゜ n veces tras `kana`. */
function tapMod(kana: string, n: number): string {
  let k = kana;
  for (let i = 0; i < n; i++) k = applyModifier(k) ?? k;
  return k;
}

describe('applyModifier: ciclos comprobados en el iPhone', () => {
  it('つ → っ → づ → つ', () => {
    expect([1, 2, 3].map((n) => tapMod('つ', n))).toEqual(['っ', 'づ', 'つ']);
  });
  it('は → ば → ぱ → は', () => {
    expect([1, 2, 3].map((n) => tapMod('は', n))).toEqual(['ば', 'ぱ', 'は']);
  });
  it('か → が → か', () => {
    expect([1, 2].map((n) => tapMod('か', n))).toEqual(['が', 'か']);
  });
  it('や → ゃ → や', () => {
    expect([1, 2].map((n) => tapMod('や', n))).toEqual(['ゃ', 'や']);
  });
  it('あ → ぁ → あ', () => {
    expect([1, 2].map((n) => tapMod('あ', n))).toEqual(['ぁ', 'あ']);
  });
  it('わ → ゎ → わ', () => {
    expect([1, 2].map((n) => tapMod('わ', n))).toEqual(['ゎ', 'わ']);
  });
  it('う → ぅ → ゔ → う', () => {
    expect([1, 2, 3].map((n) => tapMod('う', n))).toEqual(['ぅ', 'ゔ', 'う']);
  });
});

describe('applyModifier: resto de filas', () => {
  const TABLE: [string, string][] = [
    ['きくけこ', 'ぎぐげご'], ['さしすせそ', 'ざじずぜぞ'], ['たちてと', 'だぢでど'],
    ['いえお', 'ぃぇぉ'], ['ゆよ', 'ゅょ'],
  ];
  for (const [plain, mod] of TABLE) {
    it(`${plain} → ${mod}`, () => {
      expect(Array.from(plain).map((k) => applyModifier(k)).join('')).toBe(mod);
    });
  }
  it('はひふへほ → ばびぶべぼ → ぱぴぷぺぽ', () => {
    expect(Array.from('はひふへほ').map((k) => tapMod(k, 1)).join('')).toBe('ばびぶべぼ');
    expect(Array.from('はひふへほ').map((k) => tapMod(k, 2)).join('')).toBe('ぱぴぷぺぽ');
  });
  it('desde una forma modificada sigue el ciclo', () => {
    expect(applyModifier('っ')).toBe('づ');
    expect(applyModifier('ぱ')).toBe('は');
    expect(applyModifier('ゔ')).toBe('う');
  });
  it('no hace nada con lo que no tiene variante', () => {
    for (const k of ['な', 'ま', 'ら', 'ん', 'を', 'ー', '、', '「', '']) expect(applyModifier(k)).toBeNull();
  });
});

describe('MODIFIER_CYCLES', () => {
  it('cada kana aparece en un solo ciclo', () => {
    const all = MODIFIER_CYCLES.flat();
    expect(new Set(all).size).toBe(all.length);
  });
  it('cada ciclo empieza por una kana que sale con un gesto', () => {
    for (const c of MODIFIER_CYCLES) expect(strokeFor(c[0]!)).not.toBeNull();
  });
  it('todas las formas son distintas de su base y son hiragana', () => {
    for (const c of MODIFIER_CYCLES) {
      for (const k of c) expect(k).toMatch(/^[ぁ-ゖ]$/);
      expect(new Set(c).size).toBe(c.length);
    }
  });
});

describe('strokesFor', () => {
  it('kana directa: un gesto', () => {
    expect(strokesForKana('く')?.map(strokeId)).toEqual(['ka:up']);
  });
  it('con 小゛゜: base + n toques', () => {
    expect(strokesForKana('が')?.map(strokeId)).toEqual(['ka:tap', 'mod:tap']);
    expect(strokesForKana('ぱ')?.map(strokeId)).toEqual(['ha:tap', 'mod:tap', 'mod:tap']);
    expect(strokesForKana('づ')?.map(strokeId)).toEqual(['ta:up', 'mod:tap', 'mod:tap']);
    expect(strokesForKana('ょ')?.map(strokeId)).toEqual(['ya:down', 'mod:tap']);
    expect(strokesForKana('ゎ')?.map(strokeId)).toEqual(['wa:tap', 'mod:tap']);
  });
  it('palabras', () => {
    expect(strokesFor('さくら')?.map(strokeId)).toEqual(['sa:tap', 'ka:up', 'ra:tap']);
    expect(strokesFor('がっこう')?.map(strokeId)).toEqual([
      'ka:tap', 'mod:tap', 'ta:up', 'mod:tap', 'ka:down', 'a:up',
    ]);
    expect(strokesFor('きょう')?.map(strokeId)).toEqual(['ka:left', 'ya:down', 'mod:tap', 'a:up']);
    expect(strokesFor('ラーメン')).toBeNull(); // katakana: se normaliza antes
    expect(strokesFor('らーめん')?.map(strokeId)).toEqual(['ra:tap', 'wa:right', 'ma:right', 'wa:up']);
  });
  it('cadena vacía → secuencia vacía; imposible → null', () => {
    expect(strokesFor('')).toEqual([]);
    expect(strokesFor('a')).toBeNull();
  });
  it('ida y vuelta: aplicar los gestos reproduce la kana', () => {
    for (const c of MODIFIER_CYCLES) {
      for (const k of c) {
        const strokes = strokesForKana(k)!;
        expect(tapMod(c[0]!, strokes.length - 1)).toBe(k);
      }
    }
  });
});
