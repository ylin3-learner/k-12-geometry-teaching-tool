import { describe, it, expect } from 'vitest';
import { normalizeLatex } from './latexNormalizer';

describe('normalizeLatex', () => {
  it('將 \\triangle 轉成 △', () => {
    expect(normalizeLatex('\\triangle ABC').unicode).toBe('△ABC');
  });

  it('將 \\angle 轉成 ∠', () => {
    expect(normalizeLatex('\\angle B = 60^\\circ').unicode).toBe('∠B = 60°');
  });

  it('將 \\overline{AC} 去包裹，變成 AC', () => {
    expect(normalizeLatex('\\overline{AC} = 4').unicode).toBe('AC = 4');
  });

  it('將 \\sim 轉成 ∼', () => {
    expect(normalizeLatex('\\triangle CAB \\sim \\triangle').unicode).toBe('△CAB ∼ △');
  });

  it('保留無法轉換的 LaTeX 指令，記在 unresolved 裡', () => {
    const result = normalizeLatex('\\foobar x');
    expect(result.unresolved).toContain('\\foobar');
  });

  it('\\sum 轉成 ∑（LaTeX-OCR vocab 支援的符號）', () => {
    const result = normalizeLatex('\\sum');
    expect(result.unicode).toBe('∑');
  });
});