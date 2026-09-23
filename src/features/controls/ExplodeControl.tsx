import { useSceneStore } from '../../store/useSceneStore';

const DURATION_MS = 600;

/**
 * 爆炸圖控制：
 * - 「爆炸」按鈕 → progress 0 → 1
 * - 「重置」按鈕 → progress → 0
 *
 * 用 requestAnimationFrame 做數值插值。
 * 不用 CSS transition 是因為 SVG 的 point/cx/cy 屬性無法被 CSS transition 插值。
 */
export function ExplodeControl() {
  const progress = useSceneStore((s) => s.explodeProgress);
  const setProgress = useSceneStore((s) => s.setExplodeProgress);
  const shapesCount = useSceneStore((s) => s.shapes.length);

  const disabled = shapesCount < 2;   // 少於 2 個形狀沒得爆炸

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
      <label className="sidebar__label">爆炸圖</label>
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
          需要至少 2 個形狀
        </div>
      )}
    </section>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}