import { useRef } from 'react';
import { ImageLayer } from './ImageLayer';
import { ShapeLayer } from './ShapeLayer';
import { SharedVertexHalo } from './SharedVertexHalo'; // 新增
import { VertexLayer } from './VertexLayer';
import { useSceneStore } from '../../store/useSceneStore';
import {
    screenToWorld,
    getSvgScale,
    worldEpsilonFromScale,
} from '../../domain/interaction/screen';
import { findSnapTarget } from '../../domain/interaction/snapVertex';

// 下一個可用的字母標籤（A → B → C → ...），僅在 idle 模式使用
function nextLabel(existing: string[]): string {
    const used = new Set(existing);
    for (let i = 0; i < 26; i++) {
        const label = String.fromCharCode(65 + i);
        if (!used.has(label)) return label;
    }
    return '?';
}

export function Canvas() {
    const svgRef = useRef<SVGSVGElement>(null);
    const image = useSceneStore((s) => s.image);
    const vertices = useSceneStore((s) => s.vertices);
    const mode = useSceneStore((s) => s.mode);
    const namingQueue = useSceneStore((s) => s.namingQueue);
    const addVertex = useSceneStore((s) => s.addVertex);
    const setNamingQueue = useSceneStore((s) => s.setNamingQueue);

    const width = image?.naturalWidth ?? 800;
    const height = image?.naturalHeight ?? 600;

    const handleBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const target = e.target as Element;
        if (target !== e.currentTarget && target.tagName !== 'image') return;

        const svg = svgRef.current;
        if (!svg) return;

        const world = screenToWorld(svg, e.clientX, e.clientY);
        const scale = getSvgScale(svg);
        const worldEpsilon = worldEpsilonFromScale(scale);

        if (findSnapTarget(world, vertices, worldEpsilon)) return;

        let name: string;
        if (mode === 'guided-naming' && namingQueue.length > 0) {
            name = namingQueue[0];
            setNamingQueue(namingQueue.slice(1));
        } else if (mode === 'manual-linking') {
            // 手動連線模式：允許新增頂點，自動命名
            name = nextLabel(vertices.map((v) => v.name));
        } else {
            return;   // idle：不加頂點
        }

        addVertex({
            id: crypto.randomUUID(),
            name,
            position: world,
        });
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={handleBackgroundClick}
            style={{
                width: '100%',
                height: '100%',
                background: '#fafafa',
                display: 'block',
            }}
        >
            <ImageLayer />
            <ShapeLayer />         {/* 新增：形狀在底層 */}
            <SharedVertexHalo />    {/* 新增 */}
            <VertexLayer />        {/* 頂點在上層 */}
        </svg>
    );
}