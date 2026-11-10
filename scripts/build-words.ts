/**
 * Genera public/data/words.json con las palabras comunes de JMdict.
 *
 *   npm run data:words                  descarga la versión fijada abajo
 *   npm run data:words -- <fichero>     usa un .zip o .json de jmdict-simplified ya descargado
 *
 * Fuente: JMdict (EDRDG), CC BY-SA 4.0, en el formato JSON de jmdict-simplified
 * (https://github.com/scriptin/jmdict-simplified), fichero «jmdict-eng-common».
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { selectWords, unzipFirst, type JmWord } from './words/filter.ts';

const TAG = '3.6.2+20261102210542';
const URL = `https://github.com/scriptin/jmdict-simplified/releases/download/${encodeURIComponent(TAG)}/jmdict-eng-common-${encodeURIComponent(TAG)}.json.zip`;
const OUT = join(import.meta.dirname, '..', 'public', 'data', 'words.json');

async function load(): Promise<{ bytes: Uint8Array; origin: string }> {
  const arg = process.argv[2];
  if (arg) return { bytes: new Uint8Array(readFileSync(arg)), origin: arg };
  console.log(`Descargando ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Descarga fallida: HTTP ${res.status}`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), origin: URL };
}

const { bytes, origin } = await load();
const sha256 = createHash('sha256').update(bytes).digest('hex');
const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
const json = JSON.parse(new TextDecoder().decode(isZip ? await unzipFirst(bytes) : bytes)) as {
  version: string;
  dictDate: string;
  commonOnly: boolean;
  words: JmWord[];
};
if (!json.commonOnly) console.warn('⚠ El fichero no es la versión «common»: se filtra igualmente por el indicador common.');

const rows = selectWords(json.words);
const data = {
  meta: {
    source: 'JMdict (Electronic Dictionary Research and Development Group)',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project',
    format: `jmdict-simplified ${json.version}`,
    dictDate: json.dictDate,
    file: origin.split('/').pop(),
    sha256,
    filter: 'entradas comunes (news1/ichi1/spec1/spec2/gai1), lectura en hiragana escribible, 2–8 kana',
    count: rows.length,
  },
  words: rows,
};
mkdirSync(join(OUT, '..'), { recursive: true });
writeFileSync(OUT, JSON.stringify(data).replaceAll('],[', '],\n['));
console.log(`✓ ${rows.length} palabras → public/data/words.json (JMdict ${json.dictDate})`);
