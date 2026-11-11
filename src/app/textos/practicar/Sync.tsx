'use client';
import { useEffect, useRef, useState } from 'react';
import { formatClock, type TimeSource } from '@/lib/karaoke';

/** Sincronizar a mano: suena la canción y se toca cuando empieza cada línea. */
export function Sync({
  lines,
  makeSource,
  withAudio,
  onSave,
  onCancel,
}: {
  lines: readonly string[];
  makeSource: () => TimeSource;
  /** La canción suena en la app (vídeo o audio). */
  withAudio: boolean;
  onSave: (times: number[]) => void;
  onCancel: () => void;
}) {
  const source = useRef<TimeSource | null>(null);
  const [times, setTimes] = useState<number[]>([]);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 200);
    return () => {
      window.clearInterval(id);
      source.current?.pause();
    };
  }, []);

  const started = source.current !== null;
  const next = times.length;
  const done = next >= lines.length;

  function start() {
    const s = makeSource();
    s.seek(0);
    s.play();
    source.current = s;
    setTimes([]);
  }

  function mark() {
    if (!source.current || done) return;
    const t = Math.round(source.current.now());
    setTimes((ts) => [...ts, Math.max(t, ts[ts.length - 1] ?? 0)]);
  }

  return (
    <>
      <div className="row">
        <h1>Sincronizar</h1>
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      <p className="muted">
        {withAudio
          ? 'Pulsa Empezar y toca el botón grande justo cuando empiece a cantarse cada línea.'
          : 'Pulsa Empezar a la vez que pones la canción en otra app, y toca el botón grande cuando empiece cada línea.'}
      </p>

      {!started ? (
        <button type="button" className="btn btn-primary" onClick={start}>
          ▶ Empezar
        </button>
      ) : (
        <>
          <p className="sync-clock">♪ {formatClock(source.current!.now())}</p>
          {!done ? (
            <button type="button" className="sync-mark" onPointerDown={mark}>
              <small>Empieza la línea {next + 1}</small>
              {lines[next]}
            </button>
          ) : (
            <p className="note">Todas las líneas marcadas.</p>
          )}
          <div className="actions">
            <button type="button" className="btn" disabled={times.length === 0} onClick={() => setTimes((ts) => ts.slice(0, -1))}>
              Deshacer la última
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => (source.current!.playing ? source.current!.pause() : source.current!.play())}
            >
              {source.current!.playing ? 'Pausa' : 'Seguir'}
            </button>
            <button type="button" className="btn btn-primary" disabled={!done} onClick={() => onSave(times)}>
              Guardar
            </button>
          </div>
          <ol className="text-lines sync-list">
            {lines.map((l, i) => (
              <li key={i} className={i < next ? 'sync-done' : i === next ? 'sync-next' : ''}>
                {i < next && <span className="muted">{formatClock(times[i]!)} </span>}
                {l}
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
