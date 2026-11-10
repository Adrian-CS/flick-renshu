'use client';

export type KeyboardKind = 'virtual' | 'system';

/** Elegir teclado: el virtual de la app o el フリック del móvil. */
export function KeyboardChoice({
  value,
  onChange,
  systemOnly = false,
}: {
  value: KeyboardKind;
  onChange: (k: KeyboardKind) => void;
  /** El texto tiene kanji: solo se puede con el teclado del sistema. */
  systemOnly?: boolean;
}) {
  const v = systemOnly ? 'system' : value;
  return (
    <>
      <p className="label">Teclado</p>
      <div className="seg">
        <button type="button" aria-pressed={v === 'virtual'} disabled={systemOnly} onClick={() => onChange('virtual')}>
          Virtual (app)
        </button>
        <button type="button" aria-pressed={v === 'system'} onClick={() => onChange('system')}>
          Del sistema (iPhone)
        </button>
      </div>
      {v === 'system' && (
        <p className="muted">
          Usa el teclado 日本語かな con フリックのみ. Si el objetivo está en hiragana, confirma con 確定 sin elegir kanji.
        </p>
      )}
      {systemOnly && <p className="muted">Este texto tiene kanji: con el teclado virtual no se puede escribir.</p>}
    </>
  );
}
