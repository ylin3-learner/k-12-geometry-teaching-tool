import { useEffect, useRef, useState } from 'react';
import { useSceneStore } from '../../store/useSceneStore';
import { resolveShapesFromStatements } from '../../domain/semantic/resolveShapesFromStatements';
import { findConnections } from '../../domain/graph/connectivity';

/**
 * 引導式點名 overlay：
 * - 顯示「請點出 X」+ 進度
 * - 「跳過」按鈕（README §6.6 逃生口）
 * - 點完後自動呼叫 resolveShapesFromStatements
 * - 可拖曳：拖到不擋住字母的位置（位置存在元件本地狀態）
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

  // 拖曳位置（null = 使用 CSS 預設位置）
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

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
    setPosition(null);   // 重置拖曳位置
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

  const handlePointerDown = (e: React.PointerEvent) => {
    // 點按鈕時不觸發拖曳
    if ((e.target as HTMLElement).closest('button')) return;
    if (!overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const container = overlayRef.current?.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    setPosition({
      x: e.clientX - containerRect.left - dragOffsetRef.current.x,
      y: e.clientY - containerRect.top - dragOffsetRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  // 有 position 時覆寫 CSS 預設位置
  const dynamicStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, transform: 'none' }
    : {};

  return (
    <div
      ref={overlayRef}
      className="guided-naming"
      style={{
        ...dynamicStyle,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
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
        style={{ cursor: 'pointer' }}
      >
        跳過
      </button>
    </div>
  );
}