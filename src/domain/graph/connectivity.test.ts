import { describe, it, expect } from 'vitest';
import { tokenize } from '../parser/tokenizer';
import { parse } from '../parser/parser';
import { resolveShapesFromStatements } from '../semantic/resolveShapesFromStatements';
import { findConnections } from './connectivity';
import type { Vertex } from '../parser/types';

const v = (id: string, name: string): Vertex => ({
  id,
  name,
  position: { x: 0, y: 0 },
});

// ── helper：從文字 + 座標產生 Shape[] 與 Connection[] ──
const run = (input: string, vertices: Vertex[]) => {
  const { shapes } = resolveShapesFromStatements(
    parse(tokenize(input)).statements,
    vertices,
  );
  return { shapes, connections: findConnections(shapes) };
};

describe('findConnections', () => {
  it('兩個獨立 Shape（無共用頂點）→ 0 個 Connection', () => {
    const { connections } = run('△ABC和△DEF', [
      v('v1', 'A'), v('v2', 'B'), v('v3', 'C'),
      v('v4', 'D'), v('v5', 'E'), v('v6', 'F'),
    ]);
    expect(connections).toHaveLength(0);
  });

  it('蝴蝶結型：△ABC 和 △ADE 共用 A → 1 個 Connection，sharedVertexIds = [v1]', () => {
    const { connections } = run('△ABC和△ADE', [
      v('v1', 'A'), v('v2', 'B'), v('v3', 'C'),
      v('v4', 'D'), v('v5', 'E'),
    ]);
    expect(connections).toHaveLength(1);
    expect(connections[0].sharedVertexIds).toEqual(['v1']);
  });

  it('共用邊：△ABC 和 △ABD 共用 A、B → 1 個 Connection，sharedVertexIds = [v1, v2]', () => {
    const { connections } = run('△ABC和△ABD', [
      v('v1', 'A'), v('v2', 'B'), v('v3', 'C'), v('v4', 'D'),
    ]);
    expect(connections).toHaveLength(1);
    expect(connections[0].sharedVertexIds).toEqual(['v1', 'v2']);
  });

  it('巢狀型：△ACB 和 △AEF 共用 A → 1 個 Connection', () => {
    const { connections } = run('△ACB和△AEF', [
      v('v1', 'A'), v('v2', 'C'), v('v3', 'B'),
      v('v4', 'E'), v('v5', 'F'),
    ]);
    expect(connections).toHaveLength(1);
    expect(connections[0].sharedVertexIds).toEqual(['v1']);
  });

  it('三個 Shape 兩兩共用頂點 → 3 個 Connection', () => {
    // △ABC、△ABD、△ACD 兩兩比較：
    //   ABC-ABD 共用 A,B
    //   ABC-ACD 共用 A,C
    //   ABD-ACD 共用 A,D
    const { connections } = run('△ABC，△ABD，△ACD', [
      v('v1', 'A'), v('v2', 'B'), v('v3', 'C'), v('v4', 'D'),
    ]);
    expect(connections).toHaveLength(3);
    const pairs = connections.map((c) => [c.shapeA, c.shapeB].sort().join('|'));
    expect(new Set(pairs).size).toBe(3);
  });

  it('shapeA / shapeB 順序穩定（依 shapes 陣列順序）', () => {
    const { connections } = run('△ABC和△ADE', [
      v('v1', 'A'), v('v2', 'B'), v('v3', 'C'),
      v('v4', 'D'), v('v5', 'E'),
    ]);
    // shapeA 應該是第一個出現的 Shape（△ABC）
    expect(connections[0].shapeA).toContain('tri-0');
    expect(connections[0].shapeB).toContain('tri-1');
  });

  it('空 Shape[] → 空 Connection[]', () => {
    expect(findConnections([])).toEqual([]);
  });

  it('單一 Shape → 空 Connection[]', () => {
    const { connections } = run('△ABC', [
      v('v1', 'A'), v('v2', 'B'), v('v3', 'C'),
    ]);
    expect(connections).toEqual([]);
  });

  it('共用兩個頂點以上，sharedVertexIds 按 shapeA 的順序', () => {
    // △ABC 和 △ABD 共用 A、B（A、B 是 shapeA 的 vertexIds 第 1、2 個）
    const { connections } = run('△ABC和△ABD', [
      v('v1', 'A'), v('v2', 'B'), v('v3', 'C'), v('v4', 'D'),
    ]);
    expect(connections[0].sharedVertexIds).toEqual(['v1', 'v2']);
  });
});