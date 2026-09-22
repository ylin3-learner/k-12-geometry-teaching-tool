/**
 * Tokenizer：把正規化後的 unicode 字串切成 token 序列。
 *
 * 職責：
 * - 每個字元變成一個 token（不嘗試合併多字元）
 * - 中文標點與半形標點統一成 boundary token
 * - 中文字、空白、未知字元各自有對應的 token 類型
 *
 * Parser 的職責（不在這裡做）：
 * - 讀取連續字母（例如 ∠ABC 讀 3 個）
 * - 讀取數字序列（例如 60 讀成數值）
 * - 跳過 chinese / unknown / boundary token
 */
export type Token =
  | { type: 'triangle' }                    // △
  | { type: 'quadrilateral' }               // □
  | { type: 'angle' }                       // ∠
  | { type: 'perp' }                        // ⊥
  | { type: 'parallel' }                    // ∥
  | { type: 'sim' }                         // ∼
  | { type: 'degree' }                      // °
  | { type: 'equals' }                      // =
  | { type: 'lbrace' }                      // {
  | { type: 'rbrace' }                      // }
  | { type: 'caret' }                       // ^
  | { type: 'underscore' }                  // _
  | { type: 'letter'; value: string }       // A-Z a-z
  | { type: 'digit'; value: string }        // 0-9
  | { type: 'boundary'; value: string }     // ，。；、,; 與換行
  | { type: 'chinese'; value: string }      // 中文字
  | { type: 'unknown'; value: string };     // 其他未識別

// ── 已知字元 → token 的直接映射 ──
// 這個表格定義了系統的 token 詞彙表，是 tokenizer 的核心
const CHAR_TO_TOKEN: Record<string, Token> = {
  '△': { type: 'triangle' },
  '□': { type: 'quadrilateral' },
  '∠': { type: 'angle' },
  '⊥': { type: 'perp' },
  '∥': { type: 'parallel' },
  '∼': { type: 'sim' },
  '°': { type: 'degree' },
  '=': { type: 'equals' },
  '{': { type: 'lbrace' },
  '}': { type: 'rbrace' },
  '^': { type: 'caret' },
  '_': { type: 'underscore' },
  '，': { type: 'boundary', value: '，' },
  '。': { type: 'boundary', value: '。' },
  '；': { type: 'boundary', value: '；' },
  '、': { type: 'boundary', value: '、' },
  ',': { type: 'boundary', value: ',' },
  ';': { type: 'boundary', value: ';' },
  '\n': { type: 'boundary', value: '\n' },
};

// 空白字元直接忽略（LaTeX 排版中空格無語義）
const WHITESPACE = new Set([' ', '\t', '\r']);

// 中文字範圍（基本 CJK 統一表意文字）
const CJK_REGEX = /[\u4e00-\u9fff]/;

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];

  for (const ch of input) {
    if (WHITESPACE.has(ch)) continue;

    const mapped = CHAR_TO_TOKEN[ch];
    if (mapped) {
      tokens.push(mapped);
      continue;
    }

    if (/[A-Za-z]/.test(ch)) {
      tokens.push({ type: 'letter', value: ch });
      continue;
    }

    if (/[0-9]/.test(ch)) {
      tokens.push({ type: 'digit', value: ch });
      continue;
    }

    if (CJK_REGEX.test(ch)) {
      tokens.push({ type: 'chinese', value: ch });
      continue;
    }

    tokens.push({ type: 'unknown', value: ch });
  }

  return tokens;
}