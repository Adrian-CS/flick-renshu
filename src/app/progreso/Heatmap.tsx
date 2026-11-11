'use client';
import { useState } from 'react';
import { KEY_LABEL, KEY_LAYOUT, MOD_KEY, type Direction, type KeyId } from '@/lib/kana';
import { HEAT_METRIC_LABEL, MIN_ATTEMPTS, heatCells, type HeatCell, type HeatMetric } from '@/lib/progress';
import { strokeLabel } from '@/lib/labels';
import type { StatsMap } from '@/lib/stats';

/** Posición de cada dirección en la cruz 3×3 de una tecla. */
const POS: Readonly<Record<Direction, { row: number; col: number }>> = {
  up: { row: 1, col: 2 },
  left: { row: 2, col: 1 },
  tap: { row: 2, col: 2 },
  right: { row: 2, col: 3 },
  down: { row: 3, col: 2 },
};

const pct = (n: number) => `${Math.round(n * 100)} %`;

function describe(c: HeatCell): string {
  if (c.attempts === 0) return `${strokeLabel(c.id)}: sin practicar`;
  return `${strokeLabel(c.id)}: ${c.attempts} intentos · ${pct(c.errors / c.attempts)} con fallo · ${pct(c.hints / c.attempts)} con pista · ${Math.round(c.avgMs)} ms`;
}

/** Mapa de calor con la forma del teclado: la cruz de cada tecla coloreada. */
export function Heatmap({ stats }: { stats: StatsMap }) {
  const [metric, setMetric] = useState<HeatMetric>('errors');
  const [selected, setSelected] = useState<string | null>(null);
  const cells = heatCells(stats, metric);
  const byKey = new Map<KeyId, HeatCell[]>();
  for (const c of cells) byKey.set(c.key, [...(byKey.get(c.key) ?? []), c]);
  const sel = cells.find((c) => c.id === selected);

  return (
    <section>
      <h2>Mapa de calor por gesto</h2>
      <div className="seg" role="group" aria-label="Métrica">
        {(Object.keys(HEAT_METRIC_LABEL) as HeatMetric[]).map((m) => (
          <button type="button" key={m} aria-pressed={metric === m} onClick={() => setMetric(m)}>
            {HEAT_METRIC_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="heat-keys">
        {KEY_LAYOUT.flat().map((key) => (
          <div key={key} className="heat-key" aria-label={`Tecla ${KEY_LABEL[key]}`}>
            {(byKey.get(key) ?? []).map((c) => (
              <button
                type="button"
                key={c.id}
                className={`heat-cell heat-${c.level ?? 'none'}${selected === c.id ? ' heat-sel' : ''}${key === MOD_KEY ? ' heat-mod' : ''}`}
                style={key === MOD_KEY ? undefined : { gridRow: POS[c.dir].row, gridColumn: POS[c.dir].col }}
                onClick={() => setSelected(selected === c.id ? null : c.id)}
                aria-label={describe(c)}
                title={describe(c)}
              >
                {c.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="heat-detail" aria-live="polite">
        {sel ? describe(sel) : 'Toca una kana para ver sus datos.'}
      </p>
      <div className="heat-legend" aria-hidden>
        <span>{metric === 'time' ? 'rápido' : 'menos'}</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heat-swatch heat-${l}`} />
        ))}
        <span>{metric === 'time' ? 'lento' : 'más'}</span>
        <span className="heat-swatch heat-none" />
        <span>&lt; {MIN_ATTEMPTS} intentos</span>
      </div>
    </section>
  );
}
