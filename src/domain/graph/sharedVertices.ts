import type { Connection } from '../parser/types';

/**
 * 從 Connection[] 收集所有共用頂點的 id 集合。
 *
 * 只計算「兩端 Shape 都是可見」的 Connection——
 * 隱藏了一個 Shape，它與別的 Shape 的共用點就不該發光。
 *
 * @param connections 所有連通關係
 * @param visibleShapeIds 可見 Shape 的 id 集合
 */
export function computeSharedVertexIds(
  connections: Connection[],
  visibleShapeIds: Set<string>,
): Set<string> {
  const result = new Set<string>();

  for (const conn of connections) {
    if (
      visibleShapeIds.has(conn.shapeA) &&
      visibleShapeIds.has(conn.shapeB)
    ) {
      for (const vid of conn.sharedVertexIds) {
        result.add(vid);
      }
    }
  }

  return result;
}