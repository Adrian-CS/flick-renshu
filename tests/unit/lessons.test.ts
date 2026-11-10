import { describe, expect, it } from 'vitest';
import { LESSONS, getLesson, lessonPool, lessonStrokeIds } from '@/lib/lessons';
import { strokesFor } from '@/lib/kana';

describe('lecciones', () => {
  it('ids únicos', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it('todas las fases tienen elementos y todos se pueden escribir', () => {
    for (const l of LESSONS) {
      for (const p of l.phases) {
        const pool = lessonPool(l.id, p);
        expect(pool.items.length, `${l.id}/${p}`).toBeGreaterThan(0);
        for (const item of pool.items) expect(strokesFor(item), `${l.id}: ${item}`).not.toBeNull();
        for (const f of pool.focus) expect(pool.items).toContain(f);
      }
    }
  });

  it('fila か: toques acumulados, direcciones nuevas, mezcla con foco en か行', () => {
    expect(lessonPool('row-ka', 'tap').items).toEqual(['あ', 'か']);
    expect(lessonPool('row-ka', 'dirs').items).toEqual(['き', 'く', 'け', 'こ']);
    const mix = lessonPool('row-ka', 'mix');
    expect(mix.items).toEqual([...'あいうえおかきくけこ']);
    expect([...mix.focus]).toEqual([...'かきくけこ']);
  });

  it('filas especiales: sin 「」', () => {
    expect(lessonPool('row-ya', 'dirs').items).toEqual(['ゆ', 'よ']);
    expect(lessonPool('row-wa', 'dirs').items).toEqual(['を', 'ん', 'ー']);
  });

  it('por dirección', () => {
    expect(lessonPool('dir-left', 'mix').items).toEqual([...'いきしちにひみりを']);
    expect(lessonPool('dir-down', 'mix').items).toEqual([...'おこそとのほもよろ']);
    expect(lessonPool('dir-all', 'mix').items).toHaveLength(5 * 8 + 3 + 4);
  });

  it('゛゜ y pequeñas', () => {
    expect(lessonPool('dakuten', 'mix').items).toEqual(expect.arrayContaining(['が', 'ぢ', 'づ', 'ぼ', 'ゔ']));
    expect(lessonPool('dakuten', 'mix').items).not.toContain('ぱ');
    expect(lessonPool('handakuten', 'mix').items).toEqual(expect.arrayContaining(['ぱ', 'ぽ', 'ば']));
    expect([...lessonPool('handakuten', 'mix').focus]).toEqual([...'ぱぴぷぺぽ']);
    expect(lessonPool('small', 'mix').items.sort()).toEqual([...'ぁぃぅぇぉっゃゅょゎ'].sort());
    expect(lessonPool('youon', 'mix').items).toContain('きゃ');
    expect(lessonPool('youon', 'mix').items).toHaveLength(33);
  });

  it('fase inexistente: error', () => {
    expect(() => lessonPool('punct', 'tap')).toThrow();
    expect(() => lessonPool('nada', 'mix')).toThrow();
    expect(getLesson('nada')).toBeUndefined();
  });

  it('gestos de una lección: los de su material nuevo', () => {
    expect(lessonStrokeIds('row-ka').sort()).toEqual(['ka:down', 'ka:left', 'ka:right', 'ka:tap', 'ka:up']);
    expect(lessonStrokeIds('handakuten').sort()).toEqual(
      ['ha:down', 'ha:left', 'ha:right', 'ha:tap', 'ha:up', 'mod:tap'].sort(),
    );
  });
});
