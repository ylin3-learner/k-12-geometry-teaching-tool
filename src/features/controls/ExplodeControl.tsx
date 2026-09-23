import { useSceneStore } from '../../store/useSceneStore';

const DURATION_MS = 600;

export function ExplodeControl() {
  const progress = useSceneStore((s) => s.explodeProgress);
  const setProgress = useSceneStore((s) => s.setExplodeProgress);
  const shapes = useSceneStore((s) => s.shapes);
  const selectedShapeIds = useSceneStore((s) => s.selectedShapeIds);

  // 計算「參與爆炸的形狀」
  // 有選取 → 用選中的；沒選 → 用所有可見的
  const visibleShapes = shapes.filter((s) => s.visible);
  const eligibleShapes =
    selectedShapeIds.length > 0
      ? visibleShapes.filter((s) => selectedShapeIds.includes(s.id))
      : visibleShapes;

  const disabled = eligibleShapes.length < 2;
  const reason =
    selectedShapeIds.length > 0 && eligibleShapes.length < 2
      ? '需要至少選中 2 個可見圖層'
      : visibleShapes.length < 2
        ? '需要至少 2 個可見圖層'
        : '';

  const animateTo = (target: number) => {
    const start = progress;
    if (Math.abs(start - target) < 0.001) return;

    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / DURATION_MS);
      const eased = easeInOutCubic(t);
      setProgress(start + (target - start) * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const isExploded = progress > 0.5;

  return (
    <section className="sidebar__section">
      <label className="sidebar__label">
        爆炸圖
        {selectedShapeIds.length > 0 && (
          <span className="sidebar__label__hint">
            （{selectedShapeIds.length} 個選中）
          </span>
        )}
      </label>
      <div className="explode-control">
        <button
          type="button"
          className="btn-primary"
          onClick={() => animateTo(isExploded ? 0 : 1)}
          disabled={disabled}
        >
          {isExploded ? '合回原圖' : '爆炸'}
        </button>
      </div>
      {disabled && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          {reason}
        </div>
      )}
    </section>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}