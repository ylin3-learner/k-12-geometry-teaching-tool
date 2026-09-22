import { describe, it, expect } from 'vitest';
import { findSnapTarget } from './snapVertex';
import type { Vertex } from '../parser/types';

const v = (id: string, x: number, y: number): Vertex => ({
  id,
  name: id,
  position: { x, y },
});

describe('findSnapTarget', () => {
  it('距離小於 epsilon → 找到最近的頂點', () => {
    const target = findSnapTarget({ x: 104, y: 103 }, [v('v1', 100, 100)], 8);
    expect(target?.id).toBe('v1');
  });

  it('距離大於 epsilon → 回傳 null', () => {
    const target = findSnapTarget({ x: 120, y: 120 }, [v('v1', 100, 100)], 8);
    expect(target).toBeNull();
  });

  it('多個頂點都在範圍內 → 回傳最近的', () => {
    const target = findSnapTarget(
      { x: 103, y: 100 },
      [v('v1', 100, 100), v('v2', 105, 100)],
      8,
    );
    expect(target?.id).toBe('v2');   // v2 距 2，v1 距 3
  });

  it('空清單 → null', () => {
    expect(findSnapTarget({ x: 0, y: 0 }, [], 8)).toBeNull();
  });

  it('恰好等於 epsilon → 不算吸附（< 而非 <=）', () => {
    const target = findSnapTarget({ x: 108, y: 100 }, [v('v1', 100, 100)], 8);
    expect(target).toBeNull();
  });
});