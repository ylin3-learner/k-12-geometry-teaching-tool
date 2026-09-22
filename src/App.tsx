import { Canvas } from './features/canvas/Canvas';
import { PasteHandler } from './features/input/PasteHandler';
import './App.css';

function App() {
  return (
    <div className="app">
      <PasteHandler />
      <div className="canvas-container">
        <Canvas />
      </div>
      <div className="hint">
        按 Ctrl+V（macOS: Cmd+V）貼上截圖
      </div>
    </div>
  );
}

export default App;