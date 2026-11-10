/** Estadísticas, historial de sesiones y ajustes en IndexedDB (todo local). */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { mergeStat, type StrokeStat } from './stats';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import type { DrillMetrics } from './drill';
import type { TextRecord } from './texts';

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
  texts: { key: number; value: TextRecord };
}

const DB_NAME = 'flick-renshu';
let dbp: Promise<IDBPDatabase<FlickDB>> | null = null;

export function db(): Promise<IDBPDatabase<FlickDB>> {
  dbp ??= openDB<FlickDB>(DB_NAME, 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('strokes', { keyPath: 'id' });
        const sessions = d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        sessions.createIndex('lessonKey', 'lessonKey');
        sessions.createIndex('startedAt', 'startedAt');
        d.createObjectStore('settings', { keyPath: 'id' });
      }
      if (oldVersion < 2) d.createObjectStore('texts', { keyPath: 'id', autoIncrement: true });
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

// ── Mis textos ──

export async function listTexts(): Promise<TextRecord[]> {
  const all = await (await db()).getAll('texts');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getText(id: number): Promise<TextRecord | undefined> {
  return (await db()).get('texts', id);
}

/** Crea o actualiza; devuelve el id. */
export async function saveText(text: TextRecord): Promise<number> {
  const rec = { ...text };
  if (rec.id === undefined) delete rec.id;
  return (await db()).put('texts', rec);
}

export async function deleteText(id: number): Promise<void> {
  await (await db()).delete('texts', id);
}
