import { useSceneStore } from '../../store/useSceneStore';
import { composeManualShape } from '../../domain/semantic/composeManualShape';

/**
 * 手動連線控制面板。
 *
 * 兩種狀態：
 * - idle：顯示「開始手動連線」按鈕
 * - manual-linking：顯示目前選擇的序列 + 「完成這個形狀」「取消」
 */
export function ManualLinkControl() {
    const mode = useSceneStore((s) => s.mode);
    const currentManualShape = useSceneStore((s) => s.currentManualShape);
    const vertices = useSceneStore((s) => s.vertices);
    const setMode = useSceneStore((s) => s.setMode);
    const setCurrentManualShape = useSceneStore((s) => s.setCurrentManualShape);
    const addShape = useSceneStore((s) => s.addShape);

    const isLinking = mode === 'manual-linking';

    const start = () => {
        setMode('manual-linking');
        setCurrentManualShape([]);
    };

    const cancel = () => {
        setMode('idle');
        setCurrentManualShape([]);
    };

    const finish = () => {
        const shapeId = `manual-${crypto.randomUUID()}`;
        const result = composeManualShape(currentManualShape, vertices, shapeId);
        if (!result.ok) {
            // 不該發生（按鈕 disabled 已阻擋），但防禦性處理
            alert(result.error);
            return;
        }
        addShape(result.shape);
        setCurrentManualShape([]);
        // 留在 manual-linking 模式，讓老師可以繼續組下一個形狀
    };

    const canFinish =
        currentManualShape.length === 3 || currentManualShape.length === 4;

    const displayNames = currentManualShape
        .map((id) => vertices.find((v) => v.id === id)?.name ?? '?')
        .join(' → ');

    return (
        <section className="sidebar__section">
            <label className="sidebar__label">手動連線</label>

            {!isLinking ? (
                <button
                    type="button"
                    className="btn-primary"
                    onClick={start}
                >
                    開始手動連線
                </button>
            ) : (
                <div className="manual-link-panel">
                    <div className="manual-link-panel__sequence">
                        {currentManualShape.length === 0 ? (
                            <span className="muted">請點擊圖上的紅點（依序選 3-4 個）</span>
                        ) : currentManualShape.length < 3 ? (
                            <span>
                                已選 {currentManualShape.length} / 3 個：
                                <code>{displayNames}</code>
                            </span>
                        ) : (
                            <code>{displayNames}</code>
                        )}
                    </div>

                    <div className="manual-link-panel__actions">
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={finish}
                            disabled={!canFinish}
                        >
                            完成這個形狀
                        </button>
                        <button type="button" className="btn-ghost" onClick={cancel}>
                            取消
                        </button>
                    </div>

                    {currentManualShape.length >= 5 && (
                        <div className="manual-link-panel__error">
                            MVP 只支援三角形與四邊形
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}