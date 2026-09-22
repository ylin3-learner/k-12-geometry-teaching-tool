import type {
  IncompleteShape,
  ResolveResult,
  Shape,
  Statement,
  Vertex,
} from '../parser/types';

/**
 * 把結構圖層（Statement[]）與座標圖層（Vertex[]）合成為 Shape[]。
 *
 * 職責：
 * - 對每個定義性 Statement（triangle / quadrilateral），
 *   把字母逐一查表換成對應 Vertex.id
 * - 座標齊全 → 產生 Shape
 * - 座標缺失 → 記入 incomplete，不產生 Shape
 *
 * 明確不做的事：
 * - 不做三角剖分
 * - 不做搜尋
 * - 不檢查座標是否共線或滿足任何幾何約束（見 README 6.13）
 */
export function resolveShapesFromStatements(
  statements: Statement[],
  vertices: Vertex[],
  source: 'text' | 'manual' = 'text',
): ResolveResult {
  // 建立 name → Vertex 的查找表
  // 假設 vertex.name 唯一（老師點的字母不應該重複）
  const byName = new Map<string, Vertex>();
  for (const vtx of vertices) {
    if (!byName.has(vtx.name)) {
      byName.set(vtx.name, vtx);
    }
  }

  const shapes: Shape[] = [];
  const incomplete: IncompleteShape[] = [];

  for (const stmt of statements) {
    if (stmt.kind !== 'triangle' && stmt.kind !== 'quadrilateral') {
      continue;
    }

    const labels = stmt.vertices;
    const missing: string[] = [];
    const vertexIds: string[] = [];

    for (const label of labels) {
      const vtx = byName.get(label);
      if (vtx) {
        vertexIds.push(vtx.id);
      } else {
        missing.push(label);
      }
    }

    const displayName = shapeDisplayName(stmt);

    if (missing.length === 0) {
      shapes.push({
        id: `shape-${stmt.id}`,
        name: displayName,
        vertexIds,
        visible: true,
        source,
      });
    } else {
      incomplete.push({
        statementId: stmt.id,
        name: displayName,
        missingLabels: missing,
      });
    }
  }

  return { shapes, incomplete };
}

// ── Shape 的顯示名稱（給 UI 用，中文習慣寫法）──
function shapeDisplayName(stmt: Statement): string {
  if (stmt.kind === 'triangle') {
    return `△${stmt.vertices.join('')}`;
  }
  if (stmt.kind === 'quadrilateral') {
    return `四邊形${stmt.vertices.join('')}`;
  }
  // 不應該到這裡（呼叫方已過濾）
  return stmt.id;
}