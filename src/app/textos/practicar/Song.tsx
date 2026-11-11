'use client';
import { useEffect, useState } from 'react';
import { Clock, type TimeSource } from '@/lib/karaoke';
import { deleteAudio, getAudio, saveAudio } from '@/lib/db';

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
  /** Nombre del fichero de audio, o null si se usa el cronómetro. */
  audioName: string | null;
  /** Listo para empezar (el audio ha cargado sus metadatos). */
  ready: boolean;
  /** Una fuente nueva para cada sesión. */
  makeSource: () => TimeSource;
  setAudio: (file: File) => Promise<void>;
  removeAudio: () => Promise<void>;
}

/** Audio guardado del texto (o cronómetro si no hay). */
export function useSong(textId: number): Song {
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

  return {
    audioName: audio?.name ?? null,
    ready,
    makeSource: () => (audio ? new AudioSource(audio.el) : new Clock()),
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
