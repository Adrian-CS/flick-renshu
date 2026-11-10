import { describe, expect, it } from 'vitest';
import { canUseVirtual, looksLikeRomaji, textLines, virtualLine } from '@/lib/texts';

describe('texts', () => {
  it('líneas', () => {
    expect(textLines('  あか \n\n\r\nあお\n  ')).toEqual(['あか', 'あお']);
    expect(textLines('')).toEqual([]);
  });
  it('línea para el teclado virtual', () => {
    expect(virtualLine('きょうは はれ。')).toBe('きょうははれ。');
    expect(virtualLine('カタカナ?')).toBe('かたかな？');
    expect(virtualLine('今日は')).toBeNull();
    expect(virtualLine('abc')).toBeNull();
  });
  it('teclado virtual solo si todo es kana', () => {
    expect(canUseVirtual(['あめ', 'ゆき'])).toBe(true);
    expect(canUseVirtual(['あめ', '雪'])).toBe(false);
    expect(canUseVirtual([])).toBe(false);
  });
  it('romaji', () => {
    expect(looksLikeRomaji('kyou')).toBe(true);
    expect(looksLikeRomaji('きょう')).toBe(false);
  });
});
