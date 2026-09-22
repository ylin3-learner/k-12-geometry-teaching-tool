import { useRef, useState } from 'react';
import { useSceneStore } from '../../store/useSceneStore';
import {
  screenToWorld,
  getSvgScale,
  worldEpsilonFromScale,
} from '../../domain/interaction/screen';
import { findSnapTarget } from '../../domain/interaction/snapVertex';

export function VertexLayer() {
  const groupRef = useRef<SVGGElement>(null);
  const vertices = useSceneStore((s) => s.vertices);
  const updateVertexPosition = useSceneStore((s) => s.updateVertexPosition);
  const mode = useSceneStore((s) => s.mode);
  const currentManualShape = useSceneStore((s) => s.currentManualShape);
  const setCurrentManualShape = useSceneStore((s) => s.setCurrentManualShape);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [snapFlashId, setSnapFlashId] = useState<string | null>(null);

  const isLinking = mode === 'manual-linking';

  const handleVertexClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isLinking) return;

    const idx = currentManualShape.indexOf(id);
    if (idx >= 0) {
      // 已選 → 從該位置起全部移除（可反悔）
      setCurrentManualShape(currentManualShape.slice(0, idx));
    } else {
      setCurrentManualShape([...currentManualShape, id]);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (isLinking) return;   // 連線模式不拖曳
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
        const isSelected = currentManualShape.includes(v.id);

        return (
          <g key={v.id}>
            <circle
              cx={v.position.x}
              cy={v.position.y}
              r={isFlashing ? 8 : 5}
              fill={isSelected ? '#4a90e2' : '#e74c3c'}
              stroke="#fff"
              strokeWidth={2}
              style={{
                cursor: isLinking
                  ? 'pointer'
                  : isDragging
                    ? 'grabbing'
                    : 'grab',
                transition: 'r 0.15s, fill 0.15s',
              }}
              onClick={(e) => handleVertexClick(e, v.id)}
              onPointerDown={(e) => handlePointerDown(e, v.id)}
            />
            <text
              x={v.position.x + 10}
              y={v.position.y - 10}
              fill="#1e40af"
              stroke="#fff"
              strokeWidth={3}
              paintOrder="stroke"
              fontSize={16}
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
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