/**
 * 判斷一個 unresolved 片段是否「可能是省略的三角形宣告」。
 *
 * 真實教材常見寫法：`△ABC 和 AED` —— 第二個三角形省略 △。
 * Parser 只看 △ 才抓，所以 `AED` 會被列為 unresolved。
 *
 * 這個函數不猜答案，只提供「可能可以補上 △」的提示，
 * 決定權在老師（README §0.7 原則）。
 */
export function looksLikeTriangleDecl(fragment: string): boolean {
  const trimmed = fragment.trim();
  // 3 或 4 個連續大寫字母（三角形或四邊形）
  return /^[A-Z]{3,4}$/.test(trimmed);
}

/**
 * 對一個片段產生「補上 △」的建議字串。
 */
export function suggestTrianglePrefix(fragment: string): string {
  return `△${fragment.trim()}`;
}