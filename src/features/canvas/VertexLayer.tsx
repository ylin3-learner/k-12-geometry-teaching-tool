import { useRef, useState } from 'react';
import { useSceneStore } from '../../store/useSceneStore';
import {
    screenToWorld,
    getSvgScale,
    worldEpsilonFromScale,
} from '../../domain/interaction/screen';
import { findSnapTarget } from '../../domain/interaction/snapVertex';

/**
 * 頂點圖層：顯示所有頂點 + 拖曳 + 吸附。
 * 背景點擊（新增頂點）由 Canvas 處理。
 */
export function VertexLayer() {
    const groupRef = useRef<SVGGElement>(null);
    const vertices = useSceneStore((s) => s.vertices);
    const updateVertexPosition = useSceneStore((s) => s.updateVertexPosition);

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [snapFlashId, setSnapFlashId] = useState<string | null>(null);

    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        e.stopPropagation();
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        setDraggingId(id);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingId) return;
        const svg = groupRef.current?.ownerSVGElement;
        if (!svg) return;

        const world = screenToWorld(svg, e.clientX, e.clientY);
        const scale = getSvgScale(svg);
        const worldEpsilon = worldEpsilonFromScale(scale);

        // 排除自己，避免自我吸附
        const others = vertices.filter((v) => v.id !== draggingId);
        const target = findSnapTarget(world, others, worldEpsilon);

        if (target) {
            updateVertexPosition(draggingId, target.position);
            if (snapFlashId !== target.id) {
                setSnapFlashId(target.id);
                window.setTimeout(() => setSnapFlashId(null), 200);
            }
        } else {
            updateVertexPosition(draggingId, world);
        }
    };

    const handlePointerUp = () => {
        setDraggingId(null);
        setSnapFlashId(null);
    };

    return (
        <g
            ref={groupRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {vertices.map((v) => {
                const isDragging = draggingId === v.id;
                const isFlashing = snapFlashId === v.id;
                return (
                    <g key={v.id}>
                        <circle
                            cx={v.position.x}
                            cy={v.position.y}
                            r={isFlashing ? 8 : 5}
                            fill="#e74c3c"
                            stroke="#fff"
                            strokeWidth={2}
                            style={{
                                cursor: isDragging ? 'grabbing' : 'grab',
                                transition: 'r 0.15s',
                            }}
                            onPointerDown={(e) => handlePointerDown(e, v.id)}
                        />
                        <text
                            x={v.position.x + 10}
                            y={v.position.y - 10}
                            fill="#1e40af"             // 深藍
                            stroke="#fff"              // 白色描邊
                            strokeWidth={3}
                            paintOrder="stroke"        // 描邊畫在字下方
                            fontSize={16}
                            fontWeight="700"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                            {v.name}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}