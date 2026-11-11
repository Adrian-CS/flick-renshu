'use client';
/**
 * YouTube IFrame Player API (https://developers.google.com/youtube/iframe_api_reference),
 * tipada a mano: solo lo que usa el karaoke. Adaptado de HangulTraining.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { TimeSource } from '@/lib/karaoke';

interface YTPlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
        onError: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
const BUFFERING = 3;

let apiPromise: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('No se pudo cargar YouTube (¿sin conexión?).'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

const ERRORS: Record<number, string> = {
  2: 'El enlace del vídeo no es válido.',
  5: 'Este navegador no puede reproducir el vídeo.',
  100: 'El vídeo no existe o es privado.',
  101: 'El autor no permite verlo fuera de YouTube. Prueba con otro vídeo de la misma canción (audio oficial, lyrics…).',
  150: 'El autor no permite verlo fuera de YouTube. Prueba con otro vídeo de la misma canción (audio oficial, lyrics…).',
};

/** El vídeo como fuente de tiempo; el tiempo cuenta desde `startMs` del vídeo (donde empieza la canción). */
class YouTubeSource implements TimeSource {
  /** El iframe informa del tiempo unas pocas veces por segundo: se extrapola entre medias. */
  private sample = { t: 0, at: 0 };

  constructor(
    private readonly player: RefObject<YTPlayer | null>,
    private readonly startMs: number,
  ) {}

  get playing(): boolean {
    const s = this.player.current?.getPlayerState();
    return s === PLAYING || s === BUFFERING;
  }

  /** Tiempo del vídeo (ms). */
  videoNow(): number {
    const p = this.player.current;
    if (!p) return 0;
    const reported = p.getCurrentTime() * 1000;
    if (reported !== this.sample.t) this.sample = { t: reported, at: performance.now() };
    if (p.getPlayerState() !== PLAYING) return reported;
    return this.sample.t + Math.min(performance.now() - this.sample.at, 1000);
  }

  now(): number {
    return this.videoNow() - this.startMs;
  }

  play(): void {
    this.player.current?.playVideo();
  }

  pause(): void {
    this.player.current?.pauseVideo();
  }

  seek(ms: number): void {
    const v = Math.max(0, ms + this.startMs);
    this.player.current?.seekTo(v / 1000, true);
    this.sample = { t: v, at: performance.now() };
  }
}

export interface YouTubeVideo {
  host: RefObject<HTMLDivElement | null>;
  ready: boolean;
  error: string | null;
  makeSource: (startMs: number) => TimeSource;
  /** Posición actual del vídeo (ms), para «la canción empieza aquí». */
  currentMs: () => number;
}

export function useYouTube(videoId: string | undefined): YouTubeVideo {
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReady(false);
    setError(null);
    if (!videoId) return;
    let live = true;
    let p: YTPlayer | null = null;
    void loadApi()
      .then((YT) => {
        if (!live || !host.current) return;
        const el = document.createElement('div');
        host.current.replaceChildren(el);
        p = new YT.Player(el, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: () => live && setReady(true),
            onStateChange: () => undefined,
            onError: (e) => live && setError(ERRORS[e.data] ?? `YouTube dio un error (${e.data}).`),
          },
        });
        player.current = p;
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'No se pudo cargar YouTube.'));
    return () => {
      live = false;
      p?.destroy();
      player.current = null;
    };
  }, [videoId]);

  return {
    host,
    ready,
    error,
    makeSource: (startMs) => new YouTubeSource(player, startMs),
    currentMs: () => (player.current ? player.current.getCurrentTime() * 1000 : 0),
  };
}
