import { useSceneStore } from '../../store/useSceneStore';
import { normalizeLatex } from '../../domain/parser/latexNormalizer';
import { tokenize } from '../../domain/parser/tokenizer';
import { parse } from '../../domain/parser/parser';
import { classify } from '../../domain/parser/classifier';
import { collectRequiredLabels } from '../../domain/semantic/collectRequiredLabels';

/**
 * 題目文字輸入框：即時觸發完整 Parser 管線。
 *
 * 每當文字改變：
 *   LaTeX → unicode → token → Statement[]
 *   → ClassifiedStatements（給 ParserView 顯示）
 *   → collectRequiredLabels（給引導式點名用）
 */
export function TextInput() {
  const text = useSceneStore((s) => s.text);
  const setText = useSceneStore((s) => s.setText);
  const setClassifiedStatements = useSceneStore((s) => s.setClassifiedStatements);
  const setNamingQueue = useSceneStore((s) => s.setNamingQueue);
  const setNamingTotal = useSceneStore((s) => s.setNamingTotal);
  const setMode = useSceneStore((s) => s.setMode);

  const handleChange = (value: string) => {
    setText(value);

    if (!value.trim()) {
      setClassifiedStatements(null);
      setNamingQueue([]);
      setNamingTotal(0);
      setMode('idle');
      return;
    }

    const normalized = normalizeLatex(value).unicode;
    const parseResult = parse(tokenize(normalized));
    const classified = classify(parseResult);
    const labels = collectRequiredLabels(parseResult.statements);

    setClassifiedStatements(classified);
    setNamingQueue(labels);
    setNamingTotal(labels.length);
    setMode(labels.length > 0 ? 'guided-naming' : 'idle');
  };

  return (
    <textarea
      className="text-input"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="貼上題目文字（例：△ABC，D∈BC，∠B=60°）"
      rows={2}
    />
  );
}