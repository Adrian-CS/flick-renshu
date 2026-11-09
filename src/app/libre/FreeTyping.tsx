'use client';
import { useState } from 'react';
import Link from 'next/link';
import { VirtualKeyboard } from '@/components/VirtualKeyboard';
import { HINT_LEVELS, HINT_LEVEL_LABEL, type HintLevel } from '@/lib/hints';
import { KEY_LABEL, type Stroke } from '@/lib/kana';
import { applyEdit, type EditAction } from '@/lib/textEdit';

const ARROW = { tap: 'toque', left: '←', up: '↑', right: '→', down: '↓' } as const;

/** Prueba libre: escribe lo que quieras con el teclado virtual. */
export function FreeTyping() {
  const [text, setText] = useState('');
  const [hint, setHint] = useState<HintLevel>('all');
  const [last, setLast] = useState<{ kana: string; stroke: Stroke } | null>(null);
  const edit = (a: EditAction) => setText((t) => applyEdit(t, a));

  return (
    <div className="with-kb">
      <div className="row">
        <h1>自由入力</h1>
        <Link href="/">← Inicio</Link>
      </div>

      <div className="card">
        <div className="typed">
          {text}
          <span className="caret" />
        </div>
      </div>

      <div className="row">
        <span className="muted">
          {last ? `${KEY_LABEL[last.stroke.key]} ${ARROW[last.stroke.dir]} ＝ ${last.kana}` : 'Toca o desliza una tecla'}
        </span>
        <button type="button" className="btn" onClick={() => edit({ type: 'clear' })}>
          消去
        </button>
      </div>

      <h2>Pistas en las teclas</h2>
      <div className="seg">
        {HINT_LEVELS.map((l) => (
          <button type="button" key={l} aria-pressed={hint === l} onClick={() => setHint(l)}>
            {HINT_LEVEL_LABEL[l]}
          </button>
        ))}
      </div>

      <VirtualKeyboard
        hint={hint}
        onKana={(kana, stroke) => {
          edit({ type: 'insert', text: kana });
          setLast({ kana, stroke });
        }}
        onModifier={() => {
          edit({ type: 'modify' });
          setLast(null);
        }}
        onBackspace={() => edit({ type: 'backspace' })}
        onSpace={() => edit({ type: 'insert', text: '　' })}
        onEnter={() => edit({ type: 'insert', text: '\n' })}
      />
    </div>
  );
}
