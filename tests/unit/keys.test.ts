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

  it('teclas especiales: todavía sin definir', () => {
    for (const key of ['ya', 'wa', 'mod', 'punct'] as const) {
      for (const dir of ORDER) expect(flickKana(key, dir)).toBeNull();
    }
  });

  it('keyFan devuelve las 5 posiciones', () => {
    expect(keyFan('ka')).toEqual({ tap: 'か', left: 'き', up: 'く', right: 'け', down: 'こ' });
    expect(keyFan('wa')).toEqual({ tap: null, left: null, up: null, right: null, down: null });
  });
});

describe('strokeFor: inverso', () => {
  it('40 gestos distintos, 40 kana distintas', () => {
    const all = allStrokes();
    expect(all).toHaveLength(40);
    expect(new Set(all.map((s) => s.kana)).size).toBe(40);
    expect(new Set(all.map(strokeId)).size).toBe(40);
  });

  it('ida y vuelta para todas las kana', () => {
    for (const { key, dir, kana } of allStrokes()) {
      expect(strokeFor(kana)).toEqual({ key, dir });
      expect(flickKana(key, dir)).toBe(kana);
    }
  });

  it('null para lo que aún no se escribe con un gesto básico', () => {
    for (const k of ['が', 'ぱ', 'っ', 'ゃ', 'や', 'わ', 'を', 'ん', 'ー', '、', 'ア', 'a', '']) {
      expect(strokeFor(k)).toBeNull();
    }
  });
});

describe('strokesFor', () => {
  it('secuencia de gestos de una palabra', () => {
    expect(strokesFor('さくら')).toEqual([
      { key: 'sa', dir: 'tap' }, { key: 'ka', dir: 'up' }, { key: 'ra', dir: 'tap' },
    ]);
    expect(strokesFor('ひと')?.map(strokeId)).toEqual(['ha:left', 'ta:down']);
  });

  it('cadena vacía → secuencia vacía', () => {
    expect(strokesFor('')).toEqual([]);
  });

  it('null si alguna kana aún no es escribible', () => {
    expect(strokesFor('がっこう')).toBeNull();
    expect(strokesFor('やま')).toBeNull();
  });
});
