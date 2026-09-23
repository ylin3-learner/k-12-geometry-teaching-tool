import { useRef, useState } from 'react';
import { useSceneStore } from '../../store/useSceneStore';
import {
  screenToWorld,
  getSvgScale,
  worldEpsilonFromScale,
} from '../../domain/interaction/screen';
import { findSnapTarget } from '../../domain/interaction/snapVertex';
import {
  computeShapeOffsets,
  computeShapeVertexPositions,
  resolveExplodeDistanceByShape,
} from '../../domain/graph/computeExplodeOffsets';
import type { Vertex } from '../../domain/parser/types';

type RenderPoint = {
  key: string;            // shapeId + vertexId（唯一）
  vertexId: string;       // 資料層的 vertex id（拖曳/選取用）
  name: string;
  x: number;
  y: number;
};

export function VertexLayer() {
  const groupRef = useRef<SVGGElement>(null);
  const vertices = useSceneStore((s) => s.vertices);
  const shapes = useSceneStore((s) => s.shapes);
  const updateVertexPosition = useSceneStore((s) => s.updateVertexPosition);
  const mode = useSceneStore((s) => s.mode);
  const currentManualShape = useSceneStore((s) => s.currentManualShape);
  const setCurrentManualShape = useSceneStore((s) => s.setCurrentManualShape);
  const explodeProgress = useSceneStore((s) => s.explodeProgress);

  const rotationShapeId = useSceneStore((s) => s.rotationShapeId);
  const rotationPivotId = useSceneStore((s) => s.rotationPivotId);
  const rotationAngle = useSceneStore((s) => s.rotationAngle);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [snapFlashId, setSnapFlashId] = useState<string | null>(null);

  const isLinking = mode === 'manual-linking';

  // 計算每個形狀的每個頂點顯示位置
  const image = useSceneStore((s) => s.image);

  const imageW = image?.naturalWidth ?? 800;
  const imageH = image?.naturalHeight ?? 600;
  const padding = Math.min(imageW, imageH) * 0.03;

  const offsets = computeShapeOffsets(shapes, vertices);
  const distance = resolveExplodeDistanceByShape(
    shapes,
    vertices,
    offsets,
    imageW,
    imageH,
    padding,
    3.0,   // ← 明確指定 separationFactor
  );

  const rotation = rotationShapeId && rotationPivotId
    ? { shapeId: rotationShapeId, pivotId: rotationPivotId, angle: rotationAngle }
    : undefined;

  const shapePositions = computeShapeVertexPositions(
    shapes, vertices, offsets, distance, explodeProgress, rotation,
  );

  // 組出要渲染的點清單：每個形狀的每個頂點一份
  // progress = 0 時所有副本重疊；progress = 1 時分開
  const byId = new Map<string, Vertex>(vertices.map((v) => [v.id, v]));

  const renderPoints: RenderPoint[] = [];
  const visibleShapes = shapes.filter((s) => s.visible);

  if (visibleShapes.length === 0) {
    // 沒有可見形狀時，直接按原始頂點渲染（例如手動連線模式剛開始）
    for (const v of vertices) {
      renderPoints.push({
        key: v.id,
        vertexId: v.id,
        name: v.name,
        x: v.position.x,
        y: v.position.y,
      });
    }
  } else {
    // 有可見形狀時，按形狀渲染頂點（每個形狀一份）
    for (const s of visibleShapes) {
      const inner = shapePositions.get(s.id);
      if (!inner) continue;
      for (const vid of s.vertexIds) {
        const pos = inner.get(vid);
        const v = byId.get(vid);
        if (!pos || !v) continue;
        renderPoints.push({
          key: `${s.id}:${vid}`,
          vertexId: vid,
          name: v.name,
          x: pos.x,
          y: pos.y,
        });
      }
    }

    // 補上不屬於任何可見形狀的孤立頂點
    const inAnyShape = new Set<string>();
    for (const s of visibleShapes) {
      for (const vid of s.vertexIds) inAnyShape.add(vid);
    }
    for (const v of vertices) {
      if (!inAnyShape.has(v.id)) {
        renderPoints.push({
          key: v.id,
          vertexId: v.id,
          name: v.name,
          x: v.position.x,
          y: v.position.y,
        });
      }
    }
  }

  const handleVertexClick = (e: React.MouseEvent, vertexId: string) => {
    e.stopPropagation();
    if (!isLinking) return;

    const idx = currentManualShape.indexOf(vertexId);
    if (idx >= 0) {
      setCurrentManualShape(currentManualShape.slice(0, idx));
    } else {
      setCurrentManualShape([...currentManualShape, vertexId]);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, vertexId: string) => {
    e.stopPropagation();
    if (isLinking) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDraggingId(vertexId);
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
      {renderPoints.map((pt) => {
        const isDragging = draggingId === pt.vertexId;
        const isFlashing = snapFlashId === pt.vertexId;
        const isSelected = currentManualShape.includes(pt.vertexId);

        return (
          <g key={pt.key}>
            <circle
              cx={pt.x}
              cy={pt.y}
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
              onClick={(e) => handleVertexClick(e, pt.vertexId)}
              onPointerDown={(e) => handlePointerDown(e, pt.vertexId)}
            />
            <text
              x={pt.x + 10}
              y={pt.y - 10}
              fill="#1e40af"
              stroke="#fff"
              strokeWidth={3}
              paintOrder="stroke"
              fontSize={16}
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {pt.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}