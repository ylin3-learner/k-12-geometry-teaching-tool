/**
 * 形狀填充的視覺編碼。
 *
 * 融合兩種策略：
 * 1. 色塊識別（借鏡教具圖片的視覺語言）——飽和底色，顏色本身可辨識
 * 2. 方向編碼（論文編織技術）——斜線角度區分不同層
 *
 * 當兩個形狀重疊：底色混合（但仍飽和）+ 斜線交錯成 ╳
 * 當三個以上重疊：方向編碼成為主要辨識線索
 */
export type PatternStyle = {
  color: string;
  angle: number;
  patternSize: number;
};

// 6 個高飽和色相（借鏡教具圖片的鮮豔感）+ 對應斜線角度
const PALETTE: Omit<PatternStyle, 'patternSize'>[] = [
  { color: '#3b82f6', angle: 45 },    // 藍 ／
  { color: '#f97316', angle: -45 },   // 橘 ＼
  { color: '#10b981', angle: 0 },     // 綠 ｜
  { color: '#a855f7', angle: 90 },    // 紫 ─
  { color: '#ef4444', angle: 30 },    // 紅（斜）
  { color: '#06b6d4', angle: -30 },   // 青（斜反向）
];

export function computePatternSize(shapeCount: number): number {
  if (shapeCount <= 2) return 14;
  if (shapeCount <= 4) return 12;
  if (shapeCount <= 6) return 10;
  return 8;
}

export function getPatternStyle(
  index: number,
  shapeCount: number,
): PatternStyle {
  const base = PALETTE[index % PALETTE.length];
  return {
    ...base,
    patternSize: computePatternSize(shapeCount),
  };
}

// ── 視覺強度（借鏡教具圖片的飽和感）──

// 底色不透明度：0.28（看得出顏色，但仍可透視下層）
export const BASE_FILL_OPACITY = 0.28;

// 斜線不透明度：0.75（明顯但不壓過底色）
export const LINE_STROKE_OPACITY = 0.75;

// 斜線寬度：1.6（在 8-14px 格子中能清晰辨識）
export const LINE_STROKE_WIDTH = 1.6;

// 形狀邊框寬度：2.5（借鏡圖片中層與層的清晰邊界）
export const SHAPE_STROKE_WIDTH = 2.5;

// 形狀邊框不透明度：1.0（飽和，成為層的分界線）
export const SHAPE_STROKE_OPACITY = 1.0;