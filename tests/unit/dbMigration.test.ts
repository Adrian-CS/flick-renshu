import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';

describe('migración de la base de datos', () => {
  it('v1 → v3 conserva las estadísticas y añade Mis textos y audio', async () => {
    const v1 = await openDB('flick-renshu', 1, {
      upgrade(d) {
        d.createObjectStore('strokes', { keyPath: 'id' });
        const s = d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('lessonKey', 'lessonKey');
        s.createIndex('startedAt', 'startedAt');
        d.createObjectStore('settings', { keyPath: 'id' });
      },
    });
    await v1.put('strokes', { id: 'a:tap', attempts: 3, errors: 0, hints: 0, avgMs: 500, updatedAt: 1 });
    v1.close();

    const { loadStats, listTexts, saveText, getAudio } = await import('@/lib/db');
    expect(await getAudio(1)).toBeUndefined();
    expect((await loadStats()).get('a:tap')?.attempts).toBe(3);
    await saveText({ title: 't', body: 'あ', createdAt: 1, updatedAt: 1 });
    expect(await listTexts()).toHaveLength(1);
  });
});
