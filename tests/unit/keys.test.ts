import { describe, expect, it } from 'vitest';
import {
  BASIC_KEYS, DIRECTIONS, KEY_IDS, KEY_LABEL, KEY_LAYOUT,
  allStrokes, flickKana, keyFan, strokeFor, strokeId, strokesFor,
  type Direction, type KeyId,
} from '@/lib/kana';

// Tabla de referencia escrita a mano, independiente del código.
const EXPECTED: Record<string, string> = {
  a: 'あいうえお', ka: 'かきくけこ', sa: 'さしすせそ', ta: 'たちつてと',
  na: 'なにぬねの', ha: 'はひふへほ', ma: 'まみむめも', ra: 'らりるれろ',
};
const ORDER: Direction[] = ['tap', 'left', 'up', 'right', 'down'];

describe('disposición', () => {
  it('4 filas × 3 columnas con las 12 teclas, cada una una vez', () => {
    expect(KEY_LAYOUT).toHaveLength(4);
    for (const row of KEY_LAYOUT) expect(row).toHaveLength(3);
    expect([...KEY_LAYOUT.flat()].sort()).toEqual([...KEY_IDS].sort());
  });

  it('orden como el teclado del iPhone', () => {
    expect(KEY_LAYOUT.map((r) => r.map((k) => KEY_LABEL[k]).join(' '))).toEqual([
      'あ か さ', 'た な は', 'ま や ら', '小゛゜ わ 、。?!',
    ]);
  });

  it('el orden de direcciones es toque, ←, ↑, →, ↓', () => {
    expect(DIRECTIONS).toEqual(ORDER);
  });
});

describe('flickKana: las 40 combinaciones de teclas básicas', () => {
  for (const [key, row] of Object.entries(EXPECTED)) {
    for (const [i, dir] of ORDER.entries()) {
      it(`${key} + ${dir} = ${row[i]}`, () => {
        expect(flickKana(key as KeyId, dir)).toBe(row[i]);
      });
    }
  }

  it('el toque da la etiqueta de la tecla', () => {
    for (const key of BASIC_KEYS) expect(flickKana(key, 'tap')).toBe(KEY_LABEL[key]);
  });

  it('cada dirección corresponde a una vocal: ← い, ↑ う, → え, ↓ お', () => {
    const vowelOf: Record<Direction, string> = { tap: 'あ', left: 'い', up: 'う', right: 'え', down: 'お' };
    for (const dir of ORDER) expect(flickKana('a', dir)).toBe(vowelOf[dir]);
  });

  it('teclas especiales (comprobado en el iPhone)', () => {
    expect(keyFan('ya')).toEqual({ tap: 'や', left: '「', up: 'ゆ', right: '」', down: 'よ' });
    expect(keyFan('wa')).toEqual({ tap: 'わ', left: 'を', up: 'ん', right: 'ー', down: null });
    expect(keyFan('punct')).toEqual({ tap: '、', left: '。', up: '？', right: '！', down: null });
  });

  it('小゛゜ no tiene abanico', () => {
    for (const dir of ORDER) expect(flickKana('mod', dir)).toBeNull();
  });

  it('keyFan devuelve las 5 posiciones', () => {
    expect(keyFan('ka')).toEqual({ tap: 'か', left: 'き', up: 'く', right: 'け', down: 'こ' });
  });
});

describe('strokeFor: inverso', () => {
  it('53 gestos (40 básicos + 5 や + 4 わ + 4 puntuación), todos distintos', () => {
    const all = allStrokes();
    expect(all).toHaveLength(40 + 5 + 4 + 4);
    expect(new Set(all.map((s) => s.kana)).size).toBe(all.length);
    expect(new Set(all.map(strokeId)).size).toBe(all.length);
  });

  it('ida y vuelta para todas las kana', () => {
    for (const { key, dir, kana } of allStrokes()) {
      expect(strokeFor(kana)).toEqual({ key, dir });
      expect(flickKana(key, dir)).toBe(kana);
    }
  });

  it('teclas especiales', () => {
    expect(strokeFor('ゆ')).toEqual({ key: 'ya', dir: 'up' });
    expect(strokeFor('ん')).toEqual({ key: 'wa', dir: 'up' });
    expect(strokeFor('ー')).toEqual({ key: 'wa', dir: 'right' });
    expect(strokeFor('。')).toEqual({ key: 'punct', dir: 'left' });
    expect(strokeFor('？')).toEqual({ key: 'punct', dir: 'up' });
  });

  it('null para lo que no sale con un solo gesto', () => {
    for (const k of ['が', 'ぱ', 'っ', 'ゃ', 'ア', 'a', '?', '']) {
      expect(strokeFor(k)).toBeNull();
    }
  });
});
