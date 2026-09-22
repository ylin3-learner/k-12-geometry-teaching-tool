import unicodeit from 'unicodeit';

export type NormalizeResult = {
  unicode: string;
  unresolved: string[];
};

// ── 包裹型命令（結構性質，需要吃掉 { ... } 外殼）──
// 這不是 hard-code 符號含義，是 LaTeX 語法的結構分類
const WRAPPER_COMMANDS = new Set([
  'overline', 'underline', 'vec', 'hat', 'bar',
  'widehat', 'widetilde', 'overrightarrow', 'overleftarrow',
]);

export function normalizeLatex(input: string): NormalizeResult {
  const unresolved: string[] = [];
  let output = '';
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // ── 反斜線命令 ──
    if (ch === '\\' && i + 1 < input.length) {
      const nextCh = input[i + 1];

      // 字母命令：\triangle、\sim 等
      if (/[a-zA-Z]/.test(nextCh)) {
        let j = i + 1;
        while (j < input.length && /[a-zA-Z]/.test(input[j])) j++;
        const name = input.slice(i + 1, j);

        // 包裹型命令：遞迴處理內部
        if (WRAPPER_COMMANDS.has(name)) {
          i = j;
          while (i < input.length && /\s/.test(input[i])) i++;
          if (input[i] === '{') {
            const inner = readBraced(input, i);
            if (inner) {
              const sub = normalizeLatex(inner.content);
              output += sub.unicode;
              unresolved.push(...sub.unresolved);
              i = inner.endIndex;
              continue;
            }
          }
          i = j;
          continue;
        }

        // 用外部資料庫查符號含義（不是自己寫的 map）
        const symbol = lookupSymbol(name);
        if (symbol !== null) {
          output += symbol;
          i = j;
          continue;
        }

        // 查不到：記入 unresolved
        unresolved.push(`\\${name}`);
        i = j;
        continue;
      }

      // 符號命令：\、\; 等（LaTeX 排版用符號，無語義）
      // 直接跳過
      i += 2;
      continue;
    }

    // ── 上標 / 下標 ──
    if (ch === '^' || ch === '_') {
      const nextCh = input[i + 1];
      if (nextCh === '{') {
        const inner = readBraced(input, i + 1);
        if (inner) {
          const sub = normalizeLatex(inner.content);
          output += sub.unicode;
          unresolved.push(...sub.unresolved);
          i = inner.endIndex;
          continue;
        }
      }
      i++;
      continue;
    }

    // ── 普通字元 ──
    output += ch;
    i++;
  }

  // ── 清理 ──
  // 教學場景偏好：RING OPERATOR (∘, U+2218) → DEGREE SIGN (°, U+00B0)
  // unicodeit 的符號判斷是對的（\circ 在 LaTeX 排版上是複合運算子），
  // 這裡只是根據 K-12 教學場景的顯示偏好做後處理，不是重新定義符號含義
  output = output.replace(/∘/g, '°');
  // // → ∥（來自真實語料「AB // DE」）
  output = output.replace(/\/\//g, '∥');
  // 合併 unicode 符號與緊接字母間的空格（「△ ABC」→「△ABC」）
  output = output.replace(/([△∠⊥∥∼])\s+([A-Za-z])/g, '$1$2');
  // 清理多餘空白
  output = output.replace(/\s{2,}/g, ' ').trim();

  return { unicode: output, unresolved };
}

// ── 用 unicodeit 查符號含義 ──
function lookupSymbol(name: string): string | null {
  try {
    const result = unicodeit.replace(`\\${name}`);
    // unicodeit 找不到時會原樣回傳 `\name`，需要判斷
    if (result === `\\${name}` || result.startsWith('\\')) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

// ── 從 input[start] 讀取 { ... }（假設 input[start] === '{'）──
function readBraced(
  input: string,
  start: number,
): { content: string; endIndex: number } | null {
  if (input[start] !== '{') return null;
  let depth = 1;
  let i = start + 1;
  const contentStart = i;
  while (i < input.length && depth > 0) {
    if (input[i] === '{') depth++;
    else if (input[i] === '}') depth--;
    if (depth > 0) i++;
  }
  if (depth !== 0) return null;
  return { content: input.slice(contentStart, i), endIndex: i + 1 };
}