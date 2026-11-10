import Link from 'next/link';

/** Atribución obligatoria de JMdict (CC BY-SA 4.0). */
export function Attribution() {
  return (
    <p className="muted attribution">
      Palabras de{' '}
      <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" target="_blank" rel="noreferrer">
        JMdict
      </a>{' '}
      (EDRDG), licencia{' '}
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-SA 4.0
      </a>
      . <Link href="/creditos/">Créditos</Link>
    </p>
  );
}
