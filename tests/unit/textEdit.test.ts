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
  it('小゛゜ modifica la última kana', () => {
    expect(applyEdit('がつ', { type: 'modify' })).toBe('がっ');
    expect(applyEdit('がっ', { type: 'modify' })).toBe('がづ');
    expect(applyEdit('は', { type: 'modify' })).toBe('ば');
  });
  it('小゛゜ sin efecto si no hay nada que modificar', () => {
    expect(applyEdit('', { type: 'modify' })).toBe('');
    expect(applyEdit('ねん', { type: 'modify' })).toBe('ねん');
  });
  it('vacía', () => {
    expect(applyEdit('さくら', { type: 'clear' })).toBe('');
  });
});
