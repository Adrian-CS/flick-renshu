import { describe, expect, it } from 'vitest';
import { chars, committedPart, comparableText, hasKanji, matchChars, normalizeForCompare } from '@/lib/systemInput';
import { sameModifierCycle } from '@/lib/kana';

const m = (typed: string, target: string) => matchChars(chars(typed), chars(target));

describe('normalizeForCompare', () => {
  it('katakana, anchos y espacios', () => {
    expect(normalizeForCompare('カタ カナ')).toBe('かたかな');
    expect(normalizeForCompare('ｶﾀｶﾅ？')).toBe('かたかな?');
    expect(normalizeForCompare('え？ ほんと！')).toBe(normalizeForCompare('え?ほんと!'));
    expect(normalizeForCompare('が')).toBe('が');
  });
});

describe('sameModifierCycle', () => {
  it('base y formas con 小゛゜', () => {
    expect(sameModifierCycle('つ', 'っ')).toBe(true);
    expect(sameModifierCycle('つ', 'づ')).toBe(true);
    expect(sameModifierCycle('は', 'ぱ')).toBe(true);
    expect(sameModifierCycle('ば', 'ぱ')).toBe(true);
    expect(sameModifierCycle('か', 'か')).toBe(false);
    expect(sameModifierCycle('か', 'き')).toBe(false);
    expect(sameModifierCycle('な', 'な')).toBe(false);
  });
});

describe('matchChars', () => {
  it('vacío y prefijos correctos', () => {
    expect(m('', 'さくら')).toEqual({ matched: 0, state: 'ok' });
    expect(m('さく', 'さくら')).toEqual({ matched: 2, state: 'ok' });
    expect(m('さくら', 'さくら')).toEqual({ matched: 3, state: 'ok' });
  });
  it('kana que 小゛゜ aún puede cambiar: parcial, no error', () => {
    expect(m('がつ', 'がっこう')).toEqual({ matched: 1, state: 'partial' });
    expect(m('は', 'ぱん')).toEqual({ matched: 0, state: 'partial' });
    expect(m('ば', 'ぱん')).toEqual({ matched: 0, state: 'partial' });
  });
  it('errores', () => {
    expect(m('さけ', 'さくら')).toEqual({ matched: 1, state: 'wrong' });
    expect(m('つこ', 'っこ')).toEqual({ matched: 0, state: 'wrong' }); // la base no es la última
    expect(m('さくらこ', 'さくら')).toEqual({ matched: 3, state: 'wrong' });
  });
  it('katakana cuenta como su hiragana', () => {
    expect(m('サクラ', 'さくら').state).toBe('ok');
  });
});

describe('composición', () => {
  it('parte confirmada', () => {
    expect(committedPart('今日はさむ', 'さむ')).toBe('今日は');
    expect(committedPart('今日は', '')).toBe('今日は');
    expect(committedPart('abc', 'zz')).toBe('abc');
  });
  it('con kanji en el objetivo solo cuenta lo confirmado', () => {
    expect(comparableText('今日はさむ', 'さむ', true)).toBe('今日は');
    expect(comparableText('きょうはさむ', 'さむ', false)).toBe('きょうはさむ');
  });
  it('hasKanji', () => {
    expect(hasKanji('今日')).toBe(true);
    expect(hasKanji('きょう、カナ！')).toBe(false);
  });
});
