import { useSceneStore } from '../../store/useSceneStore';

export function TextInput() {
  const text = useSceneStore((s) => s.text);
  const setText = useSceneStore((s) => s.setText);

  return (
    <textarea
      className="text-input"
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="貼上題目文字（例：△ABC，D∈BC，∠B=60°）"
      rows={2}
    />
  );
}