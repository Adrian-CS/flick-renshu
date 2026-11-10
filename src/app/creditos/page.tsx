import Link from 'next/link';

export const metadata = { title: 'Créditos · フリック練習' };

export default function Page() {
  return (
    <>
      <div className="row">
        <h1>Créditos</h1>
        <Link href="/">← Inicio</Link>
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Palabras: JMdict</h2>
        <p>
          La lista de palabras procede del diccionario{' '}
          <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" target="_blank" rel="noreferrer">
            JMdict
          </a>
          , propiedad del{' '}
          <a href="https://www.edrdg.org/" target="_blank" rel="noreferrer">
            Electronic Dictionary Research and Development Group
          </a>{' '}
          (EDRDG), y se usa conforme a su{' '}
          <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noreferrer">
            licencia
          </a>{' '}
          (
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
            Creative Commons BY-SA 4.0
          </a>
          ).
        </p>
        <p className="muted">
          Se han tomado las entradas marcadas como comunes, con su lectura en hiragana y su forma con kanji, a partir del JSON
          de{' '}
          <a href="https://github.com/scriptin/jmdict-simplified" target="_blank" rel="noreferrer">
            jmdict-simplified
          </a>
          . El fichero derivado (<code>/data/words.json</code>) se distribuye con la misma licencia CC BY-SA 4.0.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Frases</h2>
        <p className="muted">Las frases cortas y los ejercicios de kana se han escrito o generado para esta app.</p>
      </section>
    </>
  );
}
