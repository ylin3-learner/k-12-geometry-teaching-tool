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
  key: string;
  vertexId: string;
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
  const selectedShapeIds = useSceneStore((s) => s.selectedShapeIds);

  const rotationShapeId = useSceneStore((s) => s.rotationShapeId);
  const rotationPivotId = useSceneStore((s) => s.rotationPivotId);
  const rotationAngle = useSceneStore((s) => s.rotationAngle);
  const rotationFlipped = useSceneStore((s) => s.rotationFlipped);  // 新增

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [snapFlashId, setSnapFlashId] = useState<string | null>(null);

  const isLinking = mode === 'manual-linking';

  const image = useSceneStore((s) => s.image);

  const imageW = image?.naturalWidth ?? 800;
  const imageH = image?.naturalHeight ?? 600;
  const padding = Math.min(imageW, imageH) * 0.03;

  const offsets = computeShapeOffsets(shapes, vertices);
  const distance = resolveExplodeDistanceByShape(
    shapes, vertices, offsets, imageW, imageH, padding, 3.0,
  );

  const rotation =
    rotationShapeId && rotationPivotId
      ? {
          shapeId: rotationShapeId,
          pivotId: rotationPivotId,
          angle: rotationAngle,
          flipped: rotationFlipped,   // 新增
        }
      : undefined;

  const shapePositions = computeShapeVertexPositions(
    shapes,
    vertices,
    offsets,
    distance,
    explodeProgress,
    rotation,
  );

  const byId = new Map<string, Vertex>(vertices.map((v) => [v.id, v]));
  const renderPoints: RenderPoint[] = [];
  const visibleShapes = shapes.filter((s) => s.visible);

  const isExplodingWithSelection =
    explodeProgress > 0.05 && selectedShapeIds.length > 0;

  if (visibleShapes.length === 0) {
    // 沒有可見形狀（手動連線模式剛開始）→ 顯示所有原始頂點
    for (const v of vertices) {
      renderPoints.push({
        key: v.id,
        vertexId: v.id,
        name: v.name,
        x: v.position.x,
        y: v.position.y,
      });
    }
  } else if (isExplodingWithSelection) {
    // 爆炸中且有選取 → 只顯示選中形狀的頂點（其他全部隱藏）
    const focusShapes = visibleShapes.filter((s) =>
      selectedShapeIds.includes(s.id),
    );
    for (const s of focusShapes) {
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
    // 不補孤立頂點——爆炸中不需要看到它們
  } else {
    // 一般狀態：所有可見形狀的頂點 + 孤立頂點
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