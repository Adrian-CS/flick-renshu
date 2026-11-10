/**
 * Selección de palabras comunes de JMdict (formato jmdict-simplified) para practicar:
 * lectura en hiragana escribible con el teclado フリック y forma con kanji para reconocerla.
 * Sin imports: lo usan tanto el script de build (node, TypeScript sin compilar) como Vitest.
 */

export interface JmKanji {
  common: boolean;
  text: string;
  tags: string[];
}

export interface JmKana {
  common: boolean;
  text: string;
  tags: string[];
  appliesToKanji: string[];
}

export interface JmSense {
  misc: string[];
}

export interface JmWord {
  id: string;
  kanji: JmKanji[];
  kana: JmKana[];
  sense: JmSense[];
}

/** [lectura en hiragana, formas con kanji separadas por ・ ('' si se escribe solo en kana)] */
export type WordRow = [reading: string, kanji: string];

/** Hiragana que se escribe con el teclado (sin ゐ ゑ ゕ ゖ) y ー, sin empezar por ー. */
export function isTypeableHiragana(s: string): boolean {
  return /^[ぁ-ゔー]+$/.test(s) && !/[ゐゑ]/.test(s) && !s.startsWith('ー');
}

/** Formas irregulares, anticuadas o solo de búsqueda. */
const BAD_FORM_TAGS = new Set(['ik', 'iK', 'ok', 'oK', 'rk', 'rK', 'sk', 'sK', 'io']);
/** Acepciones que no queremos (arcaicas, obsoletas, vulgares, despectivas…). */
const BAD_SENSE_MISC = new Set(['arch', 'obs', 'vulg', 'derog', 'X', 'sens']);

const MAX_KANJI_FORMS = 3;

export interface SelectOptions {
  minLength?: number;
  maxLength?: number;
}

export function selectWords(words: readonly JmWord[], opts: SelectOptions = {}): WordRow[] {
  const minLength = opts.minLength ?? 2;
  const maxLength = opts.maxLength ?? 8;
  const byReading = new Map<string, string[]>();

  for (const w of words) {
    if (w.sense.length > 0 && w.sense.every((s) => s.misc.some((m) => BAD_SENSE_MISC.has(m)))) continue;
    if (w.sense.some((s) => s.misc.some((m) => m === 'vulg' || m === 'X'))) continue;

    const kana = w.kana.find(
      (k) =>
        k.common &&
        isTypeableHiragana(k.text) &&
        !k.tags.some((t) => BAD_FORM_TAGS.has(t)) &&
        [...k.text].length >= minLength &&
        [...k.text].length <= maxLength,
    );
    if (!kana) continue;

    const kanji = w.kanji.find(
      (j) =>
        j.common &&
        !j.tags.some((t) => BAD_FORM_TAGS.has(t)) &&
        (kana.appliesToKanji.includes('*') || kana.appliesToKanji.includes(j.text)),
    );

    const forms = byReading.get(kana.text) ?? [];
    if (kanji && !forms.includes(kanji.text) && forms.length < MAX_KANJI_FORMS) forms.push(kanji.text);
    byReading.set(kana.text, forms);
  }

  const rows: WordRow[] = [...byReading].map(([r, forms]) => [r, forms.join('・')]);
  return rows.sort((a, b) => [...a[0]].length - [...b[0]].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

/** Extrae el primer fichero de un .zip (deflate o sin comprimir), sin dependencias. */
export async function unzipFirst(zip: Uint8Array): Promise<Uint8Array> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip: no se encuentra el directorio central');
  const cd = view.getUint32(eocd + 16, true);
  if (view.getUint32(cd, true) !== 0x02014b50) throw new Error('zip: directorio central no válido');
  const method = view.getUint16(cd + 10, true);
  const compressedSize = view.getUint32(cd + 20, true);
  const localOffset = view.getUint32(cd + 42, true);
  if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('zip: cabecera local no válida');
  const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
  const data = zip.subarray(dataStart, dataStart + compressedSize);
  if (method === 0) return data;
  if (method !== 8) throw new Error(`zip: compresión ${method} no soportada`);
  const { inflateRawSync } = await import('node:zlib');
  return new Uint8Array(inflateRawSync(data));
}
