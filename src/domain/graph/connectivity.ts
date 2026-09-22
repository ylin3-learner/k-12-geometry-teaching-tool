import type { Connection, Shape } from '../parser/types';

/**
 * 找出 Shape 之間共用哪些頂點。
 *
 * 職責：
 * - 對每一對 Shape，比對 vertexIds 交集
 * - 交集非空 → 產生 Connection
 *
 * 明確不做的事：
 * - 不處理「懸邊」（Shape 是完整的命名形狀，不會有懸邊）
 * - 不做任何幾何運算
 * - 不看 source（'text' / 'manual' 一視同仁）
 *
 * 複雜度：O(k² × m)，k = Shape 數量（通常 < 10），m = 每個 Shape 的頂點數（3 或 4）
 */
export function findConnections(shapes: Shape[]): Connection[] {
  const connections: Connection[] = [];

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i];
      const b = shapes[j];

      // 交集：保留 a 的順序（shapeA 為基準）
      const bSet = new Set(b.vertexIds);
      const shared = a.vertexIds.filter((id) => bSet.has(id));

      if (shared.length > 0) {
        connections.push({
          shapeA: a.id,
          shapeB: b.id,
          sharedVertexIds: shared,
        });
      }
    }
  }

  return connections;
}