import type { AngleRef, Statement } from '../parser/types';

/**
 * 從 Statement[] 收集所有需要的字母，按第一次出現順序去重。
 *
 * 來源是「所有 Statement」——包含約束性（AC=4 也提到了 A、C），
 * 因為引導式點名需要涵蓋老師在題目文字裡看到的所有字母。
 *
 * 順序按 Parser 的輸出順序（即文字出現順序），符合老師閱讀題目的直覺。
 */
export function collectRequiredLabels(statements: Statement[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (letter: string): void => {
    if (!seen.has(letter)) {
      seen.add(letter);
      result.push(letter);
    }
  };

  for (const stmt of statements) {
    for (const letter of extractLetters(stmt)) {
      add(letter);
    }
  }

  return result;
}

// ── 從單一 Statement 提取字母（按文字出現順序）──
function extractLetters(stmt: Statement): string[] {
  switch (stmt.kind) {
    case 'triangle':
    case 'quadrilateral':
      return stmt.vertices;
    case 'segment':
      return stmt.endpoints;
    case 'segment-length':
      return stmt.segment;
    case 'angle-value':
      return extractAngleLetters(stmt.angle);
    case 'equal-angle':
      return [
        ...extractAngleLetters(stmt.angles[0]),
        ...extractAngleLetters(stmt.angles[1]),
      ];
    case 'equal-length':
    case 'parallel':
    case 'perpendicular':
      return [...stmt.segments[0], ...stmt.segments[1]];
  }
}

// ── 從 AngleRef 提取字母 ──
// 三字母角 ∠ABC：AngleRef = { vertex: 'B', rays: ['A', 'C'] }
//   按文字順序應輸出 [A, B, C]，所以是 rays[0], vertex, rays[1]
// 單字母角 ∠B：AngleRef = { vertex: 'B' }
//   輸出 [B]
function extractAngleLetters(angle: AngleRef): string[] {
  if (angle.rays) {
    return [angle.rays[0], angle.vertex, angle.rays[1]];
  }
  return [angle.vertex];
}