import { useSceneStore } from '../../store/useSceneStore';
import { computeSharedVertexIds } from '../../domain/graph/sharedVertices';
import type { Vertex } from '../../domain/parser/types';

/**
 * 共用頂點光環：在形狀共用點上畫一個脈衝圓環。
 *
 * 視覺層級：在 ShapeLayer 之上、VertexLayer 之下——
 * 光環是「背景光暈」，不能遮住紅點（互動點）。
 *
 * 動畫用 SVG <animate>——瀏覽器原生支援，不需 JS 執行迴圈。
 */
export function SharedVertexHalo() {
  const connections = useSceneStore((s) => s.connections);
  const shapes = useSceneStore((s) => s.shapes);
  const vertices = useSceneStore((s) => s.vertices);

  const visibleShapeIds = new Set(
    shapes.filter((s) => s.visible).map((s) => s.id),
  );

  const sharedIds = computeSharedVertexIds(connections, visibleShapeIds);
  if (sharedIds.size === 0) return null;

  const byId = new Map<string, Vertex>(vertices.map((v) => [v.id, v]));

  return (
    <g style={{ pointerEvents: 'none' }}>
      {Array.from(sharedIds).map((vid) => {
        const v = byId.get(vid);
        if (!v) return null;

        return (
          <circle
            key={vid}
            cx={v.position.x}
            cy={v.position.y}
            r={10}
            fill="none"
            stroke="#f39c12"
            strokeWidth={2}
          >
            <animate
              attributeName="r"
              values="8;16;8"
              dur="1.6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.9;0.15;0.9"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </g>
  );
}