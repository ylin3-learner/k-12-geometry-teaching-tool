import type { Shape, Vertex } from '../parser/types';

export type ComposeResult =
  | { ok: true; shape: Shape }
  | { ok: false; error: string };

/**
 * 從手動點選的頂點序列合成一個 Shape。
 *
 * 這是「手動連線」路徑的心臟——它與 resolveShapesFromStatements
 * 對稱：一個從 label 找 id（文字路徑），一個從 id 找 label（手動路徑）。
 * 兩者最終都產出同樣的 Shape 資料結構，下游（connectivity、ShapeLayer）不分來源。
 *
 * @param vertexIds 老師依序點選的 vertex id 陣列（順序 = 連線順序）
 * @param vertices  場景中所有頂點（用來查 name）
 * @param shapeId   呼叫方產生的唯一 id（保持 domain 層無副作用）
 */
export function composeManualShape(
  vertexIds: string[],
  vertices: Vertex[],
  shapeId: string,
): ComposeResult {
  if (vertexIds.length < 3) {
    return { ok: false, error: '至少需要 3 個頂點' };
  }
  if (vertexIds.length > 4) {
    return { ok: false, error: 'MVP 只支援三角形與四邊形' };
  }

  const labels: string[] = [];
  for (const id of vertexIds) {
    const v = vertices.find((vv) => vv.id === id);
    if (!v) {
      return { ok: false, error: `找不到頂點 ${id}` };
    }
    labels.push(v.name);
  }

  const name =
    vertexIds.length === 3
      ? `△${labels.join('')}`
      : `四邊形${labels.join('')}`;

  return {
    ok: true,
    shape: {
      id: shapeId,
      name,
      vertexIds: [...vertexIds],
      visible: true,
      source: 'manual',
    },
  };
}