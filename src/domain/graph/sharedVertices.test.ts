import { describe, it, expect } from 'vitest';
import { computeSharedVertexIds } from './sharedVertices';
import type { Connection } from '../parser/types';

const conn = (
  a: string,
  b: string,
  shared: string[],
): Connection => ({
  shapeA: a,
  shapeB: b,
  sharedVertexIds: shared,
});

describe('computeSharedVertexIds', () => {
  it('蝴蝶結型：兩個 Shape 共用 1 個頂點', () => {
    const result = computeSharedVertexIds(
      [conn('s1', 's2', ['v1'])],
      new Set(['s1', 's2']),
    );
    expect(result).toEqual(new Set(['v1']));
  });

  it('共用邊：兩個 Shape 共用 2 個頂點', () => {
    const result = computeSharedVertexIds(
      [conn('s1', 's2', ['v1', 'v2'])],
      new Set(['s1', 's2']),
    );
    expect(result).toEqual(new Set(['v1', 'v2']));
  });

  it('三個 Shape 兩兩共用 → 合併所有共用點', () => {
    const result = computeSharedVertexIds(
      [
        conn('s1', 's2', ['v1']),
        conn('s1', 's3', ['v2']),
        conn('s2', 's3', ['v3']),
      ],
      new Set(['s1', 's2', 's3']),
    );
    expect(result).toEqual(new Set(['v1', 'v2', 'v3']));
  });

  it('一端不可見 → 該 Connection 不算', () => {
    const result = computeSharedVertexIds(
      [conn('s1', 's2', ['v1'])],
      new Set(['s1']),   // s2 不可見
    );
    expect(result.size).toBe(0);
  });

  it('兩端都不可見 → 不算', () => {
    const result = computeSharedVertexIds(
      [conn('s1', 's2', ['v1'])],
      new Set(),
    );
    expect(result.size).toBe(0);
  });

  it('多個 Connection 混和可見/不可見 → 只算可見的', () => {
    const result = computeSharedVertexIds(
      [
        conn('s1', 's2', ['v1']),
        conn('s2', 's3', ['v2']),
        conn('s3', 's4', ['v3']),
      ],
      new Set(['s1', 's2', 's3']),   // s4 不可見
    );
    expect(result).toEqual(new Set(['v1', 'v2']));
  });

  it('空輸入 → 空集合', () => {
    expect(computeSharedVertexIds([], new Set()).size).toBe(0);
  });

  it('共用點重複出現在多個 Connection → 去重', () => {
    const result = computeSharedVertexIds(
      [
        conn('s1', 's2', ['v1']),
        conn('s2', 's3', ['v1']),   // v1 又出現
      ],
      new Set(['s1', 's2', 's3']),
    );
    expect(result).toEqual(new Set(['v1']));
  });
});