/**
 * 螢幕像素 ↔ 圖片座標換算。
 */
export const SNAP_EPSILON_PX = 8;

/**
 * 把「螢幕像素」容差換算成「世界座標（圖片座標）」容差。
 *
 * @param scale 螢幕像素 / 世界單位（SVG 顯示比例）
 */
export function worldEpsilonFromScale(
  scale: number,
  screenEpsilonPx: number = SNAP_EPSILON_PX,
): number {
  if (scale <= 0) return screenEpsilonPx;
  return screenEpsilonPx / scale;
}

/**
 * 把滑鼠事件座標（clientX / clientY）轉成 SVG 內部座標。
 *
 * getScreenCTM() 是 SVG 座標轉換的標準做法，自動處理 viewBox、
 * preserveAspectRatio、CSS transform 等所有因素，不需要手動計算。
 */
export function screenToWorld(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

/**
 * 取得 SVG 的顯示比例（螢幕像素 / 世界單位）。
 * 從 CTM 的 a、d 分量推導——等比縮放場景下 a ≈ d。
 */
export function getSvgScale(svg: SVGSVGElement): number {
  const ctm = svg.getScreenCTM();
  if (!ctm) return 1;
  return (Math.abs(ctm.a) + Math.abs(ctm.d)) / 2;
}