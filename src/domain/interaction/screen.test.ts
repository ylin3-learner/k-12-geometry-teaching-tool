import { describe, it, expect } from 'vitest';
import { SNAP_EPSILON_PX, worldEpsilonFromScale } from './screen';

describe('screen', () => {
  it('SNAP_EPSILON_PX 為 8', () => {
    expect(SNAP_EPSILON_PX).toBe(8);
  });

  it('scale=1 → worldEpsilon = 8', () => {
    expect(worldEpsilonFromScale(1)).toBe(8);
  });

  it('scale=0.5（縮小一半）→ worldEpsilon = 16', () => {
    expect(worldEpsilonFromScale(0.5)).toBe(16);
  });

  it('scale=2（放大一倍）→ worldEpsilon = 4', () => {
    expect(worldEpsilonFromScale(2)).toBe(4);
  });

  it('scale <= 0 → 回傳 screenEpsilonPx（防禦）', () => {
    expect(worldEpsilonFromScale(0)).toBe(8);
    expect(worldEpsilonFromScale(-1)).toBe(8);
  });
});