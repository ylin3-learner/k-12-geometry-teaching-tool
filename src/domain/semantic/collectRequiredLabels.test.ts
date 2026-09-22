import { describe, it, expect } from 'vitest';
import { tokenize } from '../parser/tokenizer';
import { parse } from '../parser/parser';
import { collectRequiredLabels } from './collectRequiredLabels';

const collect = (input: string): string[] =>
  collectRequiredLabels(parse(tokenize(input)).statements);

describe('collectRequiredLabels', () => {
  it('△ABC → [A, B, C]', () => {
    expect(collect('△ABC')).toEqual(['A', 'B', 'C']);
  });

  it('△ABC和△ADE → [A, B, C, D, E]（去重且保序）', () => {
    expect(collect('△ABC和△ADE')).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('△ACB與△AEF → [A, C, B, E, F]（依文字出現順序）', () => {
    expect(collect('△ACB與△AEF')).toEqual(['A', 'C', 'B', 'E', 'F']);
  });

  it('□ABCD → [A, B, C, D]', () => {
    expect(collect('□ABCD')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('AC=4 → [A, C]', () => {
    expect(collect('AC=4')).toEqual(['A', 'C']);
  });

  it('∠ABC=60° → [A, B, C]', () => {
    expect(collect('∠ABC=60°')).toEqual(['A', 'B', 'C']);
  });

  it('∠B=∠C（單字母角）→ [B, C]', () => {
    expect(collect('∠B=∠C')).toEqual(['B', 'C']);
  });

  it('∠ABC=∠DEF → [A, B, C, D, E, F]', () => {
    expect(collect('∠ABC=∠DEF')).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('AB∥DE → [A, B, D, E]', () => {
    expect(collect('AB∥DE')).toEqual(['A', 'B', 'D', 'E']);
  });

  it('AB=CD → [A, B, C, D]', () => {
    expect(collect('AB=CD')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('混合：△ABC，AC=4 → [A, B, C]', () => {
    expect(collect('△ABC，AC=4')).toEqual(['A', 'B', 'C']);
  });

  it('混合：AC=4，△ABC → [A, C, B]（依文字出現順序）', () => {
    expect(collect('AC=4，△ABC')).toEqual(['A', 'C', 'B']);
  });

  it('只貼題幹：AB∥DE，AC=4，CD=3 → [A, B, D, E, C]', () => {
    expect(collect('AB∥DE，AC=4，CD=3')).toEqual(['A', 'B', 'D', 'E', 'C']);
  });

  it('空輸入 → []', () => {
    expect(collect('')).toEqual([]);
  });

  it('無法解析的片段不產生字母', () => {
    expect(collect('△AB')).toEqual([]);
  });
});