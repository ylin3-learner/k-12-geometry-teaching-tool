import { Canvas } from './features/canvas/Canvas';
import { PasteHandler } from './features/input/PasteHandler';
import { TextInput } from './features/input/TextInput';
import { GuidedNaming } from './features/parser/GuidedNaming';
import { UnresolvedList } from './features/parser/UnresolvedList';
import { EmptyDefinitionsHint } from './features/parser/EmptyDefinitionsHint';
import { ManualLinkControl } from './features/controls/ManualLinkControl';
import './App.css';

function App() {
  return (
    <div className="app">
      <PasteHandler />

      <div className="main">
        <aside className="sidebar">
          <section className="sidebar__section">
            <label className="sidebar__label">題目文字</label>
            <TextInput />
          </section>

          <EmptyDefinitionsHint />
          <UnresolvedList />
          <ManualLinkControl />
        </aside>

        <main className="canvas-container">
          <Canvas />
          <GuidedNaming />
        </main>
      </div>

      <div className="hint">
        1. Ctrl+V 貼上截圖　2. 貼上題目文字　3. 依提示點出每個字母
      </div>
    </div>
  );
}

export default App;