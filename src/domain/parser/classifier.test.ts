import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';
import { parse } from './parser';
import { classify } from './classifier';

const c = (input: string) => classify(parse(tokenize(input)));

describe('classify', () => {
  it('triangle → definitions', () => {
    const r = c('△ABC');
    expect(r.definitions).toHaveLength(1);
    expect(r.definitions[0].kind).toBe('triangle');
    expect(r.auxiliary).toHaveLength(0);
    expect(r.constraints).toHaveLength(0);
  });

  it('quadrilateral → definitions', () => {
    const r = c('□ABCD');
    expect(r.definitions).toHaveLength(1);
    expect(r.definitions[0].kind).toBe('quadrilateral');
  });

  it('segment-length → constraints', () => {
    const r = c('AC=4');
    expect(r.definitions).toHaveLength(0);
    expect(r.constraints).toHaveLength(1);
    expect(r.constraints[0].kind).toBe('segment-length');
  });

  it('equal-angle → constraints', () => {
    const r = c('∠B=∠C');
    expect(r.constraints).toHaveLength(1);
    expect(r.constraints[0].kind).toBe('equal-angle');
  });

  it('parallel → constraints', () => {
    const r = c('AB∥DE');
    expect(r.constraints).toHaveLength(1);
  });

  it('perpendicular → constraints', () => {
    const r = c('AB⊥CD');
    expect(r.constraints).toHaveLength(1);
  });

  it('混合輸入：definitions + constraints 分開', () => {
    const r = c('△ABC，AC=4');
    expect(r.definitions).toHaveLength(1);
    expect(r.constraints).toHaveLength(1);
    expect(r.auxiliary).toHaveLength(0);
  });

  it('蝴蝶結型：兩個 triangle 都在 definitions', () => {
    const r = c('△ABC和△ADE');
    expect(r.definitions).toHaveLength(2);
    expect(r.definitions.map((s) => s.kind)).toEqual(['triangle', 'triangle']);
  });

  it('只貼題幹：definitions 空，constraints 有值', () => {
    const r = c('AB∥DE，AC=4，CD=3');
    expect(r.definitions).toHaveLength(0);
    expect(r.constraints).toHaveLength(3);
  });

  it('unresolved 從 ParseResult 傳遞過來', () => {
    const r = c('△AB');
    expect(r.unresolved).toContain('△AB');
  });

  it('成功的輸入 unresolved 為空', () => {
    const r = c('△ABC');
    expect(r.unresolved).toHaveLength(0);
  });
});