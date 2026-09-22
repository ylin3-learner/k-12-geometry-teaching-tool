import type { Token } from './tokenizer';
import type { AngleRef, ParseResult, Statement } from './types';

// ── 修飾詞：單字（中文一字）+ 多字（中文兩字以上）──
const MODIFIER_CHARS = new Set(['若', '設', '设', '令']);
const MODIFIER_MULTI: string[][] = [
  ['已', '知'],
];

// ── 主入口 ──
export function parse(tokens: Token[]): ParseResult {
  const statements: Statement[] = [];
  const unresolved: string[] = [];
  let i = 0;
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  // pending 未匹配片段的起點；null 表示目前沒有在累積
  let pendingStart: number | null = null;

  const flushPending = (end: number) => {
    if (pendingStart === null) return;
    const slice = tokens.slice(pendingStart, end);
    // 只有含「有意義 token」的片段才算 unresolved；
    // 純 digit、純 unknown（例如題號 "(1)"）屬於預期雜訊，不顯示給老師
    if (hasMeaningfulToken(slice)) {
      const text = slice.map(tokenToText).join('');
      if (text.length > 0) unresolved.push(text);
    }
    pendingStart = null;
  };

  const markPending = (pos: number) => {
    if (pendingStart === null) pendingStart = pos;
  };

  while (i < tokens.length) {
    // 跳過修飾詞（flush pending，因為修飾詞是子句分隔）
    const afterMod = skipModifiers(tokens, i);
    if (afterMod > i) {
      flushPending(i);
      i = afterMod;
      continue;
    }

    const t = tokens[i];

    // 預期雜訊：boundary / unknown / chinese —— flush 後跳過
    if (t.type === 'boundary' || t.type === 'unknown' || t.type === 'chinese') {
      flushPending(i);
      i++;
      continue;
    }

    let matched = false;

    // ── 三角形 ──
    if (t.type === 'triangle') {
      const r = matchTriangle(tokens, i, nextId);
      if (r) {
        flushPending(i);
        statements.push(r.stmt);
        i = r.next;
        matched = true;
      }
    }

    // ── 四邊形 ──
    if (!matched && t.type === 'quadrilateral') {
      const r = matchQuadrilateral(tokens, i, nextId);
      if (r) {
        flushPending(i);
        statements.push(r.stmt);
        i = r.next;
        matched = true;
      }
    }

    // ── 角度開頭 ──
    if (!matched && t.type === 'angle') {
      const r = matchAngleStatement(tokens, i, nextId);
      if (r) {
        flushPending(i);
        statements.push(...r.stmts);
        i = r.next;
        matched = true;
      }
    }

    // ── 字母開頭 ──
    if (!matched && t.type === 'letter') {
      const r = matchLetterStatement(tokens, i, nextId);
      if (r) {
        flushPending(i);
        statements.push(r.stmt);
        i = r.next;
        matched = true;
      }
    }

    // 沒匹配：把當前位置加入 pending
    if (!matched) {
      markPending(i);
      i++;
    }
  }

  // 迴圈結束，flush 最後的 pending
  flushPending(tokens.length);

  return { statements, unresolved };
}

// ── 判斷 pending 片段是否含「有意義 token」──
function hasMeaningfulToken(tokens: Token[]): boolean {
  return tokens.some(
    (t) =>
      t.type === 'triangle' ||
      t.type === 'quadrilateral' ||
      t.type === 'angle' ||
      t.type === 'letter',
  );
}

// ── Token → 原始文字（unresolved 重建用）──
function tokenToText(t: Token): string {
  switch (t.type) {
    case 'triangle':      return '△';
    case 'quadrilateral': return '□';
    case 'angle':         return '∠';
    case 'perp':          return '⊥';
    case 'parallel':      return '∥';
    case 'sim':           return '∼';
    case 'degree':        return '°';
    case 'equals':        return '=';
    case 'lbrace':        return '{';
    case 'rbrace':        return '}';
    case 'caret':         return '^';
    case 'underscore':    return '_';
    default:              return (t as { value?: string }).value ?? '';
  }
}

// ── 跳過修飾詞 ──
function skipModifiers(tokens: Token[], i: number): number {
  const t = tokens[i];
  if (t?.type === 'chinese' && MODIFIER_CHARS.has(t.value)) return i + 1;

  for (const pattern of MODIFIER_MULTI) {
    if (matchChineseSeq(tokens, i, pattern)) return i + pattern.length;
  }

  return i;
}

function matchChineseSeq(tokens: Token[], i: number, pattern: string[]): boolean {
  for (let k = 0; k < pattern.length; k++) {
    const t = tokens[i + k];
    if (t?.type !== 'chinese' || t.value !== pattern[k]) return false;
  }
  return true;
}

// ── 讀取連續字母 ──
function readLetters(
  tokens: Token[],
  i: number,
  count: number,
): { letters: string[]; next: number } | null {
  const letters: string[] = [];
  let j = i;
  for (let k = 0; k < count; k++) {
    const t = tokens[j];
    if (t?.type !== 'letter') return null;
    letters.push(t.value);
    j++;
  }
  return { letters, next: j };
}

// ── 讀取數字（連續 digit token）──
function readNumber(
  tokens: Token[],
  i: number,
): { value: number; next: number } | null {
  let s = '';
  let j = i;
  while (j < tokens.length && tokens[j].type === 'digit') {
    s += (tokens[j] as { value: string }).value;
    j++;
  }
  if (s.length === 0) return null;
  return { value: Number(s), next: j };
}

// ── 讀取角度引用：∠ + 1 或 3 個字母 ──
function readAngleRef(
  tokens: Token[],
  i: number,
): { angle: AngleRef; next: number } | null {
  if (tokens[i]?.type !== 'angle') return null;
  const afterAngle = i + 1;

  const three = readLetters(tokens, afterAngle, 3);
  if (three) {
    return {
      angle: {
        vertex: three.letters[1],
        rays: [three.letters[0], three.letters[2]],
      },
      next: three.next,
    };
  }

  const one = readLetters(tokens, afterAngle, 1);
  if (one) {
    return { angle: { vertex: one.letters[0] }, next: one.next };
  }

  return null;
}

// ── 三角形：△ + 3 個字母 ──
function matchTriangle(
  tokens: Token[],
  i: number,
  nextId: (p: string) => string,
): { stmt: Statement; next: number } | null {
  const r = readLetters(tokens, i + 1, 3);
  if (!r) return null;
  const [a, b, c] = r.letters;
  return {
    stmt: {
      kind: 'triangle',
      id: nextId('tri'),
      vertices: [a, b, c],
      source: `△${a}${b}${c}`,
    },
    next: r.next,
  };
}

// ── 四邊形：□ + 4 個字母 ──
function matchQuadrilateral(
  tokens: Token[],
  i: number,
  nextId: (p: string) => string,
): { stmt: Statement; next: number } | null {
  const r = readLetters(tokens, i + 1, 4);
  if (!r) return null;
  const [a, b, c, d] = r.letters;
  return {
    stmt: {
      kind: 'quadrilateral',
      id: nextId('quad'),
      vertices: [a, b, c, d],
      source: `□${a}${b}${c}${d}`,
    },
    next: r.next,
  };
}

// ── 角度開頭：∠... = ... ──
function matchAngleStatement(
  tokens: Token[],
  i: number,
  nextId: (p: string) => string,
): { stmts: Statement[]; next: number } | null {
  const left = readAngleRef(tokens, i);
  if (!left) return null;

  if (tokens[left.next]?.type !== 'equals') return null;

  let j = left.next + 1;

  // 情況 A：右邊是另一個角 → equal-angle
  const right = readAngleRef(tokens, j);
  if (right) {
    const stmts: Statement[] = [{
      kind: 'equal-angle',
      id: nextId('eqa'),
      angles: [left.angle, right.angle],
      source: `${angleSource(left.angle)}=${angleSource(right.angle)}`,
    }];
    j = right.next;

    // 連等式：再來一個 = ?
    if (tokens[j]?.type === 'equals') {
      j++;
      const num = readNumber(tokens, j);
      if (num) {
        j = num.next;
        if (tokens[j]?.type === 'degree') {
          j++;
          stmts.push({
            kind: 'angle-value',
            id: nextId('ang'),
            angle: right.angle,
            value: num.value,
            unit: 'deg',
            source: `${angleSource(right.angle)}=${num.value}°`,
          });
        }
      } else {
        const right2 = readAngleRef(tokens, j);
        if (right2) {
          stmts.push({
            kind: 'equal-angle',
            id: nextId('eqa'),
            angles: [right.angle, right2.angle],
            source: `${angleSource(right.angle)}=${angleSource(right2.angle)}`,
          });
          j = right2.next;
        }
      }
    }

    return { stmts, next: j };
  }

  // 情況 B：右邊是數字 → angle-value
  const num = readNumber(tokens, j);
  if (num) {
    j = num.next;
    if (tokens[j]?.type !== 'degree') return null;
    j++;
    return {
      stmts: [{
        kind: 'angle-value',
        id: nextId('ang'),
        angle: left.angle,
        value: num.value,
        unit: 'deg',
        source: `${angleSource(left.angle)}=${num.value}°`,
      }],
      next: j,
    };
  }

  return null;
}

// ── 字母開頭：兩字母 + 運算子 ──
function matchLetterStatement(
  tokens: Token[],
  i: number,
  nextId: (p: string) => string,
): { stmt: Statement; next: number } | null {
  const left = readLetters(tokens, i, 2);
  if (!left) return null;
  const [a, b] = left.letters;
  const op = tokens[left.next];

  if (op?.type === 'equals') {
    const j = left.next + 1;

    const rightLetters = readLetters(tokens, j, 2);
    if (rightLetters) {
      const [c, d] = rightLetters.letters;
      return {
        stmt: {
          kind: 'equal-length',
          id: nextId('eql'),
          segments: [[a, b], [c, d]],
          source: `${a}${b}=${c}${d}`,
        },
        next: rightLetters.next,
      };
    }

    const num = readNumber(tokens, j);
    if (num) {
      return {
        stmt: {
          kind: 'segment-length',
          id: nextId('sl'),
          segment: [a, b],
          value: num.value,
          source: `${a}${b}=${num.value}`,
        },
        next: num.next,
      };
    }

    return null;
  }

  if (op?.type === 'parallel') {
    const right = readLetters(tokens, left.next + 1, 2);
    if (!right) return null;
    const [c, d] = right.letters;
    return {
      stmt: {
        kind: 'parallel',
        id: nextId('par'),
        segments: [[a, b], [c, d]],
        source: `${a}${b}∥${c}${d}`,
      },
      next: right.next,
    };
  }

  if (op?.type === 'perp') {
    const right = readLetters(tokens, left.next + 1, 2);
    if (!right) return null;
    const [c, d] = right.letters;
    return {
      stmt: {
        kind: 'perpendicular',
        id: nextId('perp'),
        segments: [[a, b], [c, d]],
        source: `${a}${b}⊥${c}${d}`,
      },
      next: right.next,
    };
  }

  return null;
}

function angleSource(a: AngleRef): string {
  if (a.rays) return `∠${a.rays[0]}${a.vertex}${a.rays[1]}`;
  return `∠${a.vertex}`;
}