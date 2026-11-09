/** Comparación kana a kana entre el objetivo y lo escrito. */

export type CharStatus = 'ok' | 'wrong' | 'pending' | 'extra';

export interface CharResult {
  /** Kana del objetivo (vacío si es una kana escrita de más). */
  expected: string;
  /** Kana escrita en esa posición (vacío si aún no se ha escrito). */
  typed: string;
  status: CharStatus;
}

const KATA_START = 0x30a1; // ァ
const KATA_END = 0x30f6; // ヶ
const KATA_TO_HIRA = 0x60;

/** Katakana → hiragana (ー y lo demás se dejan igual). */
export function toHiragana(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    out += cp >= KATA_START && cp <= KATA_END ? String.fromCodePoint(cp - KATA_TO_HIRA) : ch;
  }
  return out;
}

/** Normaliza para comparar: NFC (une か+゙ → が), katakana → hiragana, ?! → ？！. */
export function normalizeKana(text: string): string {
  return toHiragana(text.normalize('NFC')).replaceAll('?', '？').replaceAll('!', '！');
}

/** Separa en kana (puntos de código), ya normalizado. */
export function splitKana(text: string): string[] {
  return Array.from(normalizeKana(text));
}

/** Resultado por posición: las del objetivo y, después, las escritas de más. */
export function compareKana(target: string, typed: string): CharResult[] {
  const t = splitKana(target);
  const w = splitKana(typed);
  const out: CharResult[] = t.map((expected, i) => {
    const got = w[i];
    if (got === undefined) return { expected, typed: '', status: 'pending' };
    return { expected, typed: got, status: got === expected ? 'ok' : 'wrong' };
  });
  for (let i = t.length; i < w.length; i++) out.push({ expected: '', typed: w[i]!, status: 'extra' });
  return out;
}

/** ¿Lo escrito coincide hasta donde llega con el principio del objetivo? */
export function isCorrectPrefix(target: string, typed: string): boolean {
  return normalizeKana(target).startsWith(normalizeKana(typed));
}

/** ¿Lo escrito es exactamente el objetivo? */
export function isComplete(target: string, typed: string): boolean {
  return normalizeKana(target) === normalizeKana(typed);
}

/** Primera posición incorrecta (o -1 si todo lo escrito es correcto). */
export function firstErrorIndex(target: string, typed: string): number {
  return compareKana(target, typed).findIndex((r) => r.status === 'wrong' || r.status === 'extra');
}
