import type { Shape, Vertex } from '../parser/types';

/**
 * 計算「讓 rotatingShape 對齊 targetShape」所需的旋轉角度（度）。
 *
 * 對應關係由兩個形狀的 vertexIds 順序決定：
 * - 找到兩個形狀中 pivotId 的位置
 * - 各取「pivot 的下一個頂點」作為對應參考
 * - 旋轉角 = target 的下一個方向 − rotating 的下一個方向
 *
 * 這個邏輯假設：題目文字的形狀名稱順序已對應
 * （例如「△ACB 與 △AEF」表示 A↔A, C↔E, B↔F）。
 */
export function computeAutoAlignAngle(
  rotatingShape: Shape,
  targetShape: Shape,
  pivotId: string,
  vertices: Vertex[],
): number | null {
  const byId = new Map(vertices.map((v) => [v.id, v]));
  const pivot = byId.get(pivotId);
  if (!pivot) return null;

  const rotIdx = rotatingShape.vertexIds.indexOf(pivotId);
  const tgtIdx = targetShape.vertexIds.indexOf(pivotId);
  if (rotIdx < 0 || tgtIdx < 0) return null;

  // 取「pivot 的下一個頂點」作為對應參考邊
  // 兩個形狀的頂點數量相同（都是 3 或都是 4），所以順序對應
  const rotNextId =
    rotatingShape.vertexIds[(rotIdx + 1) % rotatingShape.vertexIds.length];
  const tgtNextId =
    targetShape.vertexIds[(tgtIdx + 1) % targetShape.vertexIds.length];

  const rotNext = byId.get(rotNextId);
  const tgtNext = byId.get(tgtNextId);
  if (!rotNext || !tgtNext) return null;

  const rotAngle = Math.atan2(
    rotNext.position.y - pivot.position.y,
    rotNext.position.x - pivot.position.x,
  );
  const tgtAngle = Math.atan2(
    tgtNext.position.y - pivot.position.y,
    tgtNext.position.x - pivot.position.x,
  );

  // 角度差（度）
  let deltaDeg = ((tgtAngle - rotAngle) * 180) / Math.PI;

  // 規範化到 [-180, 180]
  while (deltaDeg > 180) deltaDeg -= 360;
  while (deltaDeg < -180) deltaDeg += 360;

  return deltaDeg;
}