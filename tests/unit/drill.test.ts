import { describe, expect, it } from 'vitest';
import { DrillSession, LOOKAHEAD, MAX_GAP_MS } from '@/lib/drill';
import { MOD_STROKE, strokeFor, type Stroke } from '@/lib/kana';

function clock(start = 1000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

/** Sesión con una lista fija de objetivos (en bucle). */
function session(targets: string[], opts: { durationMs?: number; hintDelayMs?: number } = {}) {
  const c = clock();
  let i = 0;
  const s = new DrillSession({
    next: () => targets[i++ % targets.length]!,
    durationMs: opts.durationMs ?? 60000,
    hintDelayMs: opts.hintDelayMs ?? 2000,
    now: c.now,
  });
  return { s, c };
}

const k = (kana: string): Stroke => strokeFor(kana)!;

describe('DrillSession', () => {
  it('carga el primero y ve los siguientes por adelantado', () => {
    const { s } = session(['あ', 'い', 'う', 'え', 'お', 'か']);
    expect(s.target).toBe('あ');
    expect(s.upcoming).toEqual(['い', 'う', 'え', 'お']);
    expect(s.upcoming).toHaveLength(LOOKAHEAD);
  });

  it('gesto correcto avanza y escribe', () => {
    const { s } = session(['さくら']);
    expect(s.press(k('さ'))).toBe('correct');
    expect(s.typed).toBe('さ');
    expect(s.kanaStates()).toEqual(['done', 'current', 'pending']);
  });

  it('gesto equivocado: no escribe, se marca la kana y se recuerda lo escrito', () => {
    const { s } = session(['さくら']);
    s.press(k('さ'));
    expect(s.press(k('け'))).toBe('wrong');
    expect(s.typed).toBe('さ');
    expect(s.lastWrong).toBe('け');
    s.press(k('く'));
    expect(s.lastWrong).toBeNull();
    expect(s.kanaStates()).toEqual(['done', 'done-error', 'current']);
  });

  it('kana con 小゛゜: varios gestos para una kana', () => {
    const { s } = session(['ぱん', 'あ']);
    s.press(k('は'));
    expect(s.typed).toBe('は');
    expect(s.kanaStates()[0]).toBe('current');
    s.press(MOD_STROKE);
    expect(s.typed).toBe('ば');
    expect(s.press(k('ん'))).toBe('wrong'); // aún falta el segundo 小゛゜
    s.press(MOD_STROKE);
    expect(s.typed).toBe('ぱ');
    expect(s.kanaStates()).toEqual(['done-error', 'current']);
    s.press(k('ん'));
    expect(s.target).toBe('あ');
    expect(s.itemsDone).toBe(1);
  });

  it('deslizar sobre 小゛゜ no cuenta como 小゛゜', () => {
    const { s } = session(['が']);
    s.press(k('か'));
    expect(s.press({ key: 'mod', dir: 'up' })).toBe('wrong');
  });

  it('métricas: kana/minuto, precisión, pistas', () => {
    const { s, c } = session(['あい'], { durationMs: 1 });
    s.press(k('あ')); // primer gesto: arranca el reloj
    c.advance(1000);
    s.press(k('う')); // fallo
    c.advance(500);
    s.press(k('い'));
    expect(s.finished).toBe(true);
    const m = s.metrics();
    expect(m.kana).toBe(2);
    expect(m.durationMs).toBe(1500);
    expect(m.kpm).toBe(80);
    expect(m.accuracy).toBeCloseTo(2 / 3);
    expect(m.items).toBe(1);
  });

  it('las pausas largas cuentan como MAX_GAP_MS', () => {
    const { s, c } = session(['あい']);
    s.press(k('あ'));
    c.advance(60000);
    s.press(k('い'));
    expect(s.metrics().durationMs).toBe(MAX_GAP_MS);
  });

  it('pista tras dudar; una por gesto', () => {
    const { s, c } = session(['あい'], { hintDelayMs: 2000 });
    s.press(k('あ'));
    c.advance(1999);
    expect(s.tick()).toBe(false);
    c.advance(1);
    expect(s.tick()).toBe(true);
    expect(s.hintVisible).toBe(true);
    expect(s.tick()).toBe(false);
    s.press(k('い'));
    expect(s.hintVisible).toBe(false);
    expect(s.metrics().hints).toBe(1);
  });

  it('estadística por gesto: intentos, fallos, pistas, tiempo', () => {
    const { s, c } = session(['かか', 'あ'], { hintDelayMs: 2000 });
    s.press(k('か'));
    c.advance(400);
    s.press(k('き')); // fallo en ka:tap
    c.advance(2000);
    s.tick(); // pista en ka:tap
    s.press(k('か'));
    const d = new Map(s.strokeDeltas().map((x) => [x.id, x]));
    expect(d.get('ka:tap')).toMatchObject({ attempts: 2, errors: 1, hints: 1 });
    expect(d.get('ka:tap')!.avgMs).toBe(1200); // (0 + 2400) / 2
    expect(d.has('ka:left')).toBe(false); // el fallo se apunta al gesto esperado
  });

  it('termina en el límite de un objetivo tras la duración', () => {
    const { s, c } = session(['あい', 'う'], { durationMs: 1000 });
    s.press(k('あ'));
    c.advance(2000);
    expect(s.finished).toBe(false);
    s.press(k('い'));
    expect(s.finished).toBe(true);
    expect(s.press(k('う'))).toBe('ignored');
  });

  it('parar antes de tiempo', () => {
    const { s } = session(['あ']);
    s.stop();
    expect(s.finished).toBe(true);
    expect(s.metrics().kpm).toBe(0);
  });

  it('objetivo imposible: error claro', () => {
    expect(() => session(['abc'])).toThrow(/abc|a/);
  });
});
