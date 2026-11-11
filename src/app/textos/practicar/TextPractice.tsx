'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DrillSession } from '@/lib/drill';
import { SystemDrill } from '@/lib/systemDrill';
import { getSettings, getText, saveSettings, saveText } from '@/lib/db';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings';
import { canUseVirtual, textLines, virtualLine, type TextRecord } from '@/lib/texts';
import {
  KARAOKE_MODE_LABEL, formatClock, formatLrc, onTime, shiftTimes, startPosition, validTimes, type KaraokeMode,
} from '@/lib/karaoke';
import { Runner } from '@/components/drill/Runner';
import { Summary } from '@/components/drill/Summary';
import { KeyboardChoice } from '@/components/drill/KeyboardChoice';
import { finishRun, sessionKey, type Result, type Run } from '@/components/drill/run';
import { parseYoutubeId, parseYoutubeStart } from '@/lib/youtube';
import { useSong } from './Song';
import { Sync } from './Sync';
import { KaraokeBar, type KaraokeLog } from './KaraokeBar';

/** Sin límite de tiempo: la sesión acaba al escribir todas las líneas (o al pulsar Terminar). */
const NO_LIMIT = Number.MAX_SAFE_INTEGER;

function sequence(items: readonly string[]): (prev: string | undefined) => string {
  let i = 0;
  return () => items[i++ % items.length]!;
}

export function TextPractice() {
  const id = Number(useSearchParams().get('id'));
  const [text, setText] = useState<TextRecord | null | undefined>(undefined);
  useEffect(() => {
    getText(id)
      .then((t) => setText(t ?? null))
      .catch(() => setText(null));
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
  return <TextPracticeFor text={text} onChange={setText} />;
}

function TextPracticeFor({ text, onChange }: { text: TextRecord; onChange: (t: TextRecord) => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<KaraokeMode>('free');
  const [syncing, setSyncing] = useState(false);
  const [running, setRunning] = useState<{ run: Run; extra?: ReactNode; log?: KaraokeLog } | null>(null);
  const [result, setResult] = useState<{ result: Result; system: boolean; extra?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const song = useSong(text.id!, text.youtubeId, text.youtubeStartMs ?? 0);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => undefined);
  }, []);

  const lines = textLines(text.body);
  const virtualOk = canUseVirtual(lines);
  const keyboard = virtualOk ? settings.keyboard : 'system';
  const timed = validTimes(text.timings, lines.length);
  const effectiveMode: KaraokeMode = timed ? mode : 'free';

  async function updateText(patch: Partial<TextRecord>) {
    const next = { ...text, ...patch, updatedAt: Date.now() };
    await saveText(next);
    onChange(next);
  }

  function applyLink() {
    const id = parseYoutubeId(link);
    if (!id) {
      setLinkError('No parece un enlace de YouTube.');
      return;
    }
    setLinkError(null);
    setLink('');
    void updateText({ youtubeId: id, youtubeStartMs: parseYoutubeStart(link) ?? 0 });
  }

  /** «La canción empieza aquí»: guarda la posición del vídeo y mueve los tiempos para que sigan cuadrando. */
  function setSongStart(ms: number) {
    const old = text.youtubeStartMs ?? 0;
    const next = Math.max(0, Math.round(ms));
    void updateText({ youtubeStartMs: next, timings: text.timings ? shiftTimes(text.timings, old - next) : undefined });
  }

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
    const run: Run = {
      drill,
      key: sessionKey(`text:${text.id}`, keyboard),
      title: text.title,
      startedAt: Date.now(),
      display: new Map(),
      lines: part,
    };

    if (effectiveMode === 'free' || !timed) {
      setRunning({ run });
      return;
    }
    // la canción arranca aquí, dentro del toque (iOS solo deja reproducir audio tras un gesto)
    const source = song.makeSource();
    source.seek(startPosition(text.timings!, from));
    source.play();
    const log: KaraokeLog = { completedAt: [], waits: 0 };
    const extra = (
      <KaraokeBar
        source={source}
        times={text.timings!}
        lines={lines}
        from={from}
        mode={effectiveMode}
        done={() => drill.session.itemsDone}
        finished={() => drill.session.finished || drill.session.itemsDone >= part.length}
        log={log}
      />
    );
    setRunning({ run, extra, log });
  }

  // el reproductor se monta una vez y sigue ahí en todas las pantallas (mismo sitio del árbol)
  const video = text.youtubeId ? (
    <div className={`video-wrap${running ? ' video-small' : ''}`}>
      <div className="video" ref={song.youtube.host} />
      {song.youtube.error && <p className="note">{song.youtube.error}</p>}
    </div>
  ) : null;

  if (syncing) {
    return withVideo(
      video,
      <Sync
        lines={lines}
        makeSource={song.makeSource}
        withAudio={song.kind !== 'clock'}
        onCancel={() => setSyncing(false)}
        onSave={(times) => {
          void updateText({ timings: times }).then(() => {
            setSyncing(false);
            setMode('karaoke');
          });
        }}
      />,
    );
  }

  if (running) {
    const { run, log } = running;
    return withVideo(
      video,
      <Runner
        run={run}
        extra={running.extra}
        onFinish={() => {
          void finishRun(run).then((r) => {
            let extra: string | undefined;
            if (log && effectiveMode === 'karaoke') {
              // completedAt es disperso (índices absolutos): forEach salta los huecos
              let total = 0;
              let ok = 0;
              log.completedAt.forEach((t, i) => {
                total++;
                if (onTime(text.timings!, i, t)) ok++;
              });
              extra = `Líneas a tiempo: ${ok} de ${total}`;
            } else if (log && effectiveMode === 'wait') {
              extra = log.waits === 0 ? 'La canción no ha tenido que esperarte.' : `La canción te ha esperado ${log.waits} ${log.waits === 1 ? 'vez' : 'veces'}.`;
            }
            setResult({ result: r, system: run.drill.kind === 'system', extra });
            setRunning(null);
          });
        }}
      />,
    );
  }

  return withVideo(
    video,
    <>
      <div className="row">
        <h1>{text.title}</h1>
        <Link href="/textos/">← Mis textos</Link>
      </div>

      {result && (
        <Summary result={result.result} showHints={!result.system} extra={result.extra && <p className="karaoke-result">{result.extra}</p>} />
      )}

      <KeyboardChoice value={settings.keyboard} onChange={setKeyboard} systemOnly={!virtualOk} />

      <p className="label">Modo</p>
      <div className="seg">
        {(Object.keys(KARAOKE_MODE_LABEL) as KaraokeMode[]).map((m) => (
          <button type="button" key={m} aria-pressed={effectiveMode === m} disabled={m !== 'free' && !timed} onClick={() => setMode(m)}>
            {KARAOKE_MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="muted">
        {effectiveMode === 'free' && (timed ? 'Sin canción: cada línea cuando termines la anterior.' : 'Para el karaoke, sincroniza antes los tiempos (abajo).')}
        {effectiveMode === 'karaoke' && 'La canción sigue sola; al final verás cuántas líneas escribiste a tiempo.'}
        {effectiveMode === 'wait' && 'La canción se para al llegar a la línea siguiente hasta que termines la actual.'}
        {effectiveMode !== 'free' && song.kind === 'clock' && ' Sin vídeo ni audio: pon la canción en otra app a la vez que pulsas Empezar.'}
      </p>

      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!song.ready} onClick={() => start(0)}>
          Empezar desde el principio
        </button>
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Canción</h2>
        <p className="label">Vídeo de YouTube</p>
        {text.youtubeId ? (
          <>
            <p className="muted">
              La canción empieza en {formatClock(text.youtubeStartMs ?? 0)} del vídeo. Si tiene intro, ponlo en el momento en
              que empieza la música y pulsa «La canción empieza aquí».
            </p>
            <div className="actions">
              <button type="button" className="btn" disabled={!song.youtube.ready} onClick={() => setSongStart(song.youtube.currentMs())}>
                La canción empieza aquí
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void updateText({ youtubeId: undefined, youtubeStartMs: undefined })}>
                Quitar vídeo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="actions">
              <input
                className="text-title"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Pega el enlace (youtube.com, youtu.be, Music…)"
                inputMode="url"
              />
              <button type="button" className="btn" disabled={!link.trim()} onClick={applyLink}>
                Usar vídeo
              </button>
            </div>
            {linkError && <p className="sys-msg">{linkError}</p>}
            <p className="muted">Necesita conexión. Si el autor no deja incrustarlo, prueba otro vídeo de la canción.</p>
          </>
        )}

        <p className="label">O un fichero de audio</p>
        <p className="muted">
          {song.audioName ?? 'Ninguno'}
          {song.audioName && text.youtubeId ? ' (con vídeo se usa el vídeo)' : ''}. Se guarda solo en este móvil, funciona
          sin conexión y no va en la copia de seguridad. Sin vídeo ni audio se usa un cronómetro.
        </p>
        <div className="actions">
          <label className="btn">
            {song.audioName ? 'Cambiar audio' : 'Añadir audio'}
            <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && void song.setAudio(e.target.files[0])} />
          </label>
          {song.audioName && (
            <button type="button" className="btn btn-danger" onClick={() => void song.removeAudio()}>
              Quitar audio
            </button>
          )}
        </div>
        <p className="muted">
          Tiempos: {timed ? `sincronizados (primera línea en ${formatClock(text.timings![0]!)})` : 'sin sincronizar'}.
        </p>
        <div className="actions">
          <button type="button" className="btn" disabled={!song.ready} onClick={() => setSyncing(true)}>
            {timed ? 'Sincronizar de nuevo' : 'Sincronizar'}
          </button>
          {timed && (
            <>
              <button type="button" className="btn" onClick={() => void updateText({ timings: shiftTimes(text.timings!, -500) })}>
                −0,5 s
              </button>
              <button type="button" className="btn" onClick={() => void updateText({ timings: shiftTimes(text.timings!, 500) })}>
                +0,5 s
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void navigator.clipboard?.writeText(formatLrc(lines, text.timings!)).then(() => setCopied(true));
                }}
              >
                {copied ? 'LRC copiado' : 'Copiar LRC'}
              </button>
            </>
          )}
        </div>
        {timed && <p className="muted">−0,5 s: las líneas salen antes; +0,5 s: después.</p>}
      </section>

      <p className="label">O toca una línea para empezar desde ella</p>
      <ol className="text-lines">
        {lines.map((l, i) => (
          <li key={i}>
            <button type="button" disabled={!song.ready} onClick={() => start(i)}>
              {timed && <span className="muted">{formatClock(text.timings![i]!)} </span>}
              {l}
            </button>
          </li>
        ))}
      </ol>
    </>,
  );
}

function withVideo(video: ReactNode, content: ReactNode) {
  return (
    <>
      {video}
      {content}
    </>
  );
}
