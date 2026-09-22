// ── 角的表示法：單字母角（頂點已知、邊未知）與三字母角（完全確定）──
// 兩種形式不能被正規化成同一種內部表示，必須各自保留（README §6.9.2）
export type AngleRef = {
  vertex: string;              // 角的頂點，例如 "C"、"E"
  rays?: [string, string];     // 單字母角時為 undefined
};

// ── 結構圖層：純符號，無座標 ──
export type Statement =
  // 定義性（直接構造 Shape 的依據）
  | { kind: 'triangle';      id: string; vertices: [string, string, string]; source: string }
  | { kind: 'quadrilateral'; id: string; vertices: string[];                 source: string }
  // 輔助性
  | { kind: 'segment';       id: string; endpoints: [string, string];         source: string }
  // 約束性（供教學顯示用，不驅動任何座標）
  | { kind: 'angle-value';   id: string; angle: AngleRef; value: number; unit: 'deg'; source: string }
  | { kind: 'segment-length';id: string; segment: [string, string]; value: number;    source: string }
  | { kind: 'equal-angle';   id: string; angles: [AngleRef, AngleRef];                source: string }
  | { kind: 'equal-length';  id: string; segments: [[string, string], [string, string]]; source: string }
  | { kind: 'parallel';      id: string; segments: [[string, string], [string, string]]; source: string }
  | { kind: 'perpendicular'; id: string; segments: [[string, string], [string, string]]; source: string };