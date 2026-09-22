import { describe, it, expect } from 'vitest';
import { tokenize } from '../parser/tokenizer';
import { parse } from '../parser/parser';
import { resolveShapesFromStatements } from './resolveShapesFromStatements';
import type { Vertex } from '../parser/types';

// ── helper：建立 Vertex ──
const v = (id: string, name: string, x = 0, y = 0): Vertex => ({
  id,
  name,
  position: { x, y },
});

// ── helper：解析文字 + 合成 ──
const resolve = (input: string, vertices: Vertex[]) =>
  resolveShapesFromStatements(parse(tokenize(input)).statements, vertices);

describe('resolveShapesFromStatements', () => {
  it('△ABC + 3 個座標 → 1 個 Shape', () => {
    const r = resolve('△ABC', [
      v('v1', 'A', 0, 0),
      v('v2', 'B', 100, 0),
      v('v3', 'C', 50, 80),
    ]);
    expect(r.shapes).toHaveLength(1);
    expect(r.shapes[0].name).toBe('△ABC');
    expect(r.shapes[0].vertexIds).toEqual(['v1', 'v2', 'v3']);
    expect(r.shapes[0].visible).toBe(true);
    expect(r.shapes[0].source).toBe('text');
  });

  it('vertexIds 順序跟 Statement 宣告一致（不依 Vertex 陣列順序）', () => {
    const r = resolve('△ABC', [
      v('v3', 'C'),
      v('v1', 'A'),
      v('v2', 'B'),
    ]);
    expect(r.shapes[0].vertexIds).toEqual(['v1', 'v2', 'v3']);
  });

  it('△ABC 但只點 A、B → 不合成，incomplete 記錄缺 C', () => {
    const r = resolve('△ABC', [v('v1', 'A'), v('v2', 'B')]);
    expect(r.shapes).toHaveLength(0);
    expect(r.incomplete).toHaveLength(1);
    expect(r.incomplete[0].name).toBe('△ABC');
    expect(r.incomplete[0].missingLabels).toEqual(['C']);
  });

  it('蝴蝶結型：△ABC和△ADE + 5 個座標 → 2 個 Shape', () => {
    const r = resolve('△ABC和△ADE', [
      v('v1', 'A'),
      v('v2', 'B'),
      v('v3', 'C'),
      v('v4', 'D'),
      v('v5', 'E'),
    ]);
    expect(r.shapes).toHaveLength(2);
    expect(r.shapes[0].name).toBe('△ABC');
    expect(r.shapes[0].vertexIds).toEqual(['v1', 'v2', 'v3']);
    expect(r.shapes[1].name).toBe('△ADE');
    expect(r.shapes[1].vertexIds).toEqual(['v1', 'v4', 'v5']);
  });

  it('□ABCD + 4 個座標 → 1 個 Shape，名稱為「四邊形ABCD」', () => {
    const r = resolve('□ABCD', [
      v('v1', 'A'),
      v('v2', 'B'),
      v('v3', 'C'),
      v('v4', 'D'),
    ]);
    expect(r.shapes).toHaveLength(1);
    expect(r.shapes[0].name).toBe('四邊形ABCD');
    expect(r.shapes[0].vertexIds).toEqual(['v1', 'v2', 'v3', 'v4']);
  });

  it('非定義性 Statement（AC=4）不產生 Shape', () => {
    const r = resolve('AC=4', [v('v1', 'A'), v('v2', 'C')]);
    expect(r.shapes).toHaveLength(0);
    expect(r.incomplete).toHaveLength(0);
  });

  it('混合輸入：△ABC，AC=4 → 只合成 △ABC', () => {
    const r = resolve('△ABC，AC=4', [
      v('v1', 'A'),
      v('v2', 'B'),
      v('v3', 'C'),
    ]);
    expect(r.shapes).toHaveLength(1);
    expect(r.shapes[0].name).toBe('△ABC');
  });

  it('座標刻意不共線（E 偏離 AB）依然正確合成（見 README 6.13）', () => {
    // △ABE 是「不應該共線」的三角形，但即便三點刻意排成一直線
    // 系統也不驗證，只按宣告順序連線
    const r = resolve('△ABE', [
      v('v1', 'A', 0, 0),
      v('v2', 'B', 100, 0),
      v('v3', 'E', 50, 999),  // 遠離 AB 線段——系統不在意
    ]);
    expect(r.shapes).toHaveLength(1);
    expect(r.shapes[0].vertexIds).toEqual(['v1', 'v2', 'v3']);
  });

  it('部分 Shape 完成、部分缺座標 → 各自處理', () => {
    const r = resolve('△ABC和△ADE', [
      v('v1', 'A'),
      v('v2', 'B'),
      v('v3', 'C'),
      // 沒有 D、E
    ]);
    expect(r.shapes).toHaveLength(1);
    expect(r.shapes[0].name).toBe('△ABC');
    expect(r.incomplete).toHaveLength(1);
    expect(r.incomplete[0].name).toBe('△ADE');
    expect(r.incomplete[0].missingLabels).toEqual(['D', 'E']);
  });

  it('空輸入 → 空結果', () => {
    const r = resolve('', []);
    expect(r.shapes).toHaveLength(0);
    expect(r.incomplete).toHaveLength(0);
  });

  it('source 參數可傳入 "manual"', () => {
    const r = resolveShapesFromStatements(
      parse(tokenize('△ABC')).statements,
      [v('v1', 'A'), v('v2', 'B'), v('v3', 'C')],
      'manual',
    );
    expect(r.shapes[0].source).toBe('manual');
  });

  it('id 穩定：相同輸入產生相同 id', () => {
    const input = '△ABC';
    const verts = [v('v1', 'A'), v('v2', 'B'), v('v3', 'C')];
    const r1 = resolve(input, verts);
    const r2 = resolve(input, verts);
    expect(r1.shapes[0].id).toBe(r2.shapes[0].id);
  });
});