import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { isTypeableHiragana, selectWords, unzipFirst, type JmWord } from '../../scripts/words/filter.ts';

function word(p: Partial<JmWord> & { kana: JmWord['kana'] }): JmWord {
  return { id: '1', kanji: [], sense: [{ misc: [] }], ...p };
}
const kana = (text: string, common = true, tags: string[] = [], appliesToKanji = ['*']) => ({ text, common, tags, appliesToKanji });
const kanji = (text: string, common = true, tags: string[] = []) => ({ text, common, tags });

describe('isTypeableHiragana', () => {
  it('hiragana y ー', () => {
    expect(isTypeableHiragana('らーめん')).toBe(true);
    expect(isTypeableHiragana('ゔぁ')).toBe(true);
  });
  it('rechaza katakana, kanji, ゐゑ y ー inicial', () => {
    for (const s of ['カタ', '学校', 'ゐる', 'ゑ', 'ーあ', 'a', '']) expect(isTypeableHiragana(s)).toBe(false);
  });
});

describe('selectWords', () => {
  it('lectura común en hiragana + kanji común aplicable', () => {
    const w = word({ kanji: [kanji('学校')], kana: [kana('がっこう')] });
    expect(selectWords([w])).toEqual([['がっこう', '学校']]);
  });

  it('palabra solo en kana', () => {
    expect(selectWords([word({ kana: [kana('ちょっと')] })])).toEqual([['ちょっと', '']]);
  });

  it('salta lecturas no comunes, katakana o con etiquetas raras', () => {
    expect(selectWords([word({ kana: [kana('かっと', false)] })])).toEqual([]);
    expect(selectWords([word({ kana: [kana('カッと')] })])).toEqual([]);
    expect(selectWords([word({ kana: [kana('ふるい', true, ['ok'])] })])).toEqual([]);
  });

  it('elige la primera lectura válida', () => {
    const w = word({ kana: [kana('カメラ'), kana('かめら')] });
    expect(selectWords([w])).toEqual([['かめら', '']]);
  });

  it('kanji: común, sin etiquetas raras y al que se aplica la lectura', () => {
    const w = word({
      kanji: [kanji('旧字', true, ['oK']), kanji('稀', false), kanji('上'), kanji('揚')],
      kana: [kana('あげ', true, [], ['揚'])],
    });
    expect(selectWords([w])).toEqual([['あげ', '揚']]);
  });

  it('misma lectura en varias entradas: une los kanji (máx. 3)', () => {
    const ws = ['橋', '箸', '端', '嘴'].map((k, i) => word({ id: String(i), kanji: [kanji(k)], kana: [kana('はし')] }));
    expect(selectWords(ws)).toEqual([['はし', '橋・箸・端']]);
  });

  it('salta palabras arcaicas o vulgares', () => {
    expect(selectWords([word({ kana: [kana('いにしえ')], sense: [{ misc: ['arch'] }] })])).toEqual([]);
    expect(selectWords([word({ kana: [kana('あほう')], sense: [{ misc: [] }, { misc: ['vulg'] }] })])).toEqual([]);
  });

  it('longitud 2–8 y orden por longitud', () => {
    const ws = ['あ', 'かみ', 'いぬ', 'さくら', 'ながいながいことば'].map((r, i) => word({ id: String(i), kana: [kana(r)] }));
    expect(selectWords(ws).map((r) => r[0])).toEqual(['いぬ', 'かみ', 'さくら']);
  });
});

describe('unzipFirst', () => {
  it('extrae un zip deflate de un fichero', async () => {
    const content = new TextEncoder().encode('{"hola":"こんにちは"}'.repeat(20));
    const name = new TextEncoder().encode('a.json');
    const comp = deflateRawSync(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(0, 42);
    const cdOffset = 30 + name.length + comp.length;
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(46 + name.length, 12);
    eocd.writeUInt32LE(cdOffset, 16);
    const zip = Buffer.concat([local, name, comp, central, name, eocd]);
    expect(new TextDecoder().decode(await unzipFirst(new Uint8Array(zip)))).toBe(new TextDecoder().decode(content));
  });

  it('no es un zip: error', async () => {
    await expect(unzipFirst(new Uint8Array(100))).rejects.toThrow(/zip/);
  });
});
