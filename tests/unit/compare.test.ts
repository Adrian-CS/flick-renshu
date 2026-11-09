import { describe, expect, it } from 'vitest';
import { compareKana, firstErrorIndex, isComplete, isCorrectPrefix, normalizeKana, splitKana, toHiragana } from '@/lib/kana';

describe('toHiragana / normalizeKana', () => {
  it('katakana → hiragana', () => {
    expect(toHiragana('カタカナ')).toBe('かたかな');
    expect(toHiragana('ァヴヶ')).toBe('ぁゔゖ');
  });

  it('deja igual hiragana, ー, puntuación y latín', () => {
    expect(toHiragana('ひらがなー、。abc')).toBe('ひらがなー、。abc');
  });

  it('?! de ancho medio cuentan como ？！', () => {
    expect(normalizeKana('え?ほんと!')).toBe('え？ほんと！');
  });

  it('une dakuten combinantes (NFD → NFC)', () => {
    expect(normalizeKana('が')).toBe('が');
    expect(normalizeKana('パ')).toBe('ぱ');
    expect(splitKana('がき')).toEqual(['が', 'き']);
  });
});

describe('compareKana', () => {
  it('todo correcto', () => {
    expect(compareKana('さくら', 'さくら').map((r) => r.status)).toEqual(['ok', 'ok', 'ok']);
  });

  it('sin escribir: pendiente', () => {
    expect(compareKana('さくら', '')).toEqual([
      { expected: 'さ', typed: '', status: 'pending' },
      { expected: 'く', typed: '', status: 'pending' },
      { expected: 'ら', typed: '', status: 'pending' },
    ]);
  });

  it('a medias, con un error', () => {
    expect(compareKana('さくら', 'さけ')).toEqual([
      { expected: 'さ', typed: 'さ', status: 'ok' },
      { expected: 'く', typed: 'け', status: 'wrong' },
      { expected: 'ら', typed: '', status: 'pending' },
    ]);
  });

  it('kana de más', () => {
    expect(compareKana('ねこ', 'ねこの')).toEqual([
      { expected: 'ね', typed: 'ね', status: 'ok' },
      { expected: 'こ', typed: 'こ', status: 'ok' },
      { expected: '', typed: 'の', status: 'extra' },
    ]);
  });

  it('katakana escrita cuenta como su hiragana', () => {
    expect(compareKana('ねこ', 'ネコ').map((r) => r.status)).toEqual(['ok', 'ok']);
  });

  it('distingue kana parecidas', () => {
    expect(compareKana('は', 'ば')[0]!.status).toBe('wrong');
    expect(compareKana('つ', 'っ')[0]!.status).toBe('wrong');
  });
});

describe('isCorrectPrefix / isComplete / firstErrorIndex', () => {
  it('prefijos', () => {
    expect(isCorrectPrefix('さくら', '')).toBe(true);
    expect(isCorrectPrefix('さくら', 'さく')).toBe(true);
    expect(isCorrectPrefix('さくら', 'さけ')).toBe(false);
    expect(isCorrectPrefix('さくら', 'さくらこ')).toBe(false);
  });

  it('completo', () => {
    expect(isComplete('さくら', 'さくら')).toBe(true);
    expect(isComplete('さくら', 'サクラ')).toBe(true);
    expect(isComplete('さくら', 'さく')).toBe(false);
  });

  it('primer error', () => {
    expect(firstErrorIndex('さくら', 'さく')).toBe(-1);
    expect(firstErrorIndex('さくら', 'さけら')).toBe(1);
    expect(firstErrorIndex('ねこ', 'ねこの')).toBe(2);
  });
});
