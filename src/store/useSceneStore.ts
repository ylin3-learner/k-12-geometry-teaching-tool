import { create } from 'zustand';
import type {
  ClassifiedStatements,
  Connection,
  OCRResult,
  Scene,
  Shape,
  Vertex,
} from '../domain/parser/types';

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
  currentManualShape: [],
};

// ── Store 的 actions ──
type SceneStore = Scene & {
  // 圖片
  setImage: (image: HTMLImageElement | null) => void;

  // 文字
  setText: (text: string) => void;
  setClassifiedStatements: (c: ClassifiedStatements | null) => void;

  // OCR（Sprint 2.5 用）
  setOCRResult: (r: OCRResult | null) => void;

  // 頂點
  addVertex: (v: Vertex) => void;
  updateVertexPosition: (id: string, position: { x: number; y: number }) => void;
  clearVertices: () => void;

  // Shape / Connection（Sprint 1 步驟 3 之後使用）
  setShapes: (shapes: Shape[]) => void;
  setConnections: (connections: Connection[]) => void;

  // 模式
  setMode: (mode: Scene['mode']) => void;
  setNamingQueue: (q: string[]) => void;
  setCurrentManualShape: (ids: string[]) => void;

  // 重置整個場景
  reset: () => void;
};

export const useSceneStore = create<SceneStore>((set) => ({
  ...INITIAL_SCENE,

  setImage: (image) => set({ image }),

  setText: (text) => set({ text }),
  setClassifiedStatements: (classifiedStatements) => set({ classifiedStatements }),

  setOCRResult: (ocrResult) => set({ ocrResult }),

  addVertex: (v) =>
    set((state) => ({ vertices: [...state.vertices, v] })),

  updateVertexPosition: (id, position) =>
    set((state) => ({
      vertices: state.vertices.map((v) =>
        v.id === id ? { ...v, position } : v,
      ),
    })),

  clearVertices: () => set({ vertices: [] }),

  setShapes: (shapes) => set({ shapes }),
  setConnections: (connections) => set({ connections }),

  setMode: (mode) => set({ mode }),
  setNamingQueue: (namingQueue) => set({ namingQueue }),
  setCurrentManualShape: (currentManualShape) => set({ currentManualShape }),

  reset: () => set(INITIAL_SCENE),
}));