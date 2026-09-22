import type { ClassifiedStatements, ParseResult, Statement } from './types';

// ── 把 Parser 的輸出分成四類 ──
//
// definitions：triangle / quadrilateral —— 直接構造 Shape
// auxiliary  ：segment —— MVP 中通常為空
// constraints：angle-value / segment-length / equal-angle /
//              equal-length / parallel / perpendicular —— 純顯示
// unresolved ：從 ParseResult 傳下來
export function classify(parseResult: ParseResult): ClassifiedStatements {
  const { statements, unresolved } = parseResult;

  const definitions: Statement[] = [];
  const auxiliary: Statement[] = [];
  const constraints: Statement[] = [];

  for (const s of statements) {
    if (s.kind === 'triangle' || s.kind === 'quadrilateral') {
      definitions.push(s);
    } else if (s.kind === 'segment') {
      auxiliary.push(s);
    } else {
      constraints.push(s);
    }
  }

  return { definitions, auxiliary, constraints, unresolved };
}