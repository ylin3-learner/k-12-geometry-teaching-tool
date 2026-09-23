import { useSceneStore } from '../../store/useSceneStore';

/**
 * 重置標註按鈕：
 * - 清空所有頂點、形狀、連通
 * - 保留圖片與題目文字
 * - 根據文字重跑 pipeline，重新產生引導式點名佇列
 *
 * 用途：老師在同一張圖上重新標註，或開發時快速重置測試狀態。
 */
export function ResetButton() {
  const vertices = useSceneStore((s) => s.vertices);
  const shapes = useSceneStore((s) => s.shapes);
  const resetAnnotations = useSceneStore((s) => s.resetAnnotations);

  const hasContent = vertices.length > 0 || shapes.length > 0;

  const handleClick = () => {
    if (!hasContent) {
      resetAnnotations();
      return;
    }
    const ok = window.confirm(
      `將清空 ${vertices.length} 個頂點、${shapes.length} 個形狀。\n圖片與題目文字會保留。`,
    );
    if (ok) resetAnnotations();
  };

  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={handleClick}
      disabled={!hasContent}
      title="清空所有頂點與形狀（保留圖片與文字）"
    >
      重置標註
    </button>
  );
}