'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DrillSession } from '@/lib/drill';
import { SystemDrill } from '@/lib/systemDrill';
import { getSettings, getText, saveSettings } from '@/lib/db';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings';
import { canUseVirtual, textLines, virtualLine, type TextRecord } from '@/lib/texts';
import { Runner } from '@/components/drill/Runner';
import { Summary } from '@/components/drill/Summary';
import { KeyboardChoice } from '@/components/drill/KeyboardChoice';
import { finishRun, sessionKey, type Result, type Run } from '@/components/drill/run';

/** Sin límite de tiempo: la sesión acaba al escribir todas las líneas (o al pulsar Terminar). */
const NO_LIMIT = Number.MAX_SAFE_INTEGER;

function sequence(items: readonly string[]): (prev: string | undefined) => string {
  let i = 0;
  return () => items[i++ % items.length]!;
}

export function TextPractice() {
  const id = Number(useSearchParams().get('id'));
  const [text, setText] = useState<TextRecord | null | undefined>(undefined);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<{ result: Result; system: boolean } | null>(null);

  useEffect(() => {
    getText(id)
      .then((t) => setText(t ?? null))
      .catch(() => setText(null));
    getSettings().then(setSettings).catch(() => undefined);
  }, [id]);

  if (text === undefined) return <p className="muted">Cargando…</p>;
  if (text === null) {
    return (
      <>
        <h1>Texto no encontrado</h1>
        <Link href="/textos/">← Mis textos</Link>
      </>
    );
  }

  const lines = textLines(text.body);
  const virtualOk = canUseVirtual(lines);
  const keyboard = virtualOk ? settings.keyboard : 'system';

  function setKeyboard(k: Settings['keyboard']) {
    const next = { ...settings, keyboard: k };
    setSettings(next);
    void saveSettings(next);
  }

  function start(from: number) {
    const part = lines.slice(from);
    const drill: Run['drill'] =
      keyboard === 'system'
        ? { kind: 'system', session: new SystemDrill({ next: sequence(part), durationMs: NO_LIMIT }) }
        : {
            kind: 'virtual',
            session: new DrillSession({
              next: sequence(part.map((l) => virtualLine(l)!)),
              durationMs: NO_LIMIT,
              hintDelayMs: settings.hintDelayMs,
            }),
            hint: settings.hintMode === 'auto' ? 'row' : settings.hintMode,
          };
    setRun({
      drill,
      key: sessionKey(`text:${text!.id}`, keyboard),
      title: text!.title,
      startedAt: Date.now(),
      display: new Map(),
      lines: part,
    });
  }

  if (run) {
    return (
      <Runner
        run={run}
        onFinish={() => {
          void finishRun(run).then((r) => {
            setResult({ result: r, system: run.drill.kind === 'system' });
            setRun(null);
          });
        }}
      />
    );
  }

  return (
    <>
      <div className="row">
        <h1>{text.title}</h1>
        <Link href="/textos/">← Mis textos</Link>
      </div>

      {result && <Summary result={result.result} showHints={!result.system} />}

      <KeyboardChoice value={settings.keyboard} onChange={setKeyboard} systemOnly={!virtualOk} />

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => start(0)}>
          Empezar desde el principio
        </button>
      </div>
      <p className="label">O toca una línea para empezar desde ella</p>
      <ol className="text-lines">
        {lines.map((l, i) => (
          <li key={i}>
            <button type="button" onClick={() => start(i)}>
              {l}
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
