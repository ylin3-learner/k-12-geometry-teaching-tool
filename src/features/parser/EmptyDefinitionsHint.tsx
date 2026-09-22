import { useSceneStore } from '../../store/useSceneStore';

/**
 * 「只貼題幹」的降級提示（README §6.10）。
 *
 * 當 Parser 抓到「有約束、無形狀」時顯示：
 *   - 中性提示（非紅色錯誤，這不是系統故障）
 *   - 兩個可點擊按鈕：「貼完整題目」「改用手動連線」
 */
export function EmptyDefinitionsHint() {
  const classified = useSceneStore((s) => s.classifiedStatements);
  const setMode = useSceneStore((s) => s.setMode);
  const setCurrentManualShape = useSceneStore((s) => s.setCurrentManualShape);

  if (!classified) return null;
  if (classified.definitions.length > 0) return null;
  if (classified.constraints.length === 0) return null;

  const summary = classified.constraints
    .map((c) => c.source)
    .join('、');

  const focusTextarea = () => {
    document.querySelector<HTMLTextAreaElement>('.text-input')?.focus();
  };

  const startManualLinking = () => {
    setMode('manual-linking');
    setCurrentManualShape([]);
  };

  return (
    <section className="sidebar__section">
      <div className="info-banner">
        <div className="info-banner__text">
          偵測到 {classified.constraints.length} 個約束條件（{summary}），
          但沒有形狀宣告。
        </div>
        <div className="info-banner__actions">
          <button type="button" className="btn-primary" onClick={focusTextarea}>
            貼完整題目
          </button>
          <button type="button" className="btn-ghost" onClick={startManualLinking}>
            改用手動連線
          </button>
        </div>
      </div>
    </section>
  );
}