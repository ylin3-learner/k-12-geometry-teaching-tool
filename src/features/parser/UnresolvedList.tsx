import { useSceneStore } from '../../store/useSceneStore';
import {
  looksLikeTriangleDecl,
  suggestTrianglePrefix,
} from '../../domain/semantic/hintUnresolved';

/**
 * 顯示 Parser 無法解析的原始文字片段。
 *
 * 每個片段若「可能是省略的三角形宣告」（純大寫字母 3-4 個），
 * 提供「補上 △」按鈕——決定權在老師，系統不猜（README §0.7）。
 */
export function UnresolvedList() {
  const unresolved = useSceneStore((s) => s.classifiedStatements?.unresolved);
  const applyTextFix = useSceneStore((s) => s.applyTextFix);

  if (!unresolved || unresolved.length === 0) return null;

  return (
    <section className="sidebar__section">
      <label className="sidebar__label">未解析的片段</label>
      <ul className="unresolved-list">
        {unresolved.map((fragment, i) => (
          <li key={i} className="unresolved-item">
            <span className="unresolved-item__text">{fragment}</span>
            {looksLikeTriangleDecl(fragment) && (
              <button
                type="button"
                className="unresolved-item__fix"
                onClick={() =>
                  applyTextFix(fragment, suggestTrianglePrefix(fragment))
                }
              >
                補上 △
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}