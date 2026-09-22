import { describe, it, expect } from 'vitest';
import { composeManualShape } from './composeManualShape';
import type { Vertex } from '../parser/types';

const v = (id: string, name: string): Vertex => ({
  id,
  name,
  position: { x: 0, y: 0 },
});

describe('composeManualShape', () => {
  it('3 個頂點 → 三角形，名稱為 △ABC', () => {
    const r = composeManualShape(
      ['v1', 'v2', 'v3'],
      [v('v1', 'A'), v('v2', 'B'), v('v3', 'C')],
      'shape-1',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.shape.name).toBe('△ABC');
      expect(r.shape.vertexIds).toEqual(['v1', 'v2', 'v3']);
      expect(r.shape.source).toBe('manual');
      expect(r.shape.visible).toBe(true);
      expect(r.shape.id).toBe('shape-1');
    }
  });

  it('4 個頂點 → 四邊形，名稱為 四邊形ABCD', () => {
    const r = composeManualShape(
      ['v1', 'v2', 'v3', 'v4'],
      [v('v1', 'A'), v('v2', 'B'), v('v3', 'C'), v('v4', 'D')],
      'shape-2',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.shape.name).toBe('四邊形ABCD');
    }
  });

  it('少於 3 個頂點 → error', () => {
    const r = composeManualShape(['v1', 'v2'], [v('v1', 'A'), v('v2', 'B')], 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('至少');
  });

  it('多於 4 個頂點 → error', () => {
    const r = composeManualShape(
      ['v1', 'v2', 'v3', 'v4', 'v5'],
      [v('v1', 'A'), v('v2', 'B'), v('v3', 'C'), v('v4', 'D'), v('v5', 'E')],
      'x',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('MVP');
  });

  it('頂點 id 不存在 → error', () => {
    const r = composeManualShape(
      ['v1', 'v2', 'v999'],
      [v('v1', 'A'), v('v2', 'B')],
      'x',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('v999');
  });

  it('順序保留：點 A→C→B → △ACB', () => {
    const r = composeManualShape(
      ['v1', 'v3', 'v2'],
      [v('v1', 'A'), v('v2', 'B'), v('v3', 'C')],
      'shape-x',
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.shape.name).toBe('△ACB');
  });

  it('不會修改傳入的 vertexIds 陣列', () => {
    const input = ['v1', 'v2', 'v3'];
    const vertices = [v('v1', 'A'), v('v2', 'B'), v('v3', 'C')];
    composeManualShape(input, vertices, 'x');
    expect(input).toEqual(['v1', 'v2', 'v3']);
  });
});