import { describe, it, expect } from 'vitest';
import {
  computeShapeOffsets,
  computeShapeVertexPositions,
  computeMaxExplodeDistance,
  resolveExplodeDistanceByShape,
} from './computeExplodeOffsets';
import type { Shape, Vertex } from '../parser/types';

const v = (id: string, x: number, y: number): Vertex => ({
  id,
  name: id,
  position: { x, y },
});

const shape = (
  id: string,
  vertexIds: string[],
  visible = true,
): Shape => ({
  id,
  name: id,
  vertexIds,
  visible,
  source: 'text',
});

describe('computeShapeOffsets', () => {
  it('空輸入 → 空 Map', () => {
    expect(computeShapeOffsets([], []).size).toBe(0);
  });

  it('蝴蝶結型：兩個形狀分往左右', () => {
    const offsets = computeShapeOffsets(
      [shape('s1', ['v1', 'v2', 'v3']), shape('s2', ['v1', 'v4', 'v5'])],
      [
        v('v1', 100, 100),
        v('v2', 50, 50),
        v('v3', 50, 150),
        v('v4', 150, 50),
        v('v5', 150, 150),
      ],
    );
    const d1 = offsets.get('s1');
    const d2 = offsets.get('s2');
    expect(d1?.x).toBeLessThan(0);
    expect(d2?.x).toBeGreaterThan(0);
  });

  it('巢狀型：小形狀和大形狀分開', () => {
    const offsets = computeShapeOffsets(
      [shape('big', ['v1', 'v2', 'v3']), shape('small', ['v1', 'v4', 'v5'])],
      [
        v('v1', 0, 0),
        v('v2', 200, 0),
        v('v3', 100, 200),
        v('v4', 60, 40),
        v('v5', 40, 60),
      ],
    );
    const dBig = offsets.get('big');
    const dSmall = offsets.get('small');
    expect(dBig).toBeDefined();
    expect(dSmall).toBeDefined();
    // 點積 < 0 代表方向分開
    const dot = dBig!.x * dSmall!.x + dBig!.y * dSmall!.y;
    expect(dot).toBeLessThan(0);
  });

  it('隱藏的形狀不產生 offset', () => {
    const offsets = computeShapeOffsets(
      [
        shape('s1', ['v1', 'v2', 'v3']),
        shape('s2', ['v4', 'v5', 'v6'], false),
      ],
      [
        v('v1', 0, 0),
        v('v2', 10, 0),
        v('v3', 0, 10),
        v('v4', 20, 0),
        v('v5', 30, 0),
        v('v6', 20, 10),
      ],
    );
    expect(offsets.has('s1')).toBe(true);
    expect(offsets.has('s2')).toBe(false);
  });

  it('方向向量為單位長度（長度 ≈ 1）', () => {
    const offsets = computeShapeOffsets(
      [shape('s1', ['v1', 'v2', 'v3']), shape('s2', ['v1', 'v4', 'v5'])],
      [
        v('v1', 100, 100),
        v('v2', 50, 50),
        v('v3', 50, 150),
        v('v4', 150, 50),
        v('v5', 150, 150),
      ],
    );
    for (const d of offsets.values()) {
      const len = Math.sqrt(d.x * d.x + d.y * d.y);
      expect(len).toBeCloseTo(1, 5);
    }
  });
});

describe('computeShapeVertexPositions', () => {
  it('progress = 0 → 顯示位置 = 原始位置（每個形狀）', () => {
    const vertices = [v('v1', 100, 100), v('v2', 50, 50), v('v3', 150, 150)];
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const offsets = new Map([['s1', { x: 1, y: 0 }]]);
    const positions = computeShapeVertexPositions(shapes, vertices, offsets, 100, 0);

    const s1 = positions.get('s1');
    expect(s1?.get('v1')).toEqual({ x: 100, y: 100 });
    expect(s1?.get('v2')).toEqual({ x: 50, y: 50 });
    expect(s1?.get('v3')).toEqual({ x: 150, y: 150 });
  });

  it('progress = 1，兩個形狀各自分開', () => {
    const vertices = [
      v('v1', 100, 100),
      v('v2', 50, 50),
      v('v3', 50, 150),
      v('v4', 150, 50),
      v('v5', 150, 150),
    ];
    const shapes = [
      shape('s1', ['v1', 'v2', 'v3']),
      shape('s2', ['v1', 'v4', 'v5']),
    ];
    const offsets = new Map([
      ['s1', { x: -1, y: 0 }],
      ['s2', { x: 1, y: 0 }],
    ]);
    const positions = computeShapeVertexPositions(shapes, vertices, offsets, 100, 1);

    // s1 的 v1 往左 100
    expect(positions.get('s1')?.get('v1')).toEqual({ x: 0, y: 100 });
    // s2 的 v1 往右 100
    expect(positions.get('s2')?.get('v1')).toEqual({ x: 200, y: 100 });
    // 兩個形狀各有一份 v1，位置不同
    expect(positions.get('s1')?.get('v1')).not.toEqual(
      positions.get('s2')?.get('v1'),
    );
  });

  it('隱藏的形狀不產生位置', () => {
    const positions = computeShapeVertexPositions(
      [
        shape('s1', ['v1', 'v2', 'v3']),
        shape('s2', ['v4', 'v5', 'v6'], false),
      ],
      [
        v('v1', 0, 0),
        v('v2', 10, 0),
        v('v3', 0, 10),
        v('v4', 20, 0),
        v('v5', 30, 0),
        v('v6', 20, 10),
      ],
      new Map([
        ['s1', { x: 1, y: 0 }],
        ['s2', { x: -1, y: 0 }],
      ]),
      100,
      1,
    );
    expect(positions.has('s1')).toBe(true);
    expect(positions.has('s2')).toBe(false);
  });

  it('progress = 0.5 → 位置為原始與全展開的中點', () => {
    const vertices = [v('v1', 0, 0), v('v2', 100, 0), v('v3', 50, 100)];
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const offsets = new Map([['s1', { x: 1, y: 0 }]]);
    const positions = computeShapeVertexPositions(shapes, vertices, offsets, 100, 0.5);

    expect(positions.get('s1')?.get('v1')).toEqual({ x: 50, y: 0 });
    expect(positions.get('s1')?.get('v2')).toEqual({ x: 150, y: 0 });
    expect(positions.get('s1')?.get('v3')).toEqual({ x: 100, y: 100 });
  });

  it('翻轉：進度 0 但帶 flipped → 沿 pivot-下一頂點 軸鏡像', () => {
    const vertices = [
      v('v1', 100, 100),   // pivot
      v('v2', 200, 100),   // 軸的另一端（在 pivot 右側）
      v('v3', 150, 50),    // 在軸上方
    ];
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const offsets = new Map<string, { x: number; y: number }>();

    const rotation = {
      shapeId: 's1',
      pivotId: 'v1',
      angle: 0,
      flipped: true,
    };

    const positions = computeShapeVertexPositions(
      shapes, vertices, offsets, 100, 0, rotation,
    );

    // v1 是 pivot → 不動
    expect(positions.get('s1')?.get('v1')?.x).toBeCloseTo(100, 1);
    expect(positions.get('s1')?.get('v1')?.y).toBeCloseTo(100, 1);
    // v2 在軸上 → 不動
    expect(positions.get('s1')?.get('v2')?.x).toBeCloseTo(200, 1);
    expect(positions.get('s1')?.get('v2')?.y).toBeCloseTo(100, 1);
    // v3 原本在軸上方（y=50），翻轉後應到軸下方（y=150）
    expect(positions.get('s1')?.get('v3')?.x).toBeCloseTo(150, 1);
    expect(positions.get('s1')?.get('v3')?.y).toBeCloseTo(150, 1);
  });
});

describe('computeMaxExplodeDistance', () => {
  it('形狀在圖片中央，方向朝右，距離充裕 → 回傳 Infinity（無限制）', () => {
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const vertices = [
      v('v1', 400, 400),
      v('v2', 450, 400),
      v('v3', 425, 450),
    ];
    const offsets = new Map([['s1', { x: 1, y: 0 }]]);
    const limit = computeMaxExplodeDistance(shapes, vertices, offsets, 1000, 1000);
    // 最右的點是 450，到 1000 還有 550
    expect(limit).toBeCloseTo(550, 1);
  });

  it('形狀在圖片右緣，方向朝右 → 距離為 0', () => {
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const vertices = [
      v('v1', 950, 400),
      v('v2', 1000, 400),   // 已經在邊界上
      v('v3', 975, 450),
    ];
    const offsets = new Map([['s1', { x: 1, y: 0 }]]);
    expect(computeMaxExplodeDistance(shapes, vertices, offsets, 1000, 1000)).toBe(0);
  });

  it('形狀在圖片左緣，方向朝左 → 距離為 0', () => {
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const vertices = [
      v('v1', 0, 400),   // 已在邊界
      v('v2', 50, 400),
      v('v3', 25, 450),
    ];
    const offsets = new Map([['s1', { x: -1, y: 0 }]]);
    expect(computeMaxExplodeDistance(shapes, vertices, offsets, 1000, 1000)).toBe(0);
  });

  it('多個形狀 → 取最嚴格的限制', () => {
    const shapes = [
      shape('s1', ['v1', 'v2', 'v3']),   // 中央
      shape('s2', ['v4', 'v5', 'v6']),   // 右緣
    ];
    const vertices = [
      v('v1', 300, 300), v('v2', 350, 300), v('v3', 325, 350),
      v('v4', 900, 400), v('v5', 950, 400), v('v6', 925, 450),
    ];
    const offsets = new Map([
      ['s1', { x: 1, y: 0 }],
      ['s2', { x: 1, y: 0 }],
    ]);
    // s1 可走 ~650，s2 只可走 ~50
    expect(computeMaxExplodeDistance(shapes, vertices, offsets, 1000, 1000)).toBeCloseTo(50, 1);
  });

  it('padding 會限制可用距離', () => {
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const vertices = [v('v1', 400, 400), v('v2', 450, 400), v('v3', 425, 450)];
    const offsets = new Map([['s1', { x: 1, y: 0 }]]);
    // 有 padding=100，最右點 450 到 900 為止，所以距離 450
    expect(
      computeMaxExplodeDistance(shapes, vertices, offsets, 1000, 1000, 100),
    ).toBeCloseTo(450, 1);
  });

    it('旋轉：進度 0 但帶 rotation → 旋轉目標圖形的頂點繞 pivot 旋轉', () => {
    const vertices = [
      v('v1', 100, 100),   // pivot
      v('v2', 200, 100),   // 要旋轉的點
    ];
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const offsets = new Map<string, { x: number; y: number }>();   // 無爆炸

    const rotation = { shapeId: 's1', pivotId: 'v1', angle: 90, flipped: false };

    const positions = computeShapeVertexPositions(
      shapes, vertices, offsets, 100, 0, rotation,
    );
    // v1 是 pivot → 不動
    expect(positions.get('s1')?.get('v1')?.x).toBeCloseTo(100, 1);
    expect(positions.get('s1')?.get('v1')?.y).toBeCloseTo(100, 1);
    // v2 在原點右邊 100 → 旋轉 90° 後變成下方 100
    expect(positions.get('s1')?.get('v2')?.x).toBeCloseTo(100, 1);
    expect(positions.get('s1')?.get('v2')?.y).toBeCloseTo(200, 1);
  });

  it('旋轉：未指定 rotation 的形狀不受影響', () => {
    const vertices = [v('v1', 100, 100), v('v2', 200, 100)];
    const shapes = [shape('s1', ['v1', 'v2'])];
    const offsets = new Map<string, { x: number; y: number }>();

    const positions = computeShapeVertexPositions(
      shapes, vertices, offsets, 100, 0, undefined,
    );
    expect(positions.get('s1')?.get('v2')?.x).toBe(200);
    expect(positions.get('s1')?.get('v2')?.y).toBe(100);
  });
});

describe('resolveExplodeDistanceByShape', () => {
  it('形狀在圖片中央 → 距離 = 對角線平均 × factor', () => {
    // bbox 200×200 → 對角線 282.84
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const vertices = [
      v('v1', 1000, 750),
      v('v2', 1200, 750),
      v('v3', 1100, 950),
    ];
    const offsets = new Map([['s1', { x: 1, y: 0 }]]);
    // ideal = 282.84 × 3.0 = 848.5
    // maxAllowed = 800（v2 到右邊界）
    // OVERSHOOT = 1.5 → 800 × 1.5 = 1200
    // 最終 = min(848.5, 1200) = 848.5
    const distance = resolveExplodeDistanceByShape(
      shapes, vertices, offsets, 2000, 1500,
    );
    expect(distance).toBeCloseTo(848.5, 0);
  });

  it('形狀靠近邊界 → 被 OVERSHOOT 限制壓制', () => {
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const vertices = [
      v('v1', 1900, 750),
      v('v2', 1950, 750),
      v('v3', 1925, 800),
    ];
    const offsets = new Map([['s1', { x: 1, y: 0 }]]);
    // bbox 50×50 → 對角線 70.71
    // ideal = 70.71 × 3.0 = 212.1
    // maxAllowed = 50（v2 到右邊界）
    // OVERSHOOT = 1.5 → 50 × 1.5 = 75
    // 最終 = min(212.1, 75) = 75
    const distance = resolveExplodeDistanceByShape(
      shapes, vertices, offsets, 2000, 1500,
    );
    expect(distance).toBeCloseTo(75, 0);
  });

  it('較大的 factor → 距離增加（受 OVERSHOOT 上限壓制）', () => {
    const shapes = [shape('s1', ['v1', 'v2', 'v3'])];
    const vertices = [
      v('v1', 1000, 750),
      v('v2', 1200, 750),
      v('v3', 1100, 950),
    ];
    const offsets = new Map([['s1', { x: 1, y: 0 }]]);
    // ideal = 282.84 × 5.0 = 1414.2
    // maxAllowed = 800
    // OVERSHOOT = 1.5 → 800 × 1.5 = 1200
    // 最終 = min(1414.2, 1200) = 1200
    const distance = resolveExplodeDistanceByShape(
      shapes, vertices, offsets, 2000, 1500, 0, 5.0,
    );
    expect(distance).toBeCloseTo(1200, 0);
  });

  it('兩個形狀 → 取平均對角線 × factor', () => {
    // s1: bbox 100×100 → 對角線 141.42
    // s2: bbox 300×300 → 對角線 424.26
    // 平均 = 282.84，× 3.0 = 848.5
    const shapes = [
      shape('s1', ['v1', 'v2', 'v3']),
      shape('s2', ['v4', 'v5', 'v6']),
    ];
    const vertices = [
      v('v1', 1000, 750),
      v('v2', 1100, 750),
      v('v3', 1050, 850),
      v('v4', 1000, 750),
      v('v5', 1300, 750),
      v('v6', 1150, 1050),
    ];
    const offsets = new Map([
      ['s1', { x: -1, y: 0 }],
      ['s2', { x: 1, y: 0 }],
    ]);
    // maxAllowed = 700（s2 的 v5 到右邊界）
    // OVERSHOOT = 1.5 → 700 × 1.5 = 1050
    // 最終 = min(848.5, 1050) = 848.5
    const distance = resolveExplodeDistanceByShape(
      shapes, vertices, offsets, 2000, 1500,
    );
    expect(distance).toBeCloseTo(848.5, 0);
  });
});