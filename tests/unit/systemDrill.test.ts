import { describe, expect, it } from 'vitest';
import { SystemDrill } from '@/lib/systemDrill';

function make(targets: string[], durationMs = 600000) {
  let t = 1000;
  let i = 0;
  const d = new SystemDrill({ next: () => targets[i++ % targets.length]!, durationMs, now: () => t });
  return { d, advance: (ms: number) => (t += ms) };
}

describe('SystemDrill', () => {
  it('compone varios objetivos seguidos y vacía al confirmar', () => {
    const { d, advance } = make(['あ', 'か', 'さ', 'た', 'な', 'は', 'ま']);
    expect(d.current).toBe('あ');
    d.feed('あ', 'あ');
    expect(d.current).toBe('か');
    advance(500);
    expect(d.feed('あか', 'あか')).toEqual({ clear: false }); // aún en composición
    expect(d.current).toBe('さ');
    expect(d.feed('あか', '')).toEqual({ clear: true }); // 確定 → se puede vaciar
    d.feed('あか', ''); // la UI aún no lo ha vaciado: sigue cuadrando
    expect(d.state).toBe('ok');
    d.cleared();
    d.feed('さ', 'さ');
    expect(d.current).toBe('た');
    expect(d.itemsDone).toBe(3);
  });

  it('una palabra a medias, con base de 小゛゜ pendiente', () => {
    const { d } = make(['がっこう', 'ねこ']);
    d.feed('がつ', 'がつ');
    expect(d.state).toBe('partial');
    expect(d.matchedInCurrent).toBe(1);
    d.feed('がっ', 'がっ');
    expect(d.state).toBe('ok');
    expect(d.kanaStates()).toEqual(['done', 'done', 'current', 'pending']);
    d.feed('がっこう', '');
    expect(d.current).toBe('ねこ');
  });

  it('error: se cuenta una vez y se marca la kana', () => {
    const { d } = make(['さくら', 'ねこ']);
    d.feed('さけ', 'さけ');
    expect(d.state).toBe('wrong');
    d.feed('さけ', 'さけ'); // el mismo error no cuenta dos veces
    d.feed('さ', 'さ');
    d.feed('さく', 'さく');
    expect(d.kanaStates()).toEqual(['done', 'done-error', 'current']);
    d.feed('さくら', '');
    expect(d.metrics().accuracy).toBeCloseTo(3 / 4);
  });

  it('convertir a kanji un objetivo en kana: aviso de 確定 sin convertir', () => {
    const { d } = make(['がっこう', 'ねこ']);
    d.feed('学校', '');
    expect(d.state).toBe('converted');
  });

  it('objetivo con kanji (textos): se compara lo confirmado', () => {
    const { d } = make(['今日は晴れ。', '明日は雨。']);
    d.feed('きょう', 'きょう');
    expect(d.state).toBe('ok'); // lo que se compone no cuenta todavía
    d.feed('今日は', '');
    expect(d.matchedInCurrent).toBe(3);
    d.feed('今日ははれ', 'はれ');
    expect(d.state).toBe('ok');
    d.feed('今日は晴れ。', '');
    expect(d.current).toBe('明日は雨。');
  });

  it('kana/minuto con el tiempo activo y las pausas recortadas', () => {
    const { d, advance } = make(['あい', 'う']);
    d.feed('あ', 'あ'); // arranca
    advance(1000);
    d.feed('あい', 'あい');
    advance(60000);
    d.feed('あいう', 'あいう');
    const m = d.metrics();
    expect(m.kana).toBe(3);
    expect(m.durationMs).toBe(6000);
    expect(m.kpm).toBe(30);
  });

  it('termina al completar un objetivo pasada la duración', () => {
    const { d, advance } = make(['あ', 'い'], 1000);
    d.feed('あ', 'あ');
    advance(2000);
    d.feed('あい', 'あい');
    expect(d.finished).toBe(true);
    expect(d.feed('あいあ', '')).toEqual({ clear: false });
  });

  it('el input vacío al principio no arranca el reloj', () => {
    const { d } = make(['あ']);
    d.feed('', '');
    expect(d.started).toBe(false);
  });
});
