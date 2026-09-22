import type { Vertex } from '../parser/types';

/**
 * 找出距離 position 最近的既有頂點（在 epsilon 範圍內）。
 *
 * @param position 目標位置（世界座標）
 * @param existing 既有頂點清單
 * @param worldEpsilon 吸附容差（世界座標單位）
 * @returns 距離 < epsilon 的最近頂點；若無則回傳 null
 */
export function findSnapTarget(
  position: { x: number; y: number },
  existing: Vertex[],
  worldEpsilon: number,
): Vertex | null {
  let closest: Vertex | null = null;
  let minDist = worldEpsilon;

  for (const v of existing) {
    const dx = v.position.x - position.x;
    const dy = v.position.y - position.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
      closest = v;
    }
  }

  return closest;
}