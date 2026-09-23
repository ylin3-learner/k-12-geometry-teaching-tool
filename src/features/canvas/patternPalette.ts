/**
 * 形狀填充的視覺編碼：
 * - 每個形狀分到一組「色相 + 斜線角度」
 * - 索引循環分配（形狀 0 藍 45°、形狀 1 橙 -45°…）
 * - 6 個色相後循環，但 patternSize 隨形狀數量緊縮
 *
 * 設計依據：
 * - 顏色混合在 3 層以上會退化成不可逆的視覺壓縮
 * - 斜線方向編碼讓「兩層重疊」變成「╳」而非「一種新色」
 * - patternSize 隨數量緊縮，讓更多層重疊時仍能分辨線條走向
 */
export type PatternStyle = {
  color: string;
  angle: number;
  patternSize: number;
};

// 6 個色相 + 對應的斜線角度（每個都不同方向）
const PALETTE: Omit<PatternStyle, 'patternSize'>[] = [
  { color: '#4a90e2', angle: 45 },     // 藍   ／
  { color: '#e67e22', angle: -45 },    // 橙   ＼
  { color: '#27ae60', angle: 0 },      // 綠   ｜
  { color: '#8e44ad', angle: 90 },     // 紫   ─
  { color: '#e74c3c', angle: 30 },     // 紅   稍微斜
  { color: '#16a085', angle: -30 },    // 青   反向斜
];

/**
 * 依形狀總數決定 patternSize。
 * 形狀越多，格子越小，讓更多層的斜線仍可分辨。
 */
export function computePatternSize(shapeCount: number): number {
  if (shapeCount <= 2) return 14;
  if (shapeCount <= 4) return 12;
  if (shapeCount <= 6) return 10;
  return 8;
}

/**
 * 依索引取得該形狀的 pattern 樣式。
 */
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

// 底色透明度（低調，讓原圖可見）
export const BASE_FILL_OPACITY = 0.10;

// 斜線透明度（中等，在底色之上但不壓過）
export const LINE_STROKE_OPACITY = 0.55;

// 斜線寬度
export const LINE_STROKE_WIDTH = 1.2;

// 形狀邊框寬度
export const SHAPE_STROKE_WIDTH = 2;