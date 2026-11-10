'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { VirtualKeyboard } from '@/components/VirtualKeyboard';
import { DrillSession, type DrillMetrics } from '@/lib/drill';
import { PHASE_LABEL, displayMap, getLesson, lessonPool, lessonStrokeIds, type Lesson, type PhaseId } from '@/lib/lessons';
import { loadWords, type WordRow } from '@/lib/words';
import { Attribution } from '@/components/Attribution';
import { autoHintLevel, pickWeighted, troubleStrokes, type StrokeStat } from '@/lib/stats';
import { getSettings, loadStats, saveSession, sessionsFor, type SessionRecord } from '@/lib/db';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings';
import type { HintLevel } from '@/lib/hints';
import { MOD_STROKE, type Stroke } from '@/lib/kana';
import { strokeLabel } from '@/lib/labels';
import { compareSessions, formatDelta } from '@/lib/summary';

type Screen =
  | { kind: 'ready' }
  | { kind: 'running'; session: DrillSession; hint: HintLevel; lessonKey: string; startedAt: number; display: Map<string, string> }
  | { kind: 'summary'; metrics: DrillMetrics; prev?: SessionRecord; weak: StrokeStat[]; lessonKey: string };

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
  const [phase, setPhase] = useState<PhaseId>(lesson.phases[0]!);
  const [screen, setScreen] = useState<Screen>({ kind: 'ready' });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, rerender] = useState(0);
  const refresh = useCallback(() => rerender((n) => n + 1), []);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined);
  }, []);

  async function start(p: PhaseId) {
    setPhase(p);
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
    const session = new DrillSession({
      next: (prev) => pickWeighted(pool.items, { stats, focus: pool.focus, avoid: prev }),
      durationMs: settings.durationMin * 60000,
      hintDelayMs: settings.hintDelayMs,
    });
    const hint = settings.hintMode === 'auto' ? autoHintLevel(lessonStrokeIds(lesson.id), stats) : settings.hintMode;
    setScreen({
      kind: 'running',
      session,
      hint,
      lessonKey: `${lesson.id}/${p}`,
      startedAt: Date.now(),
      display: displayMap(lesson.id, words),
    });
  }

  async function finish(running: Extract<Screen, { kind: 'running' }>) {
    const { session, lessonKey, startedAt } = running;
    session.stop();
    const metrics = session.metrics();
    const deltas = session.strokeDeltas();
    const prev = (await sessionsFor(lessonKey).catch(() => []))[0];
    if (metrics.kana > 0) await saveSession({ ...metrics, lessonKey, startedAt }, deltas).catch(() => undefined);
    setScreen({ kind: 'summary', metrics, prev, weak: troubleStrokes(deltas), lessonKey });
  }

  if (screen.kind === 'running') {
    return <Running lesson={lesson} phase={phase} screen={screen} refresh={refresh} onFinish={() => finish(screen)} />;
  }

  return (
    <>
      <div className="row">
        <h1>{lesson.title}</h1>
        <Link href="/lecciones/">← Lecciones</Link>
      </div>
      <p className="muted">{lesson.subtitle}</p>

      {screen.kind === 'summary' && <Summary screen={screen} />}
      {loadError && <p className="note">{loadError}</p>}

      <h2>{screen.kind === 'summary' ? 'Otra vez' : 'Empezar'}</h2>
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
  const sample = items.slice(0, 12).join(' ') + (items.length > 12 ? ' …' : '');
  return sample;
}

function Running({
  lesson,
  phase,
  screen,
  refresh,
  onFinish,
}: {
  lesson: Lesson;
  phase: PhaseId;
  screen: Extract<Screen, { kind: 'running' }>;
  refresh: () => void;
  onFinish: () => void;
}) {
  const { session } = screen;
  const [wrongFlash, setWrongFlash] = useState(0);
  const finishing = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      session.tick();
      refresh();
    }, 200);
    return () => window.clearInterval(id);
  }, [session, refresh]);

  function press(stroke: Stroke) {
    const r = session.press(stroke);
    if (r === 'wrong') {
      setWrongFlash((n) => n + 1);
      navigator.vibrate?.(30);
    }
    refresh();
    if (session.finished && !finishing.current) {
      finishing.current = true;
      onFinish();
    }
  }

  const progress = Math.min(session.elapsedMs() / session.durationMs, 1);
  const states = session.kanaStates();
  // kana sueltas: la cola en la misma línea; palabras y frases: solo la siguiente, debajo
  const single = session.kana.length === 1 && session.upcoming.every((u) => Array.from(u).length === 1);

  return (
    <div className="with-kb drill">
      <div className="row">
        <span className="muted">
          {lesson.title} · {PHASE_LABEL[phase]}
        </span>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (finishing.current) return;
            finishing.current = true;
            onFinish();
          }}
        >
          Terminar
        </button>
      </div>
      <div className="timebar">
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <p className="target-ref">{screen.display.get(session.target) ?? '\u00a0'}</p>
      <div className={`target${single ? '' : ' target-multi'}`} aria-live="polite">
        <span className={`target-current${session.kana.length > 6 ? ' target-long' : ''}`}>
          {session.kana.map((k, i) => (
            <span key={i} className={`k k-${states[i]}`}>
              {k}
            </span>
          ))}
        </span>
        {single && <span className="target-next">{session.upcoming.join('　')}</span>}
      </div>
      {!single && <p className="muted target-after">次: {session.upcoming[0]}</p>}

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
      {!session.started && <p className="muted">Escribe la kana de arriba. El tiempo empieza con el primer gesto.</p>}

      <VirtualKeyboard
        hint={screen.hint}
        highlight={session.hintVisible ? session.expected : null}
        onKana={(_, stroke) => press(stroke)}
        onModifier={() => press(MOD_STROKE)}
        onBackspace={() => undefined}
      />
    </div>
  );
}

function Summary({ screen }: { screen: Extract<Screen, { kind: 'summary' }> }) {
  const { metrics: m, prev, weak } = screen;
  const cmp = compareSessions(m, prev);
  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Resumen</h2>
      <div className="stats">
        <Stat label="kana/min" value={m.kpm.toLocaleString('es-ES')} delta={cmp && formatDelta(cmp.kpm)} good={cmp ? cmp.kpm >= 0 : null} />
        <Stat
          label="precisión"
          value={`${Math.round(m.accuracy * 100)} %`}
          delta={cmp && formatDelta(cmp.accuracy, ' pt')}
          good={cmp ? cmp.accuracy >= 0 : null}
        />
        <Stat label="pistas" value={String(m.hints)} delta={cmp && formatDelta(cmp.hints)} good={cmp ? cmp.hints <= 0 : null} />
        <Stat label="kana" value={String(m.kana)} />
      </div>
      {cmp ? <p className="muted">Comparado con la sesión anterior de esta fase.</p> : <p className="muted">Primera sesión de esta fase.</p>}
      {weak.length > 0 && (
        <>
          <p className="label">Para repasar</p>
          <ul className="weak">
            {weak.map((s) => (
              <li key={s.id}>
                {strokeLabel(s.id)}{' '}
                <span className="muted">
                  {s.errors > 0 && `${s.errors} fallo${s.errors > 1 ? 's' : ''}`}
                  {s.errors > 0 && s.hints > 0 && ' · '}
                  {s.hints > 0 && `${s.hints} pista${s.hints > 1 ? 's' : ''}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, delta, good }: { label: string; value: string; delta?: string | null; good?: boolean | null }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {delta && <span className={`stat-delta ${good ? 'up' : 'down'}`}>{delta}</span>}
    </div>
  );
}
