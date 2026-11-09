export default function Home() {
  return (
    <>
      <h1>フリック練習</h1>
      <p>Práctica de フリック入力 (teclado de 12 teclas, deslizando).</p>

      <div className="note">
        <strong>iPhone:</strong> activa Ajustes → General → Teclado → <strong>フリックのみ</strong>{' '}
        (solo deslizar, sin multitoque) para coger el hábito bueno.
      </div>

      <div className="card">
        <h2>En construcción</h2>
        <p className="muted">
          F0: base de la app (PWA offline). Próximamente: motor de kana, teclado virtual, lecciones.
        </p>
      </div>
    </>
  );
}
