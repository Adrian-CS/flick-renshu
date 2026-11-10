'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GROUP_LABEL, LESSONS, lessonStrokeIds, type Lesson } from '@/lib/lessons';
import { mastery, type StrokeStat } from '@/lib/stats';
import { getSettings, loadStats, saveSettings } from '@/lib/db';
import { DURATION_OPTIONS, HINT_DELAY_OPTIONS, type Settings } from '@/lib/settings';
import { HINT_LEVELS, HINT_LEVEL_LABEL } from '@/lib/hints';
import { Attribution } from '@/components/Attribution';

const GROUPS = [1, 2, 3, 4] as const;

export function LessonList() {
  const [stats, setStats] = useState<Map<string, StrokeStat> | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadStats().then(setStats).catch(() => setStats(new Map()));
    getSettings().then(setSettings).catch(() => undefined);
  }, []);

  function update(patch: Partial<Settings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    void saveSettings(next);
  }

  return (
    <>
      <div className="row">
        <h1>レッスン</h1>
        <Link href="/">← Inicio</Link>
      </div>

      {GROUPS.map((g) => (
        <section key={g}>
          <h2>
            {g}. {GROUP_LABEL[g]}
          </h2>
          <ul className="links lesson-grid">
            {LESSONS.filter((l) => l.group === g).map((l) => (
              <LessonItem key={l.id} lesson={l} stats={stats} />
            ))}
          </ul>
        </section>
      ))}
      <Attribution />

      {settings && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Ajustes</h2>
          <p className="label">Duración de la sesión</p>
          <div className="seg">
            {DURATION_OPTIONS.map((d) => (
              <button type="button" key={d} aria-pressed={settings.durationMin === d} onClick={() => update({ durationMin: d })}>
                {d} min
              </button>
            ))}
          </div>
          <p className="label">Etiquetas de las teclas</p>
          <div className="seg">
            <button type="button" aria-pressed={settings.hintMode === 'auto'} onClick={() => update({ hintMode: 'auto' })}>
              Automático
            </button>
            {HINT_LEVELS.map((l) => (
              <button type="button" key={l} aria-pressed={settings.hintMode === l} onClick={() => update({ hintMode: l })}>
                {HINT_LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
          <p className="muted">Automático: 5 kana al principio, solo あ cuando la lección va bien, sin etiqueta al dominarla.</p>
          <p className="label">Señalar el gesto si dudas más de</p>
          <div className="seg">
            {HINT_DELAY_OPTIONS.map((ms) => (
              <button type="button" key={ms} aria-pressed={settings.hintDelayMs === ms} onClick={() => update({ hintDelayMs: ms })}>
                {(ms / 1000).toLocaleString('es-ES')} s
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function LessonItem({ lesson, stats }: { lesson: Lesson; stats: Map<string, StrokeStat> | null }) {
  const m = stats ? mastery(lessonStrokeIds(lesson.id), stats) : 0;
  return (
    <li>
      <Link href={`/practicar/?l=${lesson.id}`}>
        <span className="lesson-title">{lesson.title}</span>
        <small>{lesson.subtitle}</small>
        <span className="meter" aria-label={`dominio ${Math.round(m * 100)} %`}>
          <span style={{ width: `${Math.round(m * 100)}%` }} />
        </span>
      </Link>
    </li>
  );
}
