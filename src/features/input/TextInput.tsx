import { useRef } from 'react';
import { useSceneStore } from '../../store/useSceneStore';

// 常用幾何符號（依類別分組）
const SYMBOL_GROUPS: { label: string; symbols: string[] }[] = [
  { label: '形狀', symbols: ['△', '□', '○'] },
  { label: '關係', symbols: ['∠', '⊥', '∥', '∼'] },
  { label: '數值', symbols: ['°', '√', 'π'] },
];

export function TextInput() {
  const text = useSceneStore((s) => s.text);
  const setText = useSceneStore((s) => s.setText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 在游標位置插入符號
  const handleInsert = (symbol: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      // 沒有 ref 時就 append 到結尾
      setText(text + symbol);
      return;
    }

    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const newText = before + symbol + after;
    const newCursor = start + symbol.length;

    setText(newText);

    // 等 React 重新渲染後還原游標與焦點
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    });
  };

  return (
    <div className="text-input-wrapper">
      <div className="symbol-toolbar">
        {SYMBOL_GROUPS.map((group, gi) => (
          <div key={group.label} className="symbol-toolbar__group">
            {gi > 0 && <span className="symbol-toolbar__divider" />}
            {group.symbols.map((sym) => (
              <button
                key={sym}
                type="button"
                className="symbol-toolbar__btn"
                onClick={() => handleInsert(sym)}
                title={`插入 ${sym}`}
              >
                {sym}
              </button>
            ))}
          </div>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        className="text-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="貼上題目文字，或用下方按鈕插入符號（例：△ABC，D∈BC，∠B=60°）"
        rows={2}
      />
    </div>
  );
}