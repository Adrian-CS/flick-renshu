/**
 * Lecciones:
 *   1. Fila por fila (あ…わ y puntuación): toques → 4 direcciones → mezcla.
 *   2. Por dirección (todas las «izquierda = い»…).
 *   3. ゛゜ y pequeñas con 小゛゜.
 * (4. Palabras y frases: F4.)
 */
import { DIRECTIONS, FAN_KEYS, MODIFIER_CYCLES, flickKana, strokeId, strokesFor, type Direction, type FanKeyId } from './kana';

export type PhaseId = 'tap' | 'dirs' | 'mix';

export const PHASE_LABEL: Readonly<Record<PhaseId, string>> = {
  tap: 'Toques',
  dirs: 'Direcciones',
  mix: 'Mezcla',
};

export interface Lesson {
  id: string;
  group: 1 | 2 | 3;
  title: string;
  subtitle: string;
  phases: readonly PhaseId[];
}

export const GROUP_LABEL: Readonly<Record<Lesson['group'], string>> = {
  1: 'Fila por fila',
  2: 'Por dirección',
  3: '゛゜ y pequeñas',
};

/** Hiragana (y ー): lo que se practica. Los 「」 y la puntuación van aparte. */
function isKana(s: string): boolean {
  return /^[ぁ-ゖー]$/.test(s);
}

/** Kana de una tecla en una dirección, si es kana. */
function kanaAt(key: FanKeyId, dir: Direction): string | null {
  const k = flickKana(key, dir);
  return k && isKana(k) ? k : null;
}

const ROW_KEYS: readonly FanKeyId[] = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'];
const PUNCT = ['、', '。', '？', '！'];

const ARROW: Readonly<Record<Direction, string>> = { tap: 'toque', left: '←', up: '↑', right: '→', down: '↓' };

function rowKana(key: FanKeyId): string[] {
  return DIRECTIONS.map((d) => kanaAt(key, d)).filter((k): k is string => k !== null);
}

const MODIFIED = MODIFIER_CYCLES.flatMap((c) => c.slice(1));
const DAKUTEN = MODIFIED.filter((k) => /[がぎぐげござじずぜぞだぢづでどばびぶべぼゔ]/.test(k));
const HANDAKUTEN = MODIFIED.filter((k) => /[ぱぴぷぺぽ]/.test(k));
const SMALL = MODIFIED.filter((k) => /[ぁぃぅぇぉっゃゅょゎ]/.test(k));
const YOUON = [...'きしちにひみりぎじびぴ'].flatMap((c) => [...'ゃゅょ'].map((y) => c + y));

export const LESSONS: readonly Lesson[] = [
  ...ROW_KEYS.map(
    (key): Lesson => ({
      id: `row-${key}`,
      group: 1,
      title: `${flickKana(key, 'tap')} 行`,
      subtitle: rowKana(key).join(' '),
      phases: ['tap', 'dirs', 'mix'],
    }),
  ),
  { id: 'punct', group: 1, title: '、。？！', subtitle: 'Puntuación', phases: ['mix'] },
  ...(['tap', 'left', 'up', 'right', 'down'] as const).map(
    (dir): Lesson => ({
      id: `dir-${dir}`,
      group: 2,
      title: `${ARROW[dir]} = ${flickKana('a', dir)}`,
      subtitle: FAN_KEYS.map((k) => kanaAt(k, dir)).filter(Boolean).join(' '),
      phases: ['mix'],
    }),
  ),
  { id: 'dir-all', group: 2, title: 'Todas las direcciones', subtitle: 'Todas las kana de un gesto', phases: ['mix'] },
  { id: 'dakuten', group: 3, title: '゛ dakuten', subtitle: 'が ざ だ ば… (1 toque)', phases: ['mix'] },
  { id: 'handakuten', group: 3, title: '゜ handakuten', subtitle: 'ぱ ぴ ぷ ぺ ぽ (2 toques) y ば…', phases: ['mix'] },
  { id: 'small', group: 3, title: 'Pequeñas', subtitle: 'っ ゃ ゅ ょ ぁ ぃ ぅ ぇ ぉ ゎ', phases: ['mix'] },
  { id: 'youon', group: 3, title: 'きゃ・しゅ・ちょ…', subtitle: 'Kana + ゃゅょ pequeña', phases: ['mix'] },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export interface Pool {
  /** Elementos que practicar. */
  items: string[];
  /** Elementos con peso extra (lo nuevo de la lección). */
  focus: Set<string>;
}

/** Elementos de una fase de una lección. */
export function lessonPool(lessonId: string, phase: PhaseId): Pool {
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.phases.includes(phase)) throw new Error(`Lección desconocida: ${lessonId}/${phase}`);

  if (lessonId.startsWith('row-')) {
    const key = lessonId.slice(4) as FanKeyId;
    const upTo = ROW_KEYS.slice(0, ROW_KEYS.indexOf(key) + 1);
    const own = rowKana(key);
    const tap = kanaAt(key, 'tap')!;
    switch (phase) {
      case 'tap': {
        const items = upTo.map((k) => kanaAt(k, 'tap')!);
        return { items, focus: new Set([tap]) };
      }
      case 'dirs': {
        const items = own.filter((k) => k !== tap);
        return { items, focus: new Set(items) };
      }
      case 'mix':
        return { items: upTo.flatMap(rowKana), focus: new Set(own) };
    }
  }
  if (lessonId === 'punct') return all(PUNCT);
  if (lessonId === 'dir-all') return all(ROW_KEYS.flatMap(rowKana));
  if (lessonId.startsWith('dir-')) {
    const dir = lessonId.slice(4) as Direction;
    return all(ROW_KEYS.map((k) => kanaAt(k, dir)).filter((k): k is string => k !== null));
  }
  switch (lessonId) {
    case 'dakuten':
      return all(DAKUTEN);
    case 'handakuten': {
      // con las ば de contraste: ぱ = は + 2 toques, ば = は + 1
      const ba = DAKUTEN.filter((k) => /[ばびぶべぼ]/.test(k));
      return { items: [...HANDAKUTEN, ...ba], focus: new Set(HANDAKUTEN) };
    }
    case 'small':
      return all(SMALL);
    case 'youon':
      return all(YOUON);
  }
  throw new Error(`Lección desconocida: ${lessonId}`);
}

function all(items: string[]): Pool {
  return { items: [...new Set(items)], focus: new Set() };
}

/**
 * Gestos que entrena una lección: los de su material nuevo (el foco de cada fase, o todo
 * si no hay foco). En «か 行» son los de か き く け こ, no los de la fila あ que se repasa.
 */
export function lessonStrokeIds(lessonId: string): string[] {
  const lesson = getLesson(lessonId);
  if (!lesson) return [];
  const ids = new Set<string>();
  for (const phase of lesson.phases) {
    const pool = lessonPool(lessonId, phase);
    const items = pool.focus.size > 0 ? [...pool.focus] : pool.items;
    for (const item of items) for (const s of strokesFor(item) ?? []) ids.add(strokeId(s));
  }
  return [...ids];
}
