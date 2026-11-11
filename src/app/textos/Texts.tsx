'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { deleteText, listTexts, saveText } from '@/lib/db';
import { canUseVirtual, textLines, type TextRecord } from '@/lib/texts';
import { parseLrc, validTimes } from '@/lib/karaoke';

type Editing = { id?: number; title: string; body: string; createdAt?: number; timings?: number[] };

export function Texts() {
  const [texts, setTexts] = useState<TextRecord[] | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);

  const reload = () => listTexts().then(setTexts).catch(() => setTexts([]));
  useEffect(() => {
    void reload();
  }, []);

  async function save() {
    if (!editing) return;
    const now = Date.now();
    // LRC pegado: la letra por un lado y los tiempos por otro
    const lrc = parseLrc(editing.body);
    const body = lrc ? lrc.lines.join('\n') : editing.body;
    const timings = lrc ? lrc.times : validTimes(editing.timings, textLines(body).length) ? editing.timings : undefined;
    const title = editing.title.trim() || textLines(body)[0] || 'Sin título';
    await saveText({ id: editing.id, title, body, createdAt: editing.createdAt ?? now, updatedAt: now, timings });
    setEditing(null);
    await reload();
  }

  async function remove(t: TextRecord) {
    if (t.id === undefined || !window.confirm(`¿Borrar «${t.title}»?`)) return;
    await deleteText(t.id);
    await reload();
  }

  return (
    <>
      <div className="row">
        <h1>Mis textos</h1>
        <Link href="/">← Inicio</Link>
      </div>
      <p className="muted">
        Pega un texto (la letra de una canción, un mensaje, lo que quieras) y escríbelo línea a línea. Se guarda solo en este
        móvil.
      </p>

      {editing ? (
        <section className="card">
          <p className="label">Título</p>
          <input
            className="text-title"
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            placeholder="(opcional)"
          />
          <p className="label">Texto</p>
          <textarea
            className="text-body"
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            placeholder="Una línea por cada frase que quieras escribir"
            lang="ja"
          />
          <EditorInfo editing={editing} />
          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={textLines(editing.body).length === 0} onClick={() => void save()}>
              Guardar
            </button>
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </section>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ title: '', body: '' })}>
          ＋ Nuevo texto
        </button>
      )}

      {texts && texts.length === 0 && !editing && <p className="muted">Todavía no hay textos.</p>}
      <ul className="links">
        {texts?.map((t) => (
          <li key={t.id} className="card text-item">
            <Link href={`/textos/practicar/?id=${t.id}`} className="text-link">
              {t.title}
              <small>
                {textLines(t.body).length} líneas · {canUseVirtual(textLines(t.body)) ? 'kana' : 'con kanji'}
                {validTimes(t.timings, textLines(t.body).length) ? ' · ♪ sincronizado' : ''}
              </small>
            </Link>
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => setEditing({ id: t.id, title: t.title, body: t.body, createdAt: t.createdAt, timings: t.timings })}
              >
                Editar
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void remove(t)}>
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function EditorInfo({ editing }: { editing: Editing }) {
  const lrc = parseLrc(editing.body);
  const lines = lrc ? lrc.lines : textLines(editing.body);
  const lostTimings = !lrc && editing.timings && !validTimes(editing.timings, lines.length);
  return (
    <>
      <p className="muted">
        {lines.length} líneas ·{' '}
        {canUseVirtual(lines) ? 'todo en kana: sirve con los dos teclados' : 'con kanji: solo con el teclado del sistema'}
        {lrc && ' · LRC: se guardarán los tiempos de cada línea'}
      </p>
      {lostTimings && <p className="note">Has cambiado el número de líneas: habrá que volver a sincronizar los tiempos.</p>}
      {!lrc && !editing.timings && (
        <p className="muted">Si pegas una letra en formato LRC ([01:23.45] …), se guardan también sus tiempos para el karaoke.</p>
      )}
    </>
  );
}
