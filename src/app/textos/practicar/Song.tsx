'use client';
import { useEffect, useState } from 'react';
import { Clock, type TimeSource } from '@/lib/karaoke';
import { deleteAudio, getAudio, saveAudio } from '@/lib/db';
import { useYouTube, type YouTubeVideo } from './useYouTube';

/** El audio del texto como fuente de tiempo. */
export class AudioSource implements TimeSource {
  constructor(readonly el: HTMLAudioElement) {}
  get playing(): boolean {
    return !this.el.paused;
  }
  now(): number {
    return this.el.currentTime * 1000;
  }
  play(): void {
    this.el.play().catch(() => undefined);
  }
  pause(): void {
    this.el.pause();
  }
  seek(ms: number): void {
    this.el.currentTime = Math.max(0, ms / 1000);
  }
}

export interface Song {
  /** De dónde sale la canción: vídeo de YouTube, fichero o cronómetro (suena en otra app). */
  kind: 'youtube' | 'file' | 'clock';
  youtube: YouTubeVideo;
  /** Nombre del fichero de audio, o null si no hay. */
  audioName: string | null;
  /** Listo para empezar (el audio ha cargado sus metadatos). */
  ready: boolean;
  /** Una fuente nueva para cada sesión. */
  makeSource: () => TimeSource;
  setAudio: (file: File) => Promise<void>;
  removeAudio: () => Promise<void>;
}

/** La canción del texto: vídeo de YouTube, si no audio guardado, si no cronómetro. */
export function useSong(textId: number, youtubeId?: string, youtubeStartMs = 0): Song {
  const youtube = useYouTube(youtubeId);
  const [audio, setAudioEl] = useState<{ el: HTMLAudioElement; name: string; url: string } | null>(null);
  const [ready, setReady] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    getAudio(textId)
      .then((a) => {
        if (!alive || !a) {
          setAudioEl(null);
          setReady(true);
          return;
        }
        url = URL.createObjectURL(new Blob([a.data], { type: a.type }));
        const el = new Audio();
        el.preload = 'auto';
        setReady(false);
        el.addEventListener('loadedmetadata', () => alive && setReady(true), { once: true });
        el.src = url;
        el.load();
        setAudioEl({ el, name: a.name, url });
      })
      .catch(() => setAudioEl(null));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [textId, version]);

  useEffect(() => () => audio?.el.pause(), [audio]);

  const kind = youtubeId ? 'youtube' : audio ? 'file' : 'clock';
  return {
    kind,
    youtube,
    audioName: audio?.name ?? null,
    ready: kind === 'youtube' ? youtube.ready : ready,
    makeSource: () =>
      kind === 'youtube' ? youtube.makeSource(youtubeStartMs) : audio ? new AudioSource(audio.el) : new Clock(),
    async setAudio(file: File) {
      await saveAudio({ id: textId, name: file.name, type: file.type || 'audio/mpeg', data: await file.arrayBuffer() });
      setVersion((v) => v + 1);
    },
    async removeAudio() {
      audio?.el.pause();
      await deleteAudio(textId);
      setVersion((v) => v + 1);
    },
  };
}
