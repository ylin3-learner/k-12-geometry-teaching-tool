import { useSceneStore } from '../../store/useSceneStore';

export function LayerPanel() {
  const shapes = useSceneStore((s) => s.shapes);
  const toggleShape = useSceneStore((s) => s.toggleShape);
  const selectedShapeIds = useSceneStore((s) => s.selectedShapeIds);
  const toggleShapeSelection = useSceneStore((s) => s.toggleShapeSelection);
  const clearShapeSelection = useSceneStore((s) => s.clearShapeSelection);

  if (shapes.length === 0) return null;

  return (
    <section className="sidebar__section">
      <div className="layer-panel__header">
        <label className="sidebar__label">圖層（{shapes.length}）</label>
        {selectedShapeIds.length > 0 && (
          <button
            type="button"
            className="layer-panel__clear"
            onClick={clearShapeSelection}
          >
            取消選取（{selectedShapeIds.length}）
          </button>
        )}
      </div>

      <ul className="layer-list">
        {shapes.map((shape) => {
          const isSelected = selectedShapeIds.includes(shape.id);
          return (
            <li
              key={shape.id}
              className={`layer-item ${isSelected ? 'layer-item--selected' : ''}`}
              onClick={() => toggleShapeSelection(shape.id)}
            >
              <input
                type="checkbox"
                checked={shape.visible}
                onChange={() => toggleShape(shape.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="layer-item__name">{shape.name}</span>
              <span className="layer-item__source">
                {shape.source === 'manual' ? '手動' : '文字'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}