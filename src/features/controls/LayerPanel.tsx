import { useSceneStore } from '../../store/useSceneStore';

/**
 * 形狀圖層開關面板。
 *
 * 每個 Shape 一個勾選框，控制 visible。ShapeLayer 會依 visible 決定是否渲染。
 * 沒有形狀時不顯示（避免空面板佔位）。
 */
export function LayerPanel() {
  const shapes = useSceneStore((s) => s.shapes);
  const toggleShape = useSceneStore((s) => s.toggleShape);

  if (shapes.length === 0) return null;

  return (
    <section className="sidebar__section">
      <label className="sidebar__label">圖層（{shapes.length}）</label>
      <ul className="layer-list">
        {shapes.map((shape) => (
          <li key={shape.id} className="layer-item">
            <label className="layer-item__label">
              <input
                type="checkbox"
                checked={shape.visible}
                onChange={() => toggleShape(shape.id)}
              />
              <span className="layer-item__name">{shape.name}</span>
              <span className="layer-item__source">
                {shape.source === 'manual' ? '手動' : '文字'}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}