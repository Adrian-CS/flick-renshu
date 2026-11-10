import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteText, getSettings, getText, listTexts, loadStats, resetProgress, saveSession, saveSettings, saveText, sessionsFor, type SessionRecord } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings';

const metrics = { durationMs: 60000, kana: 60, kpm: 60, accuracy: 0.9, hints: 2, items: 30 };
const rec = (lessonKey: string, startedAt: number, kpm = 60): SessionRecord => ({ ...metrics, kpm, lessonKey, startedAt });

beforeEach(resetProgress);

describe('db', () => {
  it('guardar sesiones suma las estadísticas por gesto', async () => {
    await saveSession(rec('row-a/mix', 1), [{ id: 'a:tap', attempts: 2, errors: 1, hints: 0, avgMs: 1000, updatedAt: 1 }]);
    await saveSession(rec('row-a/mix', 2), [{ id: 'a:tap', attempts: 2, errors: 0, hints: 1, avgMs: 500, updatedAt: 2 }]);
    const stats = await loadStats();
    expect(stats.get('a:tap')).toEqual({ id: 'a:tap', attempts: 4, errors: 1, hints: 1, avgMs: 750, updatedAt: 2 });
  });

  it('sesiones por lección, la más reciente primero', async () => {
    await saveSession(rec('row-a/mix', 1, 30), []);
    await saveSession(rec('row-ka/mix', 2), []);
    await saveSession(rec('row-a/mix', 3, 40), []);
    const list = await sessionsFor('row-a/mix');
    expect(list.map((s) => s.kpm)).toEqual([40, 30]);
  });

  it('ajustes: por defecto y guardados', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    await saveSettings({ ...DEFAULT_SETTINGS, durationMin: 5 });
    expect((await getSettings()).durationMin).toBe(5);
  });

  it('mis textos: crear, editar, listar y borrar', async () => {
    const id = await saveText({ title: 'a', body: 'あ', createdAt: 1, updatedAt: 1 });
    const id2 = await saveText({ title: 'b', body: 'い', createdAt: 2, updatedAt: 2 });
    await saveText({ id, title: 'a2', body: 'あ', createdAt: 1, updatedAt: 3 });
    expect((await getText(id))?.title).toBe('a2');
    expect((await listTexts()).map((t) => t.title)).toEqual(['a2', 'b']);
    await deleteText(id);
    await deleteText(id2);
    expect(await listTexts()).toEqual([]);
  });
});
