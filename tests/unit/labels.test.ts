import { describe, expect, it } from 'vitest';
import { parseStrokeId, strokeLabel } from '@/lib/labels';

describe('labels', () => {
  it('parseStrokeId', () => {
    expect(parseStrokeId('ka:up')).toEqual({ key: 'ka', dir: 'up' });
    expect(parseStrokeId('xx:up')).toBeNull();
    expect(parseStrokeId('ka:diag')).toBeNull();
  });
  it('strokeLabel', () => {
    expect(strokeLabel('ka:up')).toBe('か ↑ = く');
    expect(strokeLabel('a:tap')).toBe('あ toque');
    expect(strokeLabel('mod:tap')).toBe('小゛゜');
    expect(strokeLabel('raro')).toBe('raro');
  });
});
