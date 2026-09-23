import { useSceneStore } from '../../store/useSceneStore';
import {
  computeShapeOffsets,
  computeShapeVertexPositions,
  resolveExplodeDistanceByShape,
} from '../../domain/graph/computeExplodeOffsets';

export function ShapeLayer() {
  const shapes = useSceneStore((s) => s.shapes);
  const vertices = useSceneStore((s) => s.vertices);
  const explodeProgress = useSceneStore((s) => s.explodeProgress);
  const image = useSceneStore((s) => s.image);

  const imageW = image?.naturalWidth ?? 800;
  const imageH = image?.naturalHeight ?? 600;
  const padding = Math.min(imageW, imageH) * 0.03;   // 圖片短邊 3%

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
  const shapePositions = computeShapeVertexPositions(
    shapes,
    vertices,
    offsets,
    distance,
    explodeProgress,
  );

  return (
    <g>
      {shapes.map((shape) => {
        if (!shape.visible) return null;

        const inner = shapePositions.get(shape.id);
        if (!inner) return null;

        const positions = shape.vertexIds
          .map((id) => inner.get(id))
          .filter((p): p is { x: number; y: number } => p !== undefined);

        if (positions.length !== shape.vertexIds.length) return null;

        const points = positions
          .map((p) => `${p.x},${p.y}`)
          .join(' ');

        return (
          <polygon
            key={shape.id}
            points={points}
            fill="rgba(74, 144, 226, 0.12)"
            stroke="#4a90e2"
            strokeWidth={2}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
    </g>
  );
}