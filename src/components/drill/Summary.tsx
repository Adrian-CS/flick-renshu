import type { Result } from './run';
import { strokeLabel } from '@/lib/labels';
import { compareSessions, formatDelta } from '@/lib/summary';

export function Summary({ result, showHints = true }: { result: Result; showHints?: boolean }) {
  const { metrics: m, prev, weak } = result;
  const cmp = compareSessions(m, prev);
  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Resumen</h2>
      <div className="stats">
        <Stat label="kana/min" value={m.kpm.toLocaleString('es-ES')} delta={cmp && formatDelta(cmp.kpm)} good={cmp ? cmp.kpm >= 0 : null} />
        <Stat
          label="precisión"
          value={`${Math.round(m.accuracy * 100)} %`}
          delta={cmp && formatDelta(cmp.accuracy, ' pt')}
          good={cmp ? cmp.accuracy >= 0 : null}
        />
        {showHints ? (
          <Stat label="pistas" value={String(m.hints)} delta={cmp && formatDelta(cmp.hints)} good={cmp ? cmp.hints <= 0 : null} />
        ) : (
          <Stat label="objetivos" value={String(m.items)} />
        )}
        <Stat label="kana" value={String(m.kana)} />
      </div>
      {cmp ? <p className="muted">Comparado con la sesión anterior.</p> : <p className="muted">Primera sesión de este ejercicio.</p>}
      {weak.length > 0 && (
        <>
          <p className="label">Para repasar</p>
          <ul className="weak">
            {weak.map((s) => (
              <li key={s.id}>
                {strokeLabel(s.id)}{' '}
                <span className="muted">
                  {s.errors > 0 && `${s.errors} fallo${s.errors > 1 ? 's' : ''}`}
                  {s.errors > 0 && s.hints > 0 && ' · '}
                  {s.hints > 0 && `${s.hints} pista${s.hints > 1 ? 's' : ''}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, delta, good }: { label: string; value: string; delta?: string | null; good?: boolean | null }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {delta && <span className={`stat-delta ${good ? 'up' : 'down'}`}>{delta}</span>}
    </div>
  );
}
