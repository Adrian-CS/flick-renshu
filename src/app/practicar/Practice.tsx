'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DrillSession } from '@/lib/drill';
import { SystemDrill } from '@/lib/systemDrill';
import { PHASE_LABEL, displayMap, getLesson, lessonPool, lessonStrokeIds, type Lesson, type PhaseId } from '@/lib/lessons';
import { loadWords, type WordRow } from '@/lib/words';
import { Attribution } from '@/components/Attribution';
import { autoHintLevel, pickWeighted, type StrokeStat } from '@/lib/stats';
import { getSettings, loadStats, saveSettings } from '@/lib/db';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings';
import { Runner } from '@/components/drill/Runner';
import { Summary } from '@/components/drill/Summary';
import { KeyboardChoice } from '@/components/drill/KeyboardChoice';
import { finishRun, sessionKey, type Result, type Run } from '@/components/drill/run';

export function Practice() {
  const params = useSearchParams();
  const lesson = getLesson(params.get('l') ?? '');
  if (!lesson) {
    return (
      <>
        <h1>Lección no encontrada</h1>
        <Link href="/lecciones/">← Lecciones</Link>
      </>
    );
  }
  return <LessonPractice lesson={lesson} />;
}

function LessonPractice({ lesson }: { lesson: Lesson }) {
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<{ result: Result; system: boolean } | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined);
  }, []);

  function setKeyboard(keyboard: Settings['keyboard']) {
    const next = { ...settings, keyboard };
    setSettings(next);
    void saveSettings(next);
  }

  async function start(p: PhaseId) {
    const stats = await loadStats().catch(() => new Map<string, StrokeStat>());
    let words: WordRow[] = [];
    if (lesson.needsWords) {
      try {
        words = (await loadWords()).words;
      } catch {
        setLoadError('No se ha podido cargar la lista de palabras. Abre la app una vez con conexión.');
        return;
      }
    }
    setLoadError(null);
    const pool = lessonPool(lesson.id, p, words);
    if (pool.items.length === 0) {
      setLoadError('Esta lección no tiene elementos.');
      return;
    }
    const next = (prev: string | undefined) => pickWeighted(pool.items, { stats, focus: pool.focus, avoid: prev });
    const durationMs = settings.durationMin * 60000;
    const drill: Run['drill'] =
      settings.keyboard === 'system'
        ? { kind: 'system', session: new SystemDrill({ next, durationMs }) }
        : {
            kind: 'virtual',
            session: new DrillSession({ next, durationMs, hintDelayMs: settings.hintDelayMs }),
            hint: settings.hintMode === 'auto' ? autoHintLevel(lessonStrokeIds(lesson.id), stats) : settings.hintMode,
          };
    setRun({
      drill,
      key: sessionKey(`${lesson.id}/${p}`, settings.keyboard),
      title: `${lesson.title} · ${PHASE_LABEL[p]}${settings.keyboard === 'system' ? ' · teclado del sistema' : ''}`,
      startedAt: Date.now(),
      display: displayMap(lesson.id, words),
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
        <h1>{lesson.title}</h1>
        <Link href="/lecciones/">← Lecciones</Link>
      </div>
      <p className="muted">{lesson.subtitle}</p>

      {result && <Summary result={result.result} showHints={!result.system} />}
      {loadError && <p className="note">{loadError}</p>}

      <h2>{result ? 'Otra vez' : 'Empezar'}</h2>
      <ul className="links">
        {lesson.phases.map((p) => (
          <li key={p}>
            <button type="button" className="link-btn" onClick={() => void start(p)}>
              {PHASE_LABEL[p]}
              <small>{phaseHelp(lesson, p)}</small>
            </button>
          </li>
        ))}
      </ul>
      <KeyboardChoice value={settings.keyboard} onChange={setKeyboard} />
      {lesson.needsWords && <Attribution />}
      <p className="muted">
        {settings.durationMin} min · {settings.hintMode === 'auto' ? 'etiquetas automáticas' : 'etiquetas fijas'} · ajustes en
        Lecciones
      </p>
    </>
  );
}

function phaseHelp(lesson: Lesson, p: PhaseId): string {
  if (lesson.group === 4) return lesson.subtitle;
  const items = lessonPool(lesson.id, p).items;
  return items.slice(0, 12).join(' ') + (items.length > 12 ? ' …' : '');
}
