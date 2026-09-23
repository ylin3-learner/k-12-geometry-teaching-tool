import { useSceneStore } from '../../store/useSceneStore';

/**
 * 旋轉控制：以共用頂點為 pivot，旋轉較小的圖形，
 * 用來對齊對應邊、找出相似三角形的對應關係。
 *
 * 與爆炸圖獨立：兩者不會同時作用（startRotation 會先合回）。
 */
export function RotationControl() {
  const shapes = useSceneStore((s) => s.shapes);
  const visibleShapes = shapes.filter((s) => s.visible);
  const rotationShapeId = useSceneStore((s) => s.rotationShapeId);
  const rotationAngle = useSceneStore((s) => s.rotationAngle);
  const startRotation = useSceneStore((s) => s.startRotation);
  const setRotationAngle = useSceneStore((s) => s.setRotationAngle);
  const stopRotation = useSceneStore((s) => s.stopRotation);

  const canRotate = visibleShapes.length >= 2;

  if (!rotationShapeId) {
    return (
      <section className="sidebar__section">
        <label className="sidebar__label">旋轉（找對應邊）</label>
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
            需要至少 2 個可見形狀
          </div>
        )}
      </section>
    );
  }

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
        <button
          type="button"
          className="btn-ghost"
          onClick={stopRotation}
        >
          結束旋轉
        </button>
      </div>
    </section>
  );
}