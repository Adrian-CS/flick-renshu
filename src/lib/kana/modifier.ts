/**
 * Tecla 小゛゜: cada toque pasa la kana anterior a la siguiente de su ciclo.
 * Ciclos comprobados en iOS: つ→っ→づ→つ, は→ば→ぱ→は, か→が→か, や→ゃ→や,
 * あ→ぁ→あ, う→ぅ→ゔ→う.
 */
import { MOD_STROKE, strokeFor, type Stroke } from './keys';

function pairs(plain: string, other: string): string[][] {
  return Array.from(plain).map((c, i) => [c, other[i]!]);
}

/** Cada ciclo empieza por la kana que se escribe con un gesto. */
export const MODIFIER_CYCLES: readonly (readonly string[])[] = [
  // pequeñas
  ...pairs('あいえお', 'ぁぃぇぉ'),
  ['う', 'ぅ', 'ゔ'],
  ...pairs('やゆよ', 'ゃゅょ'),
  // dakuten
  ...pairs('かきくけこさしすせそたちてと', 'がぎぐげござじずぜぞだぢでど'),
  ['つ', 'っ', 'づ'],
  // dakuten + handakuten
  ...Array.from('はひふへほ').map((c, i) => [c, 'ばびぶべぼ'[i]!, 'ぱぴぷぺぽ'[i]!]),
];

const CYCLE_OF = new Map<string, { cycle: readonly string[]; index: number }>();
for (const cycle of MODIFIER_CYCLES) cycle.forEach((k, index) => CYCLE_OF.set(k, { cycle, index }));

/** Resultado de pulsar 小゛゜ tras `kana`, o null si no hace nada. */
export function applyModifier(kana: string): string | null {
  const c = CYCLE_OF.get(kana);
  if (!c) return null;
  return c.cycle[(c.index + 1) % c.cycle.length]!;
}

/** Gestos para escribir una kana: el de su base y tantos 小゛゜ como haga falta. */
export function strokesForKana(kana: string): Stroke[] | null {
  const direct = strokeFor(kana);
  if (direct) return [direct];
  const c = CYCLE_OF.get(kana);
  if (!c) return null;
  const base = strokeFor(c.cycle[0]!);
  if (!base) return null;
  return [base, ...Array<Stroke>(c.index).fill(MOD_STROKE)];
}

/** Secuencia de gestos para un texto en hiragana, o null si algo no se puede escribir. */
export function strokesFor(text: string): Stroke[] | null {
  const out: Stroke[] = [];
  for (const ch of Array.from(text)) {
    const s = strokesForKana(ch);
    if (!s) return null;
    out.push(...s);
  }
  return out;
}
