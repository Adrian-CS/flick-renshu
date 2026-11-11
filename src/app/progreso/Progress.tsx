'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { allSessions, exportBackup, importBackup, loadStats, resetProgress, type SessionRecord } from '@/lib/db';
import { weakestStrokes, strokeWeight, type StrokeStat } from '@/lib/stats';
import { SESSION_GROUP_LABEL, formatDuration, kpmSeries, totals, type KeyboardFilter } from '@/lib/progress';
import { strokeLabel } from '@/lib/labels';
import { Heatmap } from './Heatmap';
import { KpmChart } from './KpmChart';

const RANGES = [{ label: 'Últimas 30', n: 30 }, { label: 'Todas', n: 0 }] as const;
const pct = (n: number) => `${Math.round(n * 100)} %`;

export function Progress() {
  const [stats, setStats] = useState<Map<string, StrokeStat> | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [keyboard, setKeyboard] = useState<KeyboardFilter>('virtual');
  const [group, setGroup] = useState('');
  const [range, setRange] = useState(30);
  const [table, setTable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setStats(await loadStats().catch(() => new Map()));
    setSessions(await allSessions().catch(() => []));
  }
  useEffect(() => {
    void reload();
  }, []);

  const points = kpmSeries(sessions, keyboard, group || undefined, range || undefined);
  const t = totals(kpmSeries(sessions, keyboard, group || undefined), sessions);
  const weak = stats ? weakestStrokes(stats, 10) : [];

  async function doExport() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flick-renshu-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  async function doImport(file: File | undefined) {
    if (!file) return;
    try {
      const r = await importBackup(JSON.parse(await file.text()));
      setMessage(`Importado: ${r.sessions} sesiones y ${r.texts} textos nuevos.`);
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo importar.');
    }
  }

  async function doReset() {
    if (!window.confirm('¿Borrar estadísticas e historial de sesiones? (Mis textos y ajustes se conservan)')) return;
    await resetProgress();
    setMessage('Progreso borrado.');
    await reload();
  }

  return (
    <>
      <div className="row">
        <h1>進捗</h1>
        <Link href="/">← Inicio</Link>
      </div>

      <h2>Kana por minuto</h2>
      <div className="filters">
        <div className="seg" role="group" aria-label="Teclado">
          <button type="button" aria-pressed={keyboard === 'virtual'} onClick={() => setKeyboard('virtual')}>
            Virtual
          </button>
          <button type="button" aria-pressed={keyboard === 'system'} onClick={() => setKeyboard('system')}>
            Del sistema
          </button>
        </div>
        <select className="select" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Lecciones">
          <option value="">Todas las lecciones</option>
          {Object.entries(SESSION_GROUP_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {k === 'texts' ? v : `${k}. ${v}`}
            </option>
          ))}
        </select>
        <div className="seg" role="group" aria-label="Rango">
          {RANGES.map((r) => (
            <button type="button" key={r.n} aria-pressed={range === r.n} onClick={() => setRange(r.n)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tiles">
        <Tile label="últimas 5" value={t.recentKpm.toLocaleString('es-ES')} unit="kana/min" />
        <Tile label="mejor" value={t.bestKpm.toLocaleString('es-ES')} unit="kana/min" />
        <Tile label="sesiones" value={String(t.sessions)} unit={formatDuration(t.durationMs)} />
        <Tile label="escritas" value={t.kana.toLocaleString('es-ES')} unit="kana" />
      </div>
      <p className="muted tiles-note">Kana/min según el filtro; sesiones y kana, todas.</p>

      <KpmChart points={points} />
      {points.length > 0 && (
        <button type="button" className="btn" onClick={() => setTable(!table)}>
          {table ? 'Ocultar tabla' : 'Ver tabla'}
        </button>
      )}
      {table && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ejercicio</th>
              <th>kana/min</th>
              <th>precisión</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.startedAt}>
                <td>{new Date(p.startedAt).toLocaleDateString('es-ES')}</td>
                <td>{p.label}</td>
                <td>{p.kpm.toLocaleString('es-ES')}</td>
                <td>{pct(p.accuracy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stats && <Heatmap stats={stats} />}
      <p className="muted">Solo el teclado virtual sabe qué gesto hiciste: el del sistema no cuenta aquí.</p>

      <h2>Gestos que más cuestan</h2>
      {weak.length === 0 ? (
        <p className="muted">Aún no hay datos suficientes.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Gesto</th>
              <th>intentos</th>
              <th>fallos</th>
              <th>pistas</th>
              <th>ms</th>
            </tr>
          </thead>
          <tbody>
            {weak.map((s) => (
              <tr key={s.id} title={`peso ${strokeWeight(s).toFixed(1)}`}>
                <td>{strokeLabel(s.id)}</td>
                <td>{s.attempts}</td>
                <td>{pct(s.errors / s.attempts)}</td>
                <td>{pct(s.hints / s.attempts)}</td>
                <td>{Math.round(s.avgMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Copia de seguridad</h2>
        <p className="muted">
          Todo se guarda solo en este móvil. Exporta un fichero para no perderlo (por ejemplo, si borras los datos de Safari o
          cambias de móvil).
        </p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => void doExport()}>
            Exportar
          </button>
          <label className="btn">
            Importar
            <input type="file" accept="application/json,.json" hidden onChange={(e) => void doImport(e.target.files?.[0])} />
          </label>
          <button type="button" className="btn btn-danger" onClick={() => void doReset()}>
            Borrar progreso
          </button>
        </div>
        {message && <p className="muted">{message}</p>}
      </section>
    </>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="tile">
      <span className="tile-value">{value}</span>
      {unit && <span className="tile-unit">{unit}</span>}
      <span className="tile-label">{label}</span>
    </div>
  );
}
