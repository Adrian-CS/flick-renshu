/** Estadísticas, historial de sesiones y ajustes en IndexedDB (todo local). */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { mergeStat, type StrokeStat } from './stats';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import type { DrillMetrics } from './drill';

export interface SessionRecord extends DrillMetrics {
  id?: number;
  /** "row-ka/mix" */
  lessonKey: string;
  startedAt: number;
}

interface FlickDB extends DBSchema {
  strokes: { key: string; value: StrokeStat };
  sessions: { key: number; value: SessionRecord; indexes: { lessonKey: string; startedAt: number } };
  settings: { key: string; value: Settings & { id: string } };
}

const DB_NAME = 'flick-renshu';
let dbp: Promise<IDBPDatabase<FlickDB>> | null = null;

export function db(): Promise<IDBPDatabase<FlickDB>> {
  dbp ??= openDB<FlickDB>(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('strokes', { keyPath: 'id' });
      const sessions = d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
      sessions.createIndex('lessonKey', 'lessonKey');
      sessions.createIndex('startedAt', 'startedAt');
      d.createObjectStore('settings', { keyPath: 'id' });
    },
  });
  return dbp;
}

export async function loadStats(): Promise<Map<string, StrokeStat>> {
  const all = await (await db()).getAll('strokes');
  return new Map(all.map((s) => [s.id, s]));
}

/** Guarda una sesión y suma sus resultados por gesto a los totales, en una transacción. */
export async function saveSession(record: SessionRecord, deltas: readonly StrokeStat[]): Promise<void> {
  const tx = (await db()).transaction(['strokes', 'sessions'], 'readwrite');
  const strokes = tx.objectStore('strokes');
  for (const d of deltas) strokes.put(mergeStat(await strokes.get(d.id), d));
  await Promise.all([tx.objectStore('sessions').add({ ...record }), tx.done]);
}

/** Sesiones de una lección/fase, la más reciente primero. */
export async function sessionsFor(lessonKey: string): Promise<SessionRecord[]> {
  const list = await (await db()).getAllFromIndex('sessions', 'lessonKey', lessonKey);
  return list.sort((a, b) => b.startedAt - a.startedAt);
}

export async function allSessions(): Promise<SessionRecord[]> {
  return (await db()).getAllFromIndex('sessions', 'startedAt');
}

export async function getSettings(): Promise<Settings> {
  const s = await (await db()).get('settings', 'settings');
  if (!s) return { ...DEFAULT_SETTINGS };
  const { id: _id, ...rest } = s;
  return { ...DEFAULT_SETTINGS, ...rest };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await db()).put('settings', { ...settings, id: 'settings' });
}

export async function resetProgress(): Promise<void> {
  const d = await db();
  await Promise.all([d.clear('strokes'), d.clear('sessions')]);
}
