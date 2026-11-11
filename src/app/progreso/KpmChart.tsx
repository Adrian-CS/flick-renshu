'use client';
import { useRef, useState } from 'react';
import { niceTicks, type SeriesPoint } from '@/lib/progress';

const W = 340;
const H = 190;
const M = { top: 14, right: 14, bottom: 26, left: 34 };

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Kana por minuto en cada sesión (una serie: el título la nombra). Toca para ver el detalle. */
export function KpmChart({ points }: { points: readonly SeriesPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  if (points.length === 0) return <p className="muted">Todavía no hay sesiones con este filtro.</p>;

  const ticks = niceTicks(Math.max(...points.map((p) => p.kpm)));
  const yMax = ticks[ticks.length - 1]!;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => M.top + ih - (v / yMax) * ih;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.kpm).toFixed(1)}`).join(' ');
  // con muchas sesiones los puntos tapan la línea: solo el último
  const showDots = points.length <= 12;
  const last = points.length - 1;

  function pick(clientX: number) {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i;
    setActive(best);
  }

  const a = active !== null ? points[active] : null;

  return (
    <div className="chart">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Kana por minuto en ${points.length} sesiones; última ${points[last]!.kpm}`}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <text className="chart-tick" x={x(0)} y={H - 6} textAnchor={points.length === 1 ? 'middle' : 'start'}>
          {dateFmt.format(points[0]!.startedAt)}
        </text>
        {points.length > 1 && (
          <text className="chart-tick" x={x(last)} y={H - 6} textAnchor="end">
            {dateFmt.format(points[last]!.startedAt)}
          </text>
        )}
        <path className="chart-line" d={path} />
        {showDots && points.map((p, i) => <circle key={i} className="chart-dot" cx={x(i)} cy={y(p.kpm)} r={4} />)}
        {!showDots && <circle className="chart-dot" cx={x(last)} cy={y(points[last]!.kpm)} r={4} />}
        {a && active !== null && (
          <>
            <line className="chart-cross" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + ih} />
            <circle className="chart-dot chart-dot-on" cx={x(active)} cy={y(a.kpm)} r={5.5} />
          </>
        )}
        {active === null && (
          <text className="chart-value" x={x(last)} y={y(points[last]!.kpm) - 10} textAnchor={points.length === 1 ? 'middle' : 'end'}>
            {points[last]!.kpm.toLocaleString('es-ES')}
          </text>
        )}
      </svg>
      <p className="chart-tip" aria-live="polite">
        {a ? (
          <>
            <strong>{a.kpm.toLocaleString('es-ES')} kana/min</strong> · {Math.round(a.accuracy * 100)} % · {a.label} ·{' '}
            {timeFmt.format(a.startedAt)}
          </>
        ) : (
          'Toca la gráfica para ver cada sesión.'
        )}
      </p>
    </div>
  );
}
