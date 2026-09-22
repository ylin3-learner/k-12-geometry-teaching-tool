import { useEffect } from 'react';
import { useSceneStore } from '../../store/useSceneStore';
import { resolveShapesFromStatements } from '../../domain/semantic/resolveShapesFromStatements';
import { findConnections } from '../../domain/graph/connectivity';

/**
 * 引導式點名 overlay：
 * - 顯示「請點出 X」+ 進度
 * - 「跳過」按鈕（README §6.6 逃生口）
 * - 點完後自動呼叫 resolveShapesFromStatements
 */
export function GuidedNaming() {
  const mode = useSceneStore((s) => s.mode);
  const namingQueue = useSceneStore((s) => s.namingQueue);
  const namingTotal = useSceneStore((s) => s.namingTotal);
  const vertices = useSceneStore((s) => s.vertices);
  const classifiedStatements = useSceneStore((s) => s.classifiedStatements);
  const setShapes = useSceneStore((s) => s.setShapes);
  const setConnections = useSceneStore((s) => s.setConnections);
  const setNamingQueue = useSceneStore((s) => s.setNamingQueue);
  const setMode = useSceneStore((s) => s.setMode);

  // 點完後自動合成
  useEffect(() => {
    if (mode !== 'guided-naming') return;
    if (namingQueue.length > 0) return;
    if (!classifiedStatements) return;

    const allStatements = [
      ...classifiedStatements.definitions,
      ...classifiedStatements.auxiliary,
      ...classifiedStatements.constraints,
    ];

    const result = resolveShapesFromStatements(allStatements, vertices, 'text');
    setShapes(result.shapes);
    setConnections(findConnections(result.shapes));
    setMode('idle');
  }, [
    mode,
    namingQueue.length,
    vertices,
    classifiedStatements,
    setShapes,
    setConnections,
    setMode,
  ]);

  if (mode !== 'guided-naming') return null;
  if (namingQueue.length === 0) return null;

  const current = namingQueue[0];
  const remaining = namingQueue.length;
  const done = namingTotal - remaining;

  const handleSkip = () => {
    setNamingQueue(namingQueue.slice(1));
  };

  return (
    <div className="guided-naming">
      <div className="guided-naming__text">
        請點出 <strong>{current}</strong> 的位置
      </div>
      <div className="guided-naming__progress">
        {done + 1} / {namingTotal}
      </div>
      <button
        type="button"
        onClick={handleSkip}
        className="guided-naming__skip"
      >
        跳過
      </button>
    </div>
  );
}