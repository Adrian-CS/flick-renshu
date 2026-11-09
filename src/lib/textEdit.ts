/** Edición del texto escrito con el teclado virtual (sin cursor: siempre al final). */
import { applyModifier } from './kana';

export type EditAction =
  | { type: 'insert'; text: string }
  | { type: 'backspace' }
  /** 小゛゜ sobre la última kana (si no se puede modificar, no hace nada) */
  | { type: 'modify' }
  | { type: 'clear' };

export function applyEdit(text: string, action: EditAction): string {
  switch (action.type) {
    case 'insert':
      return text + action.text;
    case 'backspace':
      // por puntos de código, no por unidades UTF-16
      return Array.from(text).slice(0, -1).join('');
    case 'modify': {
      const chars = Array.from(text);
      const next = chars.length ? applyModifier(chars[chars.length - 1]!) : null;
      return next ? chars.slice(0, -1).join('') + next : text;
    }
    case 'clear':
      return '';
  }
}
