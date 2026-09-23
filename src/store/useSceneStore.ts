import { create } from 'zustand';
import type {
    ClassifiedStatements,
    Connection,
    OCRResult,
    Scene,
    Shape,
    Vertex,
} from '../domain/parser/types';
import { normalizeLatex } from '../domain/parser/latexNormalizer';
import { tokenize } from '../domain/parser/tokenizer';
import { parse } from '../domain/parser/parser';
import { classify } from '../domain/parser/classifier';
import { collectRequiredLabels } from '../domain/semantic/collectRequiredLabels';
import { findConnections } from '../domain/graph/connectivity';

// ── 初始場景 ──
const INITIAL_SCENE: Scene = {
    image: null,
    text: '',
    classifiedStatements: null,
    ocrResult: null,
    vertices: [],
    shapes: [],
    connections: [],
    mode: 'idle',
    namingQueue: [],
    namingTotal: 0,
    currentManualShape: [],
};

// ── Pipeline：從文字推導出 Parser 相關狀態 ──
// 抽出來讓 setText 和 applyFix 共用
type ParserState = Pick<
    Scene,
    'classifiedStatements' | 'namingQueue' | 'namingTotal' | 'mode'
>;

function runParserPipeline(text: string): ParserState {
    if (!text.trim()) {
        return {
            classifiedStatements: null,
            namingQueue: [],
            namingTotal: 0,
            mode: 'idle',
        };
    }

    const normalized = normalizeLatex(text).unicode;
    const parseResult = parse(tokenize(normalized));
    const classified = classify(parseResult);
    const labels = collectRequiredLabels(parseResult.statements);

    return {
        classifiedStatements: classified,
        namingQueue: labels,
        namingTotal: labels.length,
        mode: labels.length > 0 ? 'guided-naming' : 'idle',
    };
}

// ── Store 型別 ──
type SceneStore = Scene & {
    setImage: (image: HTMLImageElement | null) => void;
    setText: (text: string) => void;
    /** 對第一個匹配的片段做替換，並重新跑 pipeline（給智能提示用） */
    applyTextFix: (original: string, replacement: string) => void;

    setClassifiedStatements: (c: ClassifiedStatements | null) => void;
    setOCRResult: (r: OCRResult | null) => void;

    addVertex: (v: Vertex) => void;
    updateVertexPosition: (id: string, position: { x: number; y: number }) => void;
    clearVertices: () => void;

    setShapes: (shapes: Shape[]) => void;
    setConnections: (connections: Connection[]) => void;

    addShape: (shape: Shape) => void;
    removeShape: (id: string) => void;
    toggleShape: (id: string) => void;

    setMode: (mode: Scene['mode']) => void;
    setNamingQueue: (q: string[]) => void;
    setNamingTotal: (n: number) => void;
    setCurrentManualShape: (ids: string[]) => void;

    resetAnnotations: () => void;
    reset: () => void;
};

export const useSceneStore = create<SceneStore>((set, get) => ({
    ...INITIAL_SCENE,

    setImage: (image) => set({ image }),

    setText: (text) => set({ text, ...runParserPipeline(text) }),

    applyTextFix: (original, replacement) => {
        const currentText = get().text;
        const idx = currentText.indexOf(original);
        if (idx < 0) return;

        const newText =
            currentText.slice(0, idx) +
            replacement +
            currentText.slice(idx + original.length);

        set({ text: newText, ...runParserPipeline(newText) });
    },

    setClassifiedStatements: (classifiedStatements) => set({ classifiedStatements }),
    setOCRResult: (ocrResult) => set({ ocrResult }),

    addVertex: (v) => set((state) => ({ vertices: [...state.vertices, v] })),

    updateVertexPosition: (id, position) =>
        set((state) => ({
            vertices: state.vertices.map((v) =>
                v.id === id ? { ...v, position } : v,
            ),
        })),

    clearVertices: () => set({ vertices: [] }),

    setShapes: (shapes) => set({ shapes }),
    setConnections: (connections) => set({ connections }),

    addShape: (shape) =>
        set((state) => {
            const nextShapes = [...state.shapes, shape];
            return { shapes: nextShapes, connections: findConnections(nextShapes) };
        }),

    toggleShape: (id) =>
        set((state) => ({
            shapes: state.shapes.map((s) =>
                s.id === id ? { ...s, visible: !s.visible } : s,
            ),
        })),

    removeShape: (id) =>
        set((state) => {
            const nextShapes = state.shapes.filter((s) => s.id !== id);
            return { shapes: nextShapes, connections: findConnections(nextShapes) };
        }),

    setMode: (mode) => set({ mode }),
    setNamingQueue: (namingQueue) => set({ namingQueue }),
    setNamingTotal: (namingTotal) => set({ namingTotal }),
    setCurrentManualShape: (currentManualShape) => set({ currentManualShape }),

    resetAnnotations: () =>
        set((state) => {
            // 保留 text 與 image；根據 text 重跑 pipeline 得到新的 namingQueue
            const pipeline = runParserPipeline(state.text);
            return {
                vertices: [],
                shapes: [],
                connections: [],
                currentManualShape: [],
                ...pipeline,
            };
        }),
    reset: () => set(INITIAL_SCENE),
}));