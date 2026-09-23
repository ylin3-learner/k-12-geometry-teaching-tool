import { useSceneStore } from '../../store/useSceneStore';

export function RotationControl() {
  const shapes = useSceneStore((s) => s.shapes);
  const visibleShapes = shapes.filter((s) => s.visible);
  const selectedShapeIds = useSceneStore((s) => s.selectedShapeIds);
  const rotationShapeId = useSceneStore((s) => s.rotationShapeId);
  const rotationAngle = useSceneStore((s) => s.rotationAngle);
  const rotationFlipped = useSceneStore((s) => s.rotationFlipped);
  const startRotation = useSceneStore((s) => s.startRotation);
  const setRotationAngle = useSceneStore((s) => s.setRotationAngle);
  const toggleRotationFlip = useSceneStore((s) => s.toggleRotationFlip);
  const stopRotation = useSceneStore((s) => s.stopRotation);
  const autoAlignRotation = useSceneStore((s) => s.autoAlignRotation);

  const selectedVisible = visibleShapes.filter((s) =>
    selectedShapeIds.includes(s.id),
  );
  const tooManySelected = selectedVisible.length > 1;
  const canRotate = visibleShapes.length >= 2 && !tooManySelected;

  if (rotationShapeId) {
    const targetShape = shapes.find((s) => s.id === rotationShapeId);
    return (
      <section className="sidebar__section">
        <label className="sidebar__label">旋轉（找對應邊）</label>
        <div className="rotation-control">
          <div className="rotation-control__target">
            正在旋轉：<code>{targetShape?.name ?? '?'}</code>
          </div>

          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotationAngle}
            onChange={(e) => setRotationAngle(Number(e.target.value))}
            className="rotation-control__slider"
          />

          <div className="rotation-control__angle">{rotationAngle}°</div>

          {/* 翻轉按鈕 */}
          <button
            type="button"
            className={`btn-ghost rotation-control__flip ${
              rotationFlipped ? 'rotation-control__flip--active' : ''
            }`}
            onClick={toggleRotationFlip}
          >
            {rotationFlipped ? '取消翻轉' : '沿對稱軸翻轉'}
          </button>

          <button
            type="button"
            className="btn-ghost rotation-control__align"
            onClick={autoAlignRotation}
          >
            自動對齊對應邊
          </button>

          <button type="button" className="btn-ghost" onClick={stopRotation}>
            結束旋轉
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="sidebar__section">
      <label className="sidebar__label">
        旋轉（找對應邊）
        {selectedVisible.length === 1 && (
          <span className="sidebar__label__hint">
            （將旋轉「{selectedVisible[0].name}」）
          </span>
        )}
      </label>
      <button
        type="button"
        className="btn-primary"
        onClick={startRotation}
        disabled={!canRotate}
      >
        開始旋轉
      </button>
      {!canRotate && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          {tooManySelected
            ? '旋轉一次只能選 1 個圖層'
            : '需要至少 2 個可見圖層'}
        </div>
      )}
    </section>
  );
}