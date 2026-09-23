import type { Shape, Vertex } from '../parser/types';

export type Point = { x: number; y: number };

export type RotationState = {
  shapeId: string;
  pivotId: string;
  angle: number;   // 度
};

/**
 * 計算每個可見形狀的爆炸偏移方向（單位向量）。
 *
 * 策略：每個形狀從「全體質心」往「自身質心」的方向移動。
 * - 蝴蝶結型：兩形狀分往左右
 * - 巢狀型：大三角形往一邊、小三角形往另一邊
 * - 兩個獨立形狀：自然分開
 *
 * 這是「形狀整體分離」——形狀內所有頂點一起移動，
 * 不做鉸鏈展開（共用點在爆炸後每個形狀各有一份）。
 */

/**
 * 爆炸距離允許超出圖片邊界的倍數。
 *
 * 1.0 = 頂點不超出邊界
 * 1.5 = 允許超出一半的可用空間
 *
 * 場景依據：K-12 教材多為淺色背景，形狀稍微超出圖片邊界
 * 在視覺上不明顯，反而能換得更明顯的分離感。SVG viewBox
 * 會裁切顯示區域，超出部分是自然消失的。
 */
const EXPLODE_OVERSHOOT = 1.5;

export function computeShapeOffsets(
  shapes: Shape[],
  vertices: Vertex[],
): Map<string, Point> {
  const result = new Map<string, Point>();
  const visible = shapes.filter((s) => s.visible);
  if (visible.length === 0) return result;

  const byId = new Map(vertices.map((v) => [v.id, v]));

  // ── 每個形狀的質心 ──
  const centroids = new Map<string, Point>();
  for (const s of visible) {
    const pts = s.vertexIds
      .map((id) => byId.get(id))
      .filter((v): v is Vertex => !!v);
    if (pts.length === 0) continue;
    centroids.set(s.id, averagePoint(pts.map((v) => v.position)));
  }

  // ── 統計每個頂點被多少可見形狀引用 ──
  const refCount = new Map<string, number>();
  for (const s of visible) {
    for (const vid of s.vertexIds) {
      refCount.set(vid, (refCount.get(vid) ?? 0) + 1);
    }
  }

  let maxRef = 0;
  for (const c of refCount.values()) {
    if (c > maxRef) maxRef = c;
  }

  // ── 有共用頂點（maxRef ≥ 2）→ 均勻扇開 ──
  if (maxRef >= 2) {
    // 主錨點 = 所有被「maxRef 個形狀共享」的頂點的質心
    const anchorIds = Array.from(refCount.entries())
      .filter(([, c]) => c === maxRef)
      .map(([id]) => id);
    const anchorPts = anchorIds
      .map((id) => byId.get(id)?.position)
      .filter((p): p is Point => !!p);
    const anchorPos = averagePoint(anchorPts);

    // 按「質心相對主錨點的角度」排序
    const sorted = [...visible].sort((a, b) => {
      const ca = centroids.get(a.id)!;
      const cb = centroids.get(b.id)!;
      return (
        Math.atan2(ca.y - anchorPos.y, ca.x - anchorPos.x) -
        Math.atan2(cb.y - anchorPos.y, cb.x - anchorPos.x)
      );
    });

    // 起始角度 = 排序後第一個形狀的原始方向（避免瞬間跳位）
    const c0 = centroids.get(sorted[0].id)!;
    const startAngle = Math.atan2(c0.y - anchorPos.y, c0.x - anchorPos.x);
    const step = (2 * Math.PI) / sorted.length;

    for (let i = 0; i < sorted.length; i++) {
      const angle = startAngle + step * i;
      result.set(sorted[i].id, { x: Math.cos(angle), y: Math.sin(angle) });
    }

    return result;
  }

  // ── 沒有共用頂點 → 離心法（保留原邏輯）──
  const globalCentroid = averagePoint(Array.from(centroids.values()));
  for (const s of visible) {
    const c = centroids.get(s.id)!;
    const dx = c.x - globalCentroid.x;
    const dy = c.y - globalCentroid.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) {
      const idx = visible.findIndex((v) => v.id === s.id);
      const angle = (idx / visible.length) * 2 * Math.PI;
      result.set(s.id, { x: Math.cos(angle), y: Math.sin(angle) });
    } else {
      result.set(s.id, { x: dx / len, y: dy / len });
    }
  }

  return result;
}

/**
 * 計算每個形狀的每個頂點在爆炸過程中的顯示位置。
 *
 * @returns Map<shapeId, Map<vertexId, Point>>
 *          外層 key：形狀 id；內層 key：頂點 id
 */
export function computeShapeVertexPositions(
  shapes: Shape[],
  vertices: Vertex[],
  offsets: Map<string, Point>,
  distance: number,
  progress: number,
  rotation?: RotationState,
): Map<string, Map<string, Point>> {
  const result = new Map<string, Map<string, Point>>();
  const byId = new Map(vertices.map((v) => [v.id, v]));

  for (const s of shapes) {
    if (!s.visible) continue;
    const dir = offsets.get(s.id);
    const inner = new Map<string, Point>();

    // 這個形狀是否需要旋轉？
    const isRotating = rotation?.shapeId === s.id;
    const pivotVertex = isRotating ? byId.get(rotation!.pivotId) : null;
    const pivotPos = pivotVertex?.position;

    for (const vid of s.vertexIds) {
      const v = byId.get(vid);
      if (!v) continue;

      // 1. 起點：原始位置
      let pos: Point = { ...v.position };

      // 2. 若此形狀要旋轉 → 繞 pivot 旋轉
      if (isRotating && pivotPos) {
        pos = rotateAround(pos, pivotPos, rotation!.angle);
      }

      // 3. 加上爆炸偏移（若有）
      if (dir) {
        pos = {
          x: pos.x + dir.x * distance * progress,
          y: pos.y + dir.y * distance * progress,
        };
      }

      inner.set(vid, pos);
    }

    result.set(s.id, inner);
  }

  return result;
}

/**
 * 計算在給定邊界內，所有可見形狀都不會超出圖片的最大爆炸距離。
 *
 * 對每個形狀的每個頂點，沿爆炸方向計算「還能走多遠才會撞到圖片邊界」，
 * 取所有值的最小值。這樣所有形狀都用相同距離（視覺一致），
 * 且最嚴格的限制自然生效（不會有某個形狀先撞牆）。
 *
 * @param padding 額外保留的邊距（世界座標單位），避免頂點剛好貼邊
 */
export function computeMaxExplodeDistance(
  shapes: Shape[],
  vertices: Vertex[],
  offsets: Map<string, Point>,
  imageWidth: number,
  imageHeight: number,
  padding = 0,
): number {
  const byId = new Map(vertices.map((v) => [v.id, v]));
  const minX = padding;
  const maxX = imageWidth - padding;
  const minY = padding;
  const maxY = imageHeight - padding;

  let limit = Infinity;

  for (const s of shapes) {
    if (!s.visible) continue;
    const dir = offsets.get(s.id);
    if (!dir || (dir.x === 0 && dir.y === 0)) continue;

    for (const vid of s.vertexIds) {
      const v = byId.get(vid);
      if (!v) continue;

      // 最終 x = v.x + dir.x * d，必須落在 [minX, maxX]
      if (dir.x > 0) {
        limit = Math.min(limit, (maxX - v.position.x) / dir.x);
      } else if (dir.x < 0) {
        limit = Math.min(limit, (minX - v.position.x) / dir.x);
      }
      // 最終 y = v.y + dir.y * d，必須落在 [minY, maxY]
      if (dir.y > 0) {
        limit = Math.min(limit, (maxY - v.position.y) / dir.y);
      } else if (dir.y < 0) {
        limit = Math.min(limit, (minY - v.position.y) / dir.y);
      }
    }
  }

  if (!isFinite(limit)) return 0;
  return Math.max(0, limit);
}

/**
 * 計算形狀的 bbox 對角線長度。
 * 用來衡量「這個形狀有多大」，作為爆炸距離的基準。
 */
function shapeDiagonal(s: Shape, byId: Map<string, Vertex>): number {
  const pts = s.vertexIds
    .map((id) => byId.get(id))
    .filter((v): v is Vertex => !!v);
  if (pts.length === 0) return 0;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.position.x < minX) minX = p.position.x;
    if (p.position.x > maxX) maxX = p.position.x;
    if (p.position.y < minY) minY = p.position.y;
    if (p.position.y > maxY) maxY = p.position.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return Math.sqrt(w * w + h * h);
}

/**
 * 決定最終爆炸距離。
 *
 * 距離公式：
 *   distance = min(
 *     形狀 bbox 對角線平均 × factor,      // 理想：依形狀大小縮放
 *     可用空間 × OVERSHOOT                // 上限：允許超出邊界多少倍
 *   )
 *
 * 為什麼允許「超出邊界」？因為典型場景是淺色背景（課本、考卷白底），
 * 形狀稍微超出圖片邊界在視覺上看不出來——反而能換得更明顯的分離感。
 * SVG viewBox 會裁切顯示區域，超出的部分是自然消失的。
 *
 * @param factor 形狀對角線的倍數。1.0 = 挪開自己大小一倍，
 *               3.0 = 挪開三倍（視覺分離感明顯）。
 */
export function resolveExplodeDistanceByShape(
  shapes: Shape[],
  vertices: Vertex[],
  offsets: Map<string, Point>,
  imageWidth: number,
  imageHeight: number,
  padding = 0,
  factor = 3.0,
): number {
  const byId = new Map(vertices.map((v) => [v.id, v]));
  const visible = shapes.filter((s) => s.visible);
  if (visible.length === 0) return 0;

  // 形狀 bbox 對角線的平均
  let total = 0;
  for (const s of visible) {
    total += shapeDiagonal(s, byId);
  }
  const avgDiagonal = total / visible.length;
  const ideal = avgDiagonal * factor;

  const maxAllowed = computeMaxExplodeDistance(
    shapes,
    vertices,
    offsets,
    imageWidth,
    imageHeight,
    padding,
  );

  return Math.min(ideal, maxAllowed * EXPLODE_OVERSHOOT);
}

// ── 輔助 ──

function averagePoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

// 繞 pivot 旋轉一個點
function rotateAround(p: Point, pivot: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  };
}