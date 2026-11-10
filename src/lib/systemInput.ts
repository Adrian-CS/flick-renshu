/**
 * Modo «teclado del sistema»: se escribe en un <input> con el teclado フリック real del
 * iPhone y se compara el texto con el objetivo. El IME compone: mientras tanto, el texto
 * está sin confirmar (y puede tener una kana que 小゛゜ todavía va a cambiar: か → が).
 */
import { sameModifierCycle, toHiragana } from './kana';

/** Normalización para comparar: NFKC (anchos), katakana → hiragana, sin espacios. */
export function normalizeForCompare(text: string): string {
  return toHiragana(text.normalize('NFKC')).replace(/\s+/g, '');
}

export function chars(text: string): string[] {
  return Array.from(normalizeForCompare(text));
}

const KANJI = /[㐀-鿿豈-﫿々〆]/;

export function hasKanji(text: string): boolean {
  return KANJI.test(text);
}

export type MatchState = 'ok' | 'partial' | 'wrong';

export interface Match {
  /** Caracteres del objetivo ya escritos bien desde el principio. */
  matched: number;
  /**
   * ok: todo lo escrito coincide; partial: la última kana es una base que 小゛゜ aún puede
   * convertir en la esperada (つ → っ); wrong: hay algo que no es el principio del objetivo.
   */
  state: MatchState;
}

/** Compara lo escrito con el principio del objetivo (ambos ya normalizados, como arrays). */
export function matchChars(typed: readonly string[], target: readonly string[]): Match {
  let i = 0;
  while (i < typed.length && i < target.length && typed[i] === target[i]) i++;
  if (i === typed.length) return { matched: i, state: 'ok' };
  if (i === typed.length - 1 && i < target.length && sameModifierCycle(typed[i]!, target[i]!)) {
    return { matched: i, state: 'partial' };
  }
  return { matched: i, state: 'wrong' };
}

/** Parte confirmada del valor del input: quita el texto en composición del final. */
export function committedPart(value: string, composing: string): string {
  if (composing && value.endsWith(composing)) return value.slice(0, value.length - composing.length);
  return value;
}

/**
 * Qué comparar: si el objetivo es solo kana, todo el valor (lo que se compone es kana);
 * si tiene kanji, solo lo confirmado (lo que se compone aún no se ha convertido).
 */
export function comparableText(value: string, composing: string, targetHasKanji: boolean): string {
  return targetHasKanji ? committedPart(value, composing) : value;
}
