import { useSceneStore } from '../../store/useSceneStore';
import {
  computeShapeOffsets,
  computeShapeVertexPositions,
  resolveExplodeDistanceByShape,
} from '../../domain/graph/computeExplodeOffsets';
import {
  getPatternStyle,
  BASE_FILL_OPACITY,
  LINE_STROKE_OPACITY,
  LINE_STROKE_WIDTH,
  SHAPE_STROKE_WIDTH,
} from './patternPalette';

export function ShapeLayer() {
  const shapes = useSceneStore((s) => s.shapes);
  const vertices = useSceneStore((s) => s.vertices);
  const explodeProgress = useSceneStore((s) => s.explodeProgress);
  const rotationShapeId = useSceneStore((s) => s.rotationShapeId);
  const rotationPivotId = useSceneStore((s) => s.rotationPivotId);
  const rotationAngle = useSceneStore((s) => s.rotationAngle);
  const image = useSceneStore((s) => s.image);
  const selectedShapeIds = useSceneStore((s) => s.selectedShapeIds);

  const imageW = image?.naturalWidth ?? 800;
  const imageH = image?.naturalHeight ?? 600;
  const padding = Math.min(imageW, imageH) * 0.03;

  // 決定參與爆炸的形狀：
  // - 有選取 → 只爆炸選中的
  // - 沒選取 → 全部可見一起爆炸（向後相容）
  const shapesForExplode =
    selectedShapeIds.length > 0
      ? shapes.filter((s) => s.visible && selectedShapeIds.includes(s.id))
      : shapes;

  const offsets = computeShapeOffsets(shapesForExplode, vertices);
  const distance = resolveExplodeDistanceByShape(
    shapesForExplode, vertices, offsets, imageW, imageH, padding, 3.0,
  );

  const rotation =
    rotationShapeId && rotationPivotId
      ? { shapeId: rotationShapeId, pivotId: rotationPivotId, angle: rotationAngle }
      : undefined;

  const shapePositions = computeShapeVertexPositions(
    shapes, vertices, offsets, distance, explodeProgress, rotation,
  );

  const visibleShapes = shapes.filter((s) => s.visible);

  const styledShapes = visibleShapes.map((shape, index) => ({
    shape,
    style: getPatternStyle(index, visibleShapes.length),
  }));

  const shapesWithPoints = styledShapes
    .map(({ shape, style }) => {
      const inner = shapePositions.get(shape.id);
      if (!inner) return null;

      const positions = shape.vertexIds
        .map((id) => inner.get(id))
        .filter((p): p is { x: number; y: number } => p !== undefined);

      if (positions.length !== shape.vertexIds.length) return null;

      const points = positions.map((p) => `${p.x},${p.y}`).join(' ');
      return { shape, style, points };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // 判斷是否處於「爆炸中且有選取」
  const isExploding = explodeProgress > 0.05;
  const hasSelection = selectedShapeIds.length > 0;

  return (
    <g>
      <defs>
        {shapesWithPoints.map(({ shape, style }) => (
          <pattern
            key={shape.id}
            id={`shape-pattern-${shape.id}`}
            patternUnits="userSpaceOnUse"
            width={style.patternSize}
            height={style.patternSize}
            patternTransform={`rotate(${style.angle})`}
          >
            <rect
              width="100%"
              height="100%"
              fill={style.color}
              fillOpacity={BASE_FILL_OPACITY}
            />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={style.patternSize}
              stroke={style.color}
              strokeWidth={LINE_STROKE_WIDTH}
              strokeOpacity={LINE_STROKE_OPACITY}
            />
          </pattern>
        ))}
      </defs>

      {/* 2. 每個形狀用 pattern 填色 */}
      {shapesWithPoints.map(({ shape, style, points }) => {
        // 爆炸中且有選取 → 未選中的形狀完全不渲染
        // （不管 checkbox 是勾選還是取消，都當作隱藏）
        if (isExploding && hasSelection && !selectedShapeIds.includes(shape.id)) {
          return null;
        }

        return (
          <polygon
            key={shape.id}
            points={points}
            fill={`url(#shape-pattern-${shape.id})`}
            stroke={style.color}
            strokeWidth={SHAPE_STROKE_WIDTH}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
    </g>
  );
}