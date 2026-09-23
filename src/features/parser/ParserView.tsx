import { useSceneStore } from '../../store/useSceneStore';
import type { Statement } from '../../domain/parser/types';

/**
 * Parser 解析結果樹狀顯示。
 *
 * 分三組呈現（unresolved 由 UnresolvedList 單獨顯示）：
 * - 定義：triangle / quadrilateral —— 直接構造 Shape
 * - 輔助：segment —— MVP 中通常為空
 * - 約束：angle-value / segment-length / equal-angle / ... —— 純顯示
 *
 * 沒有解析結果時整個元件不渲染（避免空區塊佔位）。
 */
export function ParserView() {
    const classified = useSceneStore((s) => s.classifiedStatements);

    if (!classified) return null;

    const { definitions, auxiliary, constraints } = classified;
    const total = definitions.length + auxiliary.length + constraints.length;

    if (total === 0) return null;

    return (
        <section className="sidebar__section">
            <label className="sidebar__label">解析結果（{total}）</label>

            {definitions.length > 0 && (
                <ParserGroup title="定義" variant="def" statements={definitions} />
            )}
            {auxiliary.length > 0 && (
                <ParserGroup title="輔助" variant="aux" statements={auxiliary} />
            )}
            {constraints.length > 0 && (
                <ParserGroup title="約束" variant="con" statements={constraints} />
            )}
        </section>
    );
}

// ── 單一分組 ──
type GroupProps = {
    title: string;
    variant: 'def' | 'aux' | 'con';
    statements: Statement[];
};

function ParserGroup({ title, variant, statements }: GroupProps) {
    return (
        <div className={`parser-group parser-group--${variant}`}>
            <div className="parser-group__header">
                <span className="parser-group__title">{title}</span>
                <span className="parser-group__count">{statements.length}</span>
            </div>
            <ul className="parser-group__list">
                {statements.map((s) => (
                    <li key={s.id} className="parser-group__item">
                        <span className="parser-group__source">{s.source}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}