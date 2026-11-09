'use client';
import { useEffect, useRef, useState } from 'react';
import { KEY_LAYOUT, flickKana, keyFan, type Direction, type KeyId, type Stroke } from '@/lib/kana';
import { clampFanX, classifyGesture } from '@/lib/gesture';
import { keyFace, type HintLevel } from '@/lib/hints';

export interface VirtualKeyboardProps {
  hint: HintLevel;
  onKana: (kana: string, stroke: Stroke) => void;
  onBackspace: () => void;
  onSpace?: () => void;
  onEnter?: () => void;
}

interface Press {
  key: KeyId;
  x0: number;
  y0: number;
  width: number;
  /** centro de la tecla relativo al teclado */
  cx: number;
  cy: number;
  cell: number;
  dir: Direction;
}

interface FanState {
  pointerId: number;
  press: Press;
}

const ARMS: { dir: Direction; dx: number; dy: number }[] = [
  { dir: 'tap', dx: 0, dy: 0 },
  { dir: 'left', dx: -1, dy: 0 },
  { dir: 'up', dx: 0, dy: -1 },
  { dir: 'right', dx: 1, dy: 0 },
  { dir: 'down', dx: 0, dy: 1 },
];

const REPEAT_DELAY = 450;
const REPEAT_EVERY = 70;

/**
 * Teclado フリック de 12 teclas con la geometría del de iOS (5 columnas).
 * Cada dedo se sigue por separado (se puede bajar el siguiente antes de levantar el anterior);
 * la kana se escribe al levantar el dedo.
 */
export function VirtualKeyboard({ hint, onKana, onBackspace, onSpace, onEnter }: VirtualKeyboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const presses = useRef(new Map<number, Press>());
  const [fan, setFan] = useState<FanState | null>(null);

  // callbacks siempre actuales sin volver a crear los manejadores
  const cb = useRef({ onKana, onBackspace });
  cb.current = { onKana, onBackspace };

  function showLatestFan() {
    const entries = [...presses.current.entries()];
    const last = entries[entries.length - 1];
    setFan(last ? { pointerId: last[0], press: { ...last[1] } } : null);
  }

  function onDown(e: React.PointerEvent<HTMLButtonElement>, key: KeyId) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    const c = root.current!.getBoundingClientRect();
    const cell = Math.min(r.height, r.width) * 1.05;
    const press: Press = {
      key,
      x0: e.clientX,
      y0: e.clientY,
      width: r.width,
      cx: clampFanX(r.left + r.width / 2 - c.left, cell, c.width),
      cy: r.top + r.height / 2 - c.top,
      cell,
      dir: 'tap',
    };
    presses.current.set(e.pointerId, press);
    showLatestFan();
  }

  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    const p = presses.current.get(e.pointerId);
    if (!p) return;
    const dir = classifyGesture(e.clientX - p.x0, e.clientY - p.y0, p.width);
    if (dir === p.dir) return;
    p.dir = dir;
    setFan((f) => (f && f.pointerId === e.pointerId ? { pointerId: e.pointerId, press: { ...p } } : f));
  }

  function onUp(e: React.PointerEvent<HTMLButtonElement>) {
    const p = presses.current.get(e.pointerId);
    if (!p) return;
    presses.current.delete(e.pointerId);
    const dir = classifyGesture(e.clientX - p.x0, e.clientY - p.y0, p.width);
    const kana = flickKana(p.key, dir);
    if (kana) cb.current.onKana(kana, { key: p.key, dir });
    showLatestFan();
  }

  function onCancel(e: React.PointerEvent<HTMLButtonElement>) {
    presses.current.delete(e.pointerId);
    showLatestFan();
  }

  // ⌫ con repetición al mantener
  const repeat = useRef<{ delay?: number; every?: number }>({});
  function stopRepeat() {
    window.clearTimeout(repeat.current.delay);
    window.clearInterval(repeat.current.every);
    repeat.current = {};
  }
  useEffect(() => stopRepeat, []);
  function onBackspaceDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    stopRepeat();
    cb.current.onBackspace();
    repeat.current.delay = window.setTimeout(() => {
      repeat.current.every = window.setInterval(() => cb.current.onBackspace(), REPEAT_EVERY);
    }, REPEAT_DELAY);
  }

  function simpleKey(label: string, action: (() => void) | undefined, className = '') {
    return (
      <button
        type="button"
        className={`kb-key kb-fn ${className}`}
        disabled={!action}
        onPointerDown={(e) => {
          e.preventDefault();
          action?.();
        }}
      >
        {label}
      </button>
    );
  }

  const fanKana = fan ? keyFan(fan.press.key) : null;

  return (
    <div className="kb" ref={root} onContextMenu={(e) => e.preventDefault()}>
      <div className="kb-grid">
        {KEY_LAYOUT.map((row, r) => (
          <div className="kb-row" key={r} style={{ display: 'contents' }}>
            <button type="button" className="kb-key kb-fn kb-inert" tabIndex={-1} aria-hidden>
              {['→', '↺', 'ABC', '🌐'][r]}
            </button>
            {row.map((key) => {
              const face = keyFace(key, hint);
              const active = fan?.press.key === key;
              const mapped = flickKana(key, 'tap') !== null;
              return (
                <button
                  type="button"
                  key={key}
                  className={`kb-key kb-kana${active ? ' kb-active' : ''}${mapped ? '' : ' kb-unmapped'}`}
                  onPointerDown={(e) => onDown(e, key)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onCancel}
                  aria-label={face.center || key}
                >
                  <span className={`kb-center${key === 'mod' || key === 'punct' ? ' kb-small' : ''}`}>{face.center}</span>
                  {face.around.left && <span className="kb-around kb-l">{face.around.left}</span>}
                  {face.around.up && <span className="kb-around kb-u">{face.around.up}</span>}
                  {face.around.right && <span className="kb-around kb-r">{face.around.right}</span>}
                  {face.around.down && <span className="kb-around kb-d">{face.around.down}</span>}
                </button>
              );
            })}
            {r === 0 && (
              <button
                type="button"
                className="kb-key kb-fn"
                onPointerDown={onBackspaceDown}
                onPointerUp={stopRepeat}
                onPointerCancel={stopRepeat}
                aria-label="borrar"
              >
                ⌫
              </button>
            )}
            {r === 1 && simpleKey('空白', onSpace)}
            {r === 2 && simpleKey('改行', onEnter, 'kb-enter')}
          </div>
        ))}
      </div>

      {fan && fanKana && (
        <div
          className="kb-fan"
          style={{ left: fan.press.cx, top: fan.press.cy, ['--cell' as string]: `${fan.press.cell}px` }}
          aria-hidden
        >
          {ARMS.map(({ dir, dx, dy }) => {
            const k = fanKana[dir];
            if (!k) return null;
            return (
              <span
                key={dir}
                className={`kb-fan-cell${fan.press.dir === dir ? ' kb-fan-on' : ''}`}
                style={{ transform: `translate(${dx * 100 - 50}%, ${dy * 100 - 50}%)` }}
              >
                {k}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
