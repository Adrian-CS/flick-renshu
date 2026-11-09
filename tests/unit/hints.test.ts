import { describe, expect, it } from 'vitest';
import { keyFace } from '@/lib/hints';

describe('keyFace', () => {
  it('all: las 5 kana', () => {
    expect(keyFace('ka', 'all')).toEqual({ center: 'か', around: { left: 'き', up: 'く', right: 'け', down: 'こ' } });
  });
  it('row: solo la de la fila あ', () => {
    expect(keyFace('ka', 'row')).toEqual({ center: 'か', around: {} });
  });
  it('none: tecla en blanco', () => {
    expect(keyFace('ka', 'none')).toEqual({ center: '', around: {} });
  });
  it('小゛゜: siempre su etiqueta', () => {
    for (const level of ['all', 'row', 'none'] as const) {
      expect(keyFace('mod', level)).toEqual({ center: '小゛゜', around: {} });
    }
  });
  it('teclas especiales', () => {
    expect(keyFace('wa', 'all')).toEqual({ center: 'わ', around: { left: 'を', up: 'ん', right: 'ー' } });
    expect(keyFace('punct', 'all')).toEqual({ center: '、', around: { left: '。', up: '？', right: '！' } });
    expect(keyFace('punct', 'row')).toEqual({ center: '、。?!', around: {} });
    expect(keyFace('ya', 'none')).toEqual({ center: '', around: {} });
  });
});
