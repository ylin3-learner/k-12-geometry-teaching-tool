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
    explodeProgress: 0,
    rotationShapeId: null,
    rotationPivotId: null,
    rotationAngle: 0,
};

// 計算 Shape 的 bbox 對角線（用來判斷「哪個圖形較小」）
function bboxDiagonal(shape: Shape, byId: Map<string, Vertex>): number {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const vid of shape.vertexIds) {
        const v = byId.get(vid);
        if (!v) continue;
        if (v.position.x < minX) minX = v.position.x;
        if (v.position.x > maxX) maxX = v.position.x;
        if (v.position.y < minY) minY = v.position.y;
        if (v.position.y > maxY) maxY = v.position.y;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    return Math.sqrt(w * w + h * h);
}

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

    setExplodeProgress: (p: number) => void;

    startRotation: () => void;
    setRotationAngle: (angle: number) => void;
    stopRotation: () => void;

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

    startRotation: () => {
        const state = get();
        const visibleShapes = state.shapes.filter((s) => s.visible);
        if (visibleShapes.length < 2) return;

        const byId = new Map(state.vertices.map((v) => [v.id, v]));

        // 找較小的圖形（bbox 對角線較短者）
        let smallest = visibleShapes[0];
        let smallestDiag = Infinity;
        for (const s of visibleShapes) {
            const diag = bboxDiagonal(s, byId);
            if (diag < smallestDiag) {
                smallestDiag = diag;
                smallest = s;
            }
        }

        // 找與它相關的共用頂點作為 pivot
        const conn = state.connections.find(
            (c) => c.shapeA === smallest.id || c.shapeB === smallest.id,
        );
        if (!conn || conn.sharedVertexIds.length === 0) return;

        set({
            rotationShapeId: smallest.id,
            rotationPivotId: conn.sharedVertexIds[0],
            rotationAngle: 0,
            // 旋轉時強制合回原圖（避免兩個動畫同時作用）
            explodeProgress: 0,
        });
    },

    setRotationAngle: (rotationAngle) => set({ rotationAngle }),

    stopRotation: () =>
        set({
            rotationShapeId: null,
            rotationPivotId: null,
            rotationAngle: 0,
        }),

    setExplodeProgress: (explodeProgress) => set({ explodeProgress }),

    resetAnnotations: () =>
        set((state) => {
            const pipeline = runParserPipeline(state.text);
            return {
                vertices: [],
                shapes: [],
                connections: [],
                currentManualShape: [],
                explodeProgress: 0,
                rotationShapeId: null,
                rotationPivotId: null,
                rotationAngle: 0,
                ...pipeline,
            };
        }),
    reset: () => set(INITIAL_SCENE),
}));