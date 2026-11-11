'use client';
import { useEffect, useState } from 'react';
import { formatClock, lineAt, shouldWait, type KaraokeMode, type TimeSource } from '@/lib/karaoke';

/** Lo que se va apuntando durante la sesión, para el resumen. */
export interface KaraokeLog {
  /** Tiempo de la canción al terminar cada línea (índice absoluto). */
  completedAt: number[];
  waits: number;
}

/**
 * Lleva la canción durante la sesión: en «te espera» la pausa al llegar a la línea siguiente
 * y la reanuda al terminar la actual; apunta cuándo se termina cada línea.
 */
export function KaraokeBar({
  source,
  times,
  lines,
  from,
  mode,
  done,
  finished,
  log,
}: {
  source: TimeSource;
  times: readonly number[];
  lines: readonly string[];
  /** Línea (absoluta) desde la que se empezó. */
  from: number;
  mode: Exclude<KaraokeMode, 'free'>;
  /** Líneas terminadas en esta sesión. */
  done: () => number;
  finished: () => boolean;
  log: KaraokeLog;
}) {
  const [, tick] = useState(0);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let lastDone = done();
    let wait = false;
    const id = window.setInterval(() => {
      const t = source.now();
      const d = done();
      for (let i = lastDone; i < d; i++) log.completedAt[from + i] = t;
      lastDone = d;
      if (finished()) {
        source.pause();
      } else if (mode === 'wait') {
        const must = shouldWait(times, from + d, t);
        if (must && source.playing && !wait) {
          source.pause();
          wait = true;
          log.waits++;
          setWaiting(true);
        } else if (!must && wait) {
          wait = false;
          setWaiting(false);
          source.play();
        }
      }
      tick((n) => n + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, [source, times, from, mode, done, finished, log]);

  useEffect(() => () => source.pause(), [source]);

  const t = source.now();
  const sung = lineAt(times, t);
  const typing = from + done();
  const behind = sung - typing;

  let status: string;
  if (waiting) status = 'La canción te espera: termina la línea.';
  else if (sung < from) status = 'Ya empieza…';
  else if (mode === 'karaoke' && behind > 0) status = `Vas ${behind} línea${behind > 1 ? 's' : ''} por detrás`;
  else status = '\u00a0';

  return (
    <div className="karaoke-bar">
      <div className="row">
        <span className="karaoke-time">♪ {formatClock(t)}</span>
        <button
          type="button"
          className="btn"
          disabled={waiting}
          onClick={() => (source.playing ? source.pause() : source.play())}
        >
          {source.playing || waiting ? 'Pausa' : 'Seguir'}
        </button>
      </div>
      <p className={`karaoke-status${behind > 0 && mode === 'karaoke' ? ' behind' : ''}`}>{status}</p>
      {sung >= 0 && sung !== typing && <p className="karaoke-sung">♪ {lines[sung]}</p>}
    </div>
  );
}
