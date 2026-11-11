/** Estadísticas, historial de sesiones y ajustes en IndexedDB (todo local). */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { mergeStat, type StrokeStat } from './stats';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import type { DrillMetrics } from './drill';
import type { TextAudio, TextRecord } from './texts';

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
  audio: { key: number; value: TextAudio };
}

const DB_NAME = 'flick-renshu';
let dbp: Promise<IDBPDatabase<FlickDB>> | null = null;

export function db(): Promise<IDBPDatabase<FlickDB>> {
  dbp ??= openDB<FlickDB>(DB_NAME, 3, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('strokes', { keyPath: 'id' });
        const sessions = d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        sessions.createIndex('lessonKey', 'lessonKey');
        sessions.createIndex('startedAt', 'startedAt');
        d.createObjectStore('settings', { keyPath: 'id' });
      }
      if (oldVersion < 2) d.createObjectStore('texts', { keyPath: 'id', autoIncrement: true });
      if (oldVersion < 3) d.createObjectStore('audio', { keyPath: 'id' });
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
  const d = await db();
  await Promise.all([d.delete('texts', id), d.delete('audio', id)]);
}

export async function getAudio(textId: number): Promise<TextAudio | undefined> {
  return (await db()).get('audio', textId);
}

export async function saveAudio(audio: TextAudio): Promise<void> {
  await (await db()).put('audio', audio);
}

export async function deleteAudio(textId: number): Promise<void> {
  await (await db()).delete('audio', textId);
}

// ── Copia de seguridad ──

/** El audio no va en la copia (puede ocupar mucho): solo textos y tiempos. */
export interface Backup {
  app: 'flick-renshu';
  version: 1;
  exportedAt: number;
  strokes: StrokeStat[];
  sessions: SessionRecord[];
  settings: Settings;
  texts: TextRecord[];
}

export async function exportBackup(now = Date.now()): Promise<Backup> {
  const d = await db();
  return {
    app: 'flick-renshu',
    version: 1,
    exportedAt: now,
    strokes: await d.getAll('strokes'),
    sessions: (await d.getAll('sessions')).map(({ id: _id, ...s }) => s),
    settings: await getSettings(),
    texts: (await d.getAll('texts')).map(({ id: _id, ...t }) => t),
  };
}

/**
 * Importa una copia. Las estadísticas por gesto se sustituyen por las de la copia (son
 * totales); las sesiones y los textos se añaden sin duplicar los que ya existen.
 */
export async function importBackup(data: unknown): Promise<{ sessions: number; texts: number }> {
  const b = data as Partial<Backup>;
  if (b?.app !== 'flick-renshu' || b.version !== 1 || !Array.isArray(b.strokes) || !Array.isArray(b.sessions)) {
    throw new Error('No es una copia de seguridad de フリック練習');
  }
  const d = await db();
  const tx = d.transaction(['strokes', 'sessions', 'texts', 'settings'], 'readwrite');
  for (const s of b.strokes) await tx.objectStore('strokes').put(s);
  const seen = new Set((await tx.objectStore('sessions').getAll()).map((s) => `${s.lessonKey}|${s.startedAt}`));
  let sessions = 0;
  for (const { id: _id, ...s } of b.sessions) {
    if (seen.has(`${s.lessonKey}|${s.startedAt}`)) continue;
    seen.add(`${s.lessonKey}|${s.startedAt}`);
    await tx.objectStore('sessions').add(s);
    sessions++;
  }
  const seenTexts = new Set((await tx.objectStore('texts').getAll()).map((t) => `${t.createdAt}|${t.title}`));
  let texts = 0;
  for (const { id: _id, ...t } of b.texts ?? []) {
    if (seenTexts.has(`${t.createdAt}|${t.title}`)) continue;
    seenTexts.add(`${t.createdAt}|${t.title}`);
    await tx.objectStore('texts').add(t);
    texts++;
  }
  if (b.settings) await tx.objectStore('settings').put({ ...DEFAULT_SETTINGS, ...b.settings, id: 'settings' });
  await tx.done;
  return { sessions, texts };
}
