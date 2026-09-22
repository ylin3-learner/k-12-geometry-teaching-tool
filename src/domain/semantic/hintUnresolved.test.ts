import { describe, it, expect } from 'vitest';
import { looksLikeTriangleDecl, suggestTrianglePrefix } from './hintUnresolved';

describe('looksLikeTriangleDecl', () => {
  it('3 個大寫字母 → true', () => {
    expect(looksLikeTriangleDecl('AED')).toBe(true);
  });

  it('4 個大寫字母 → true（可能是四邊形）', () => {
    expect(looksLikeTriangleDecl('ABCD')).toBe(true);
  });

  it('2 個字母 → false', () => {
    expect(looksLikeTriangleDecl('AB')).toBe(false);
  });

  it('5 個字母 → false', () => {
    expect(looksLikeTriangleDecl('ABCDE')).toBe(false);
  });

  it('含小寫 → false', () => {
    expect(looksLikeTriangleDecl('Aed')).toBe(false);
  });

  it('含數字 → false', () => {
    expect(looksLikeTriangleDecl('A1B')).toBe(false);
  });

  it('含符號 → false', () => {
    expect(looksLikeTriangleDecl('A=B')).toBe(false);
  });

  it('前後有空白會 trim', () => {
    expect(looksLikeTriangleDecl('  AED  ')).toBe(true);
  });

  it('空字串 → false', () => {
    expect(looksLikeTriangleDecl('')).toBe(false);
  });
});

describe('suggestTrianglePrefix', () => {
  it('AED → △AED', () => {
    expect(suggestTrianglePrefix('AED')).toBe('△AED');
  });

  it('有空白會 trim 後加前綴', () => {
    expect(suggestTrianglePrefix('  AED  ')).toBe('△AED');
  });
});