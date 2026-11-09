import { describe, expect, it } from 'vitest';
import { applyEdit } from '@/lib/textEdit';

describe('applyEdit', () => {
  it('inserta al final', () => {
    expect(applyEdit('さく', { type: 'insert', text: 'ら' })).toBe('さくら');
  });
  it('borra la última kana', () => {
    expect(applyEdit('さくら', { type: 'backspace' })).toBe('さく');
    expect(applyEdit('', { type: 'backspace' })).toBe('');
  });
  it('borra por puntos de código (no deja medio carácter)', () => {
    expect(applyEdit('あ𠮟', { type: 'backspace' })).toBe('あ');
  });
  it('vacía', () => {
    expect(applyEdit('さくら', { type: 'clear' })).toBe('');
  });
});
