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

// ── Parser 輸出：Statement[] + 未解析的原始片段 ──
export type ParseResult = {
  statements: Statement[];
  unresolved: string[];     // 原始文字片段，例如 "△AB"、"AC=x"
};

// ── Classifier 輸出：四分類 ──
export type ClassifiedStatements = {
  definitions: Statement[];   // triangle / quadrilateral —— 直接構造 Shape
  auxiliary: Statement[];     // segment —— MVP 中通常為空
  constraints: Statement[];   // angle-value / segment-length / equal-angle /
                              // equal-length / parallel / perpendicular —— 純顯示
  unresolved: string[];       // 從 ParseResult 傳下來
};

// ── 座標圖層 ──
export type Vertex = {
  id: string;
  name: string;            // "A"、"B"、"C" —— 文字模式必填，是合成的查找鍵
  position: { x: number; y: number };  // 圖片座標系（image space）
};

// ── 合成結果：Shape 直接由 Statement + Vertex 構造 ──
export type Shape = {
  id: string;
  name: string;             // "△ABC"、"四邊形ABCD"
  vertexIds: string[];      // 依 Statement 宣告順序，對應到 Vertex.id
  visible: boolean;
  source: 'text' | 'manual';
};

// ── 合成時缺少座標的 Shape（尚未完成，等老師點完字母再試一次）──
export type IncompleteShape = {
  statementId: string;
  name: string;             // "△ABC"
  missingLabels: string[];  // ['B', 'D']
};

// ── 合成結果 ──
export type ResolveResult = {
  shapes: Shape[];
  incomplete: IncompleteShape[];
};

// ── 連通關係：Shape 之間共用哪些頂點 ──
export type Connection = {
  shapeA: string;               // Shape.id
  shapeB: string;               // Shape.id
  sharedVertexIds: string[];    // 1 個 = 蝴蝶結型共用頂點；2 個以上 = 共用邊 / 多點
};