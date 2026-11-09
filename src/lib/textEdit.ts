/** Edición del texto escrito con el teclado virtual (sin cursor: siempre al final). */

export type EditAction =
  | { type: 'insert'; text: string }
  | { type: 'backspace' }
  | { type: 'clear' };

export function applyEdit(text: string, action: EditAction): string {
  switch (action.type) {
    case 'insert':
      return text + action.text;
    case 'backspace':
      // por puntos de código, no por unidades UTF-16
      return Array.from(text).slice(0, -1).join('');
    case 'clear':
      return '';
  }
}
