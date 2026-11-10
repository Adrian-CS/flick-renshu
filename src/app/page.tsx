import Link from 'next/link';

export default function Home() {
  return (
    <>
      <h1>フリック練習</h1>
      <p>Práctica de フリック入力 (teclado de 12 teclas, deslizando).</p>

      <div className="note">
        <strong>iPhone:</strong> activa Ajustes → General → Teclado → <strong>フリックのみ</strong>{' '}
        (solo deslizar, sin multitoque) para coger el hábito bueno.
      </div>

      <ul className="links">
        <li>
          <Link href="/lecciones/">
            レッスン <small>Lecciones con repetición ponderada</small>
          </Link>
        </li>
        <li>
          <Link href="/textos/">
            Mis textos <small>Escribe tus textos o letras línea a línea</small>
          </Link>
        </li>
        <li>
          <Link href="/libre/">
            自由入力 <small>Prueba libre del teclado virtual</small>
          </Link>
        </li>
      </ul>

      <p className="muted">Próximamente: página de progreso.</p>
      <p className="muted">
        <Link href="/creditos/">Créditos y licencias</Link>
      </p>
    </>
  );
}
