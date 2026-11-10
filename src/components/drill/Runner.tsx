'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VirtualKeyboard } from '@/components/VirtualKeyboard';
import type { DrillSession, KanaState } from '@/lib/drill';
import type { SystemDrill } from '@/lib/systemDrill';
import { MOD_STROKE, type Stroke } from '@/lib/kana';
import { strokeLabel } from '@/lib/labels';
import { looksLikeRomaji } from '@/lib/texts';
import type { Run } from './run';

/** Pantalla de una sesión en marcha. Llama a onFinish una sola vez. */
export function Runner({ run, onFinish }: { run: Run; onFinish: () => void }) {
  const [, rerender] = useState(0);
  const refresh = useCallback(() => rerender((n) => n + 1), []);
  const finishing = useRef(false);
  const { session } = run.drill;

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    onFinish();
  }, [onFinish]);

  const checkEnd = useCallback(() => {
    if (session.finished || (run.lines && session.itemsDone >= run.lines.length)) finish();
  }, [session, run.lines, finish]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (run.drill.kind === 'virtual') run.drill.session.tick();
      refresh();
    }, 200);
    return () => window.clearInterval(id);
  }, [run.drill, refresh]);

  const progress = run.lines
    ? Math.min(session.itemsDone / run.lines.length, 1)
    : Math.min(session.elapsedMs() / session.durationMs, 1);

  return (
    <div className={`drill${run.drill.kind === 'virtual' ? ' with-kb' : ''}`}>
      <div className="row">
        <span className="muted">{run.title}</span>
        <button type="button" className="btn" onClick={finish}>
          Terminar
        </button>
      </div>
      <div className="timebar">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      {run.drill.kind === 'virtual' ? (
        <VirtualPart run={run} session={run.drill.session} hint={run.drill.hint} refresh={refresh} checkEnd={checkEnd} />
      ) : (
        <SystemPart run={run} session={run.drill.session} refresh={refresh} checkEnd={checkEnd} />
      )}
    </div>
  );
}

/** Objetivo: kana coloreadas, referencia con kanji y lo siguiente. */
function Target({
  run,
  target,
  chars,
  states,
  upcoming,
  itemsDone,
}: {
  run: Run;
  target: string;
  chars: string[];
  states: KanaState[];
  upcoming: readonly string[];
  itemsDone: number;
}) {
  const colored = (
    <span className={`target-current${chars.length > 6 ? ' target-long' : ''}`}>
      {chars.map((k, i) => (
        <span key={i} className={`k k-${states[i] ?? 'pending'}`}>
          {k}
        </span>
      ))}
    </span>
  );

  if (run.lines) {
    const n = run.lines.length;
    const prev = itemsDone > 0 ? run.lines[(itemsDone - 1) % n] : null;
    const next = [1, 2].map((d) => itemsDone + d).filter((i) => i < n).map((i) => run.lines![i]!);
    return (
      <div className="lines" aria-live="polite">
        <p className="line line-prev">{prev ?? ' '}</p>
        {run.display.get(target) && <p className="target-ref">{run.display.get(target)}</p>}
        <div className="target target-multi">{colored}</div>
        {next.map((l, i) => (
          <p key={i} className="line line-next">
            {l}
          </p>
        ))}
        <p className="muted">
          Línea {Math.min(itemsDone + 1, n)} de {n}
        </p>
      </div>
    );
  }

  // kana sueltas: la cola en la misma línea; palabras y frases: solo la siguiente, debajo
  const single = chars.length === 1 && upcoming.every((u) => Array.from(u).length === 1);
  return (
    <>
      <p className="target-ref">{run.display.get(target) ?? ' '}</p>
      <div className={`target${single ? '' : ' target-multi'}`} aria-live="polite">
        {colored}
        {single && <span className="target-next">{upcoming.join('　')}</span>}
      </div>
      {!single && <p className="muted target-after">次: {upcoming[0]}</p>}
    </>
  );
}

function VirtualPart({
  run,
  session,
  hint,
  refresh,
  checkEnd,
}: {
  run: Run;
  session: DrillSession;
  hint: Parameters<typeof VirtualKeyboard>[0]['hint'];
  refresh: () => void;
  checkEnd: () => void;
}) {
  const [wrongFlash, setWrongFlash] = useState(0);

  function press(stroke: Stroke) {
    const r = session.press(stroke);
    if (r === 'wrong') {
      setWrongFlash((n) => n + 1);
      navigator.vibrate?.(30);
    }
    refresh();
    checkEnd();
  }

  return (
    <>
      <Target
        run={run}
        target={session.target}
        chars={session.kana}
        states={session.kanaStates()}
        upcoming={session.upcoming}
        itemsDone={session.itemsDone}
      />
      <div className="typed-line">
        <span className="typed-text">{session.typed}</span>
        {session.lastWrong && (
          <span key={wrongFlash} className="wrong-flash">
            {session.lastWrong}
          </span>
        )}
      </div>
      <p className="muted hint-line">
        {session.hintVisible && session.expected ? `Pista: ${strokeLabel(`${session.expected.key}:${session.expected.dir}`)}` : ' '}
      </p>
      {!session.started && <p className="muted">El tiempo empieza con el primer gesto.</p>}
      <VirtualKeyboard
        hint={hint}
        highlight={session.hintVisible ? session.expected : null}
        onKana={(_, stroke) => press(stroke)}
        onModifier={() => press(MOD_STROKE)}
        onBackspace={() => undefined}
      />
    </>
  );
}

/** Caracteres para colorear: los del objetivo tal cual (sin espacios) si cuadran con los comparados. */
function displayChars(target: string, compared: string[]): string[] {
  const raw = Array.from(target.replace(/\s+/g, ''));
  return raw.length === compared.length ? raw : compared;
}

function SystemPart({
  run,
  session,
  refresh,
  checkEnd,
}: {
  run: Run;
  session: SystemDrill;
  refresh: () => void;
  checkEnd: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef('');
  const [value, setValue] = useState('');

  const feed = useCallback(() => {
    const el = input.current;
    if (!el) return;
    const v = el.value;
    setValue(v);
    const { clear } = session.feed(v, composing.current);
    if (clear) {
      // tras el evento: vaciar dentro de compositionend puede no aplicarse en iOS
      window.setTimeout(() => {
        if (input.current && input.current.value === v && !composing.current) {
          input.current.value = '';
          setValue('');
          session.cleared();
        }
      }, 0);
    }
    refresh();
    checkEnd();
  }, [session, refresh, checkEnd]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const compared = session.currentChars();
  const message =
    session.state === 'converted'
      ? 'Has convertido a kanji: borra y confirma con 確定 sin elegir candidato.'
      : looksLikeRomaji(value)
        ? 'Eso parece el teclado inglés/romaji: cambia al teclado 日本語かな.'
        : session.state === 'wrong'
          ? 'Hay un error: bórralo para seguir.'
          : ' ';

  return (
    <>
      <Target
        run={run}
        target={session.current}
        chars={displayChars(session.current, compared)}
        states={session.kanaStates()}
        upcoming={session.upcoming}
        itemsDone={session.itemsDone}
      />
      <input
        ref={input}
        className={`sys-input${session.state === 'wrong' || session.state === 'converted' ? ' sys-wrong' : ''}`}
        lang="ja"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder="Toca aquí y escribe"
        aria-label="Escribe aquí con el teclado del móvil"
        onCompositionStart={() => {
          composing.current = '';
        }}
        onCompositionUpdate={(e) => {
          // el valor del input aún es el anterior: se compara en el evento input que sigue
          composing.current = e.data;
        }}
        onCompositionEnd={() => {
          composing.current = '';
          feed();
        }}
        onInput={(e) => {
          if (!(e.nativeEvent as InputEvent).isComposing) composing.current = '';
          feed();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
      />
      <p className={`hint-line${session.state === 'ok' || session.state === 'partial' ? ' muted' : ' sys-msg'}`}>{message}</p>
      {!session.started && <p className="muted">El tiempo empieza al escribir. Puedes encadenar varios objetivos sin confirmar.</p>}
    </>
  );
}
