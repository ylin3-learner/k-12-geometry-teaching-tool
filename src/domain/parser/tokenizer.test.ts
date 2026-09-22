import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';

describe('tokenize', () => {
  it('把 △ABC 切成 [triangle, letter(A), letter(B), letter(C)]', () => {
    const tokens = tokenize('△ABC');
    expect(tokens.map((t) => t.type)).toEqual([
      'triangle', 'letter', 'letter', 'letter',
    ]);
    expect(tokens[1]).toEqual({ type: 'letter', value: 'A' });
  });

  it('中文標點統一成 boundary', () => {
    const tokens = tokenize('△ABC，△ADE');
    expect(tokens.filter((t) => t.type === 'boundary')).toHaveLength(1);
  });

  it('換行也算 boundary', () => {
    const tokens = tokenize('△ABC\n△ADE');
    expect(tokens.filter((t) => t.type === 'boundary')).toHaveLength(1);
  });

  it('中文字變成 chinese token，保留原始字元', () => {
    const tokens = tokenize('△ABC和△ADE');
    const chinese = tokens.filter((t) => t.type === 'chinese');
    expect(chinese).toHaveLength(1);
    expect(chinese[0]).toEqual({ type: 'chinese', value: '和' });
  });

  it('空白字元被忽略', () => {
    const tokens = tokenize('△ ABC');
    expect(tokens.map((t) => t.type)).toEqual([
      'triangle', 'letter', 'letter', 'letter',
    ]);
  });

  it('角度符號 ∠', () => {
    expect(tokenize('∠B')[0].type).toBe('angle');
  });

  it('數字逐字元切成 digit', () => {
    const tokens = tokenize('60');
    expect(tokens[0]).toEqual({ type: 'digit', value: '6' });
    expect(tokens[1]).toEqual({ type: 'digit', value: '0' });
  });

  it('等號與大括號', () => {
    const tokens = tokenize('={}');
    expect(tokens.map((t) => t.type)).toEqual(['equals', 'lbrace', 'rbrace']);
  });

  it('四邊形符號 □', () => {
    expect(tokenize('□ABCD')[0].type).toBe('quadrilateral');
  });

  it('⊥ ∥ ∼ ° 各自對應', () => {
    const tokens = tokenize('⊥∥∼°');
    expect(tokens.map((t) => t.type)).toEqual([
      'perp', 'parallel', 'sim', 'degree',
    ]);
  });

  it('未識別字元變成 unknown', () => {
    expect(tokenize('$')[0]).toEqual({ type: 'unknown', value: '$' });
  });

  it('boundary 保留原始標點', () => {
    const tokens = tokenize('△ABC，△ADE');
    const boundary = tokens.find((t) => t.type === 'boundary');
    expect(boundary).toEqual({ type: 'boundary', value: '，' });
  });
});