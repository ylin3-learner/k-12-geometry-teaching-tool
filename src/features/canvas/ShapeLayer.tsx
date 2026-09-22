import { useSceneStore } from '../../store/useSceneStore';
import type { Vertex } from '../../domain/parser/types';

/**
 * 形狀圖層：把 Shape[] 渲染成 SVG <polygon>。
 *
 * 層序：在 ImageLayer 之上、VertexLayer 之下——
 * 形狀填色不應該蓋住頂點的紅點與標籤。
 */
export function ShapeLayer() {
  const shapes = useSceneStore((s) => s.shapes);
  const vertices = useSceneStore((s) => s.vertices);

  // vertex.id → Vertex 查找表
  const byId = new Map<string, Vertex>(vertices.map((v) => [v.id, v]));

  return (
    <g>
      {shapes.map((shape) => {
        if (!shape.visible) return null;

        const positions = shape.vertexIds
          .map((id) => byId.get(id))
          .filter((v): v is Vertex => v !== undefined);

        if (positions.length !== shape.vertexIds.length) {
          // 理論上不該發生——resolve 階段已檢查座標齊全
          return null;
        }

        const points = positions
          .map((v) => `${v.position.x},${v.position.y}`)
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