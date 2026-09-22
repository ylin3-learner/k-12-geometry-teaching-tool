import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';
import { parse } from './parser';
import type { Statement } from './types';

const p = (input: string): Statement[] => parse(tokenize(input));

describe('parse — 定義性', () => {
  it('△ABC → 1 個 triangle', () => {
    const r = p('△ABC');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'triangle', vertices: ['A', 'B', 'C'] });
  });

  it('△ABC和△ADE → 2 個 triangle（中文被跳過）', () => {
    const r = p('△ABC和△ADE');
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ kind: 'triangle', vertices: ['A', 'B', 'C'] });
    expect(r[1]).toMatchObject({ kind: 'triangle', vertices: ['A', 'D', 'E'] });
  });

  it('□ABCD → 1 個 quadrilateral', () => {
    const r = p('□ABCD');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'quadrilateral', vertices: ['A', 'B', 'C', 'D'] });
  });

  it('問句/填空：(1) △CAB~△___ → 只抓 △CAB', () => {
    const r = p('(1) △CAB~△___');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'triangle', vertices: ['C', 'A', 'B'] });
  });

  it('△ABC 少於 3 個字母 → 不產生 triangle', () => {
    const r = p('△AB');
    expect(r.filter((s) => s.kind === 'triangle')).toHaveLength(0);
  });
});

describe('parse — 線段長度', () => {
  it('AC=4 → 1 個 segment-length', () => {
    const r = p('AC=4');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'segment-length', segment: ['A', 'C'], value: 4 });
  });

  it('「若」前綴：若BC=8 → 1 個 segment-length', () => {
    const r = p('若BC=8');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'segment-length', segment: ['B', 'C'], value: 8 });
  });

  it('「已知」前綴：已知AB=4', () => {
    const r = p('已知AB=4');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'segment-length', segment: ['A', 'B'], value: 4 });
  });

  it('「設」前綴，值為變數 x → 不產生 Statement（進 unresolved）', () => {
    const r = p('設AC=x');
    expect(r.filter((s) => s.kind === 'segment-length')).toHaveLength(0);
  });

  it('多子句：AC=4；CD=3、BC=5 → 3 個 segment-length', () => {
    const r = p('AC=4；CD=3、BC=5');
    expect(r).toHaveLength(3);
    expect(r.map((s) => s.kind)).toEqual([
      'segment-length', 'segment-length', 'segment-length',
    ]);
  });
});

describe('parse — 角度', () => {
  it('∠B=∠C（兩個單字母角）→ equal-angle', () => {
    const r = p('∠B=∠C');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      kind: 'equal-angle',
      angles: [{ vertex: 'B' }, { vertex: 'C' }],
    });
  });

  it('∠ABC=∠DEF（兩個三字母角）→ equal-angle', () => {
    const r = p('∠ABC=∠DEF');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      kind: 'equal-angle',
      angles: [
        { vertex: 'B', rays: ['A', 'C'] },
        { vertex: 'E', rays: ['D', 'F'] },
      ],
    });
  });

  it('∠B=∠AEF（單混三）→ equal-angle，兩種形式各自保留', () => {
    const r = p('∠B=∠AEF');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      kind: 'equal-angle',
      angles: [{ vertex: 'B' }, { vertex: 'E', rays: ['A', 'F'] }],
    });
  });

  it('∠B=∠E，∠C=∠F → 2 個 equal-angle', () => {
    const r = p('∠B=∠E，∠C=∠F');
    expect(r).toHaveLength(2);
    expect(r.every((s) => s.kind === 'equal-angle')).toBe(true);
  });

  it('∠B=60° → angle-value', () => {
    const r = p('∠B=60°');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      kind: 'angle-value',
      angle: { vertex: 'B' },
      value: 60,
    });
  });
});

describe('parse — 連等式（保守方案）', () => {
  it('∠C=∠AEF=90° → 2 個 Statement（equal-angle + angle-value），不推導 ∠C=90°', () => {
    const r = p('∠C=∠AEF=90°');
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({
      kind: 'equal-angle',
      angles: [{ vertex: 'C' }, { vertex: 'E', rays: ['A', 'F'] }],
    });
    expect(r[1]).toMatchObject({
      kind: 'angle-value',
      angle: { vertex: 'E', rays: ['A', 'F'] },
      value: 90,
    });
  });

  it('∠A=∠B=∠C → 2 個 equal-angle（相鄰兩兩配對）', () => {
    const r = p('∠A=∠B=∠C');
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ kind: 'equal-angle', angles: [{ vertex: 'A' }, { vertex: 'B' }] });
    expect(r[1]).toMatchObject({ kind: 'equal-angle', angles: [{ vertex: 'B' }, { vertex: 'C' }] });
  });
});

describe('parse — 修飾詞逐子句跳過', () => {
  it('若∠A=∠CED，若BC=20，CD=5 → 3 個 Statement', () => {
    const r = p('若∠A=∠CED，若BC=20，CD=5');
    expect(r).toHaveLength(3);
    expect(r.map((s) => s.kind)).toEqual(['equal-angle', 'segment-length', 'segment-length']);
  });
});

describe('parse — 平行與垂直', () => {
  it('AB∥DE → parallel', () => {
    const r = p('AB∥DE');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      kind: 'parallel',
      segments: [['A', 'B'], ['D', 'E']],
    });
  });

  it('AB⊥CD → perpendicular', () => {
    const r = p('AB⊥CD');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      kind: 'perpendicular',
      segments: [['A', 'B'], ['C', 'D']],
    });
  });
});

describe('parse — 只貼題幹', () => {
  it('AB∥DE，AC=4，CD=3 → 0 個 triangle，3 個約束', () => {
    const r = p('AB∥DE，AC=4，CD=3');
    expect(r.filter((s) => s.kind === 'triangle')).toHaveLength(0);
    expect(r).toHaveLength(3);
    expect(r.map((s) => s.kind).sort()).toEqual([
      'parallel', 'segment-length', 'segment-length',
    ]);
  });
});