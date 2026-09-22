# 幾何圖形教學工具：框架圖與 Agile 開發流程

**版本：** MVP 定稿 v2（核心幾何引擎 + 文字輔助解析 + 引導式命名修正）
**授權：** GPL-3.0
**部署：** GitHub Pages（純前端、零後端、零 CV）
**目標：** 讓 K-12 老師用最輕量的方式，把重疊幾何圖拆解成可教學的結構

一句話：老師貼上一張幾何圖，可以選擇順手貼上題目文字（系統自動解析出 △ABC 這類聲明並引導老師依名稱點出對應頂點），或直接手動點頂點分組；接著系統自動切三角形、標出共用邊/共用頂點，老師勾選圖層、合併連通圖形，按爆炸圖拆開展示。

技術本質：純前端 + 離散圖論 + 輕量文字解析（非通用 NLP）+ 凸多邊形/凹多邊形渲染
複雜度：三角剖分 O(n²)（Ear Clipping 實務上，n = 頂點數，通常 < 30）；連通偵測 O(shapes²)；文字解析為固定樣式的 O(n) tokenizer/parser，兩者都**不涉及任何組合窮舉**
風險：集中且可在 Sprint 0 內驗證清楚（無 CV、無後端；凹多邊形、頂點對齊、退化輸入、繞向不一致、自交多邊形、文字解析覆蓋率六項風險已納入 Sprint 0 驗證範圍）

---

## 〇、這一版改了什麼（相較於純手動版本）

專案最早的版本是「老師手動點頂點 → 系統切三角形 → 手動分組」。後來發現一個真實的認知負荷問題：**當疊圖有 10～15 個頂點時，老師光靠目視去判斷「哪些點屬於哪個子圖形」就已經很吃力**——這不是演算法的組合爆炸（Ear Clipping 從頭到尾都不做窮舉搜尋），而是人腦的分組負擔。

解法是：電子教科書的題目文字，本來就已經用 `△ABC`、`AB=AC`、`∠B=60°` 這類敘述把「哪些點屬於哪個形狀」「哪些邊/角相等」講清楚了。與其讓老師自己目視分組，不如**解析文字、直接拿到分組結果**，老師只需要「依名稱點出對應的點」——這是一個遠比「目視分組」輕鬆的任務。

這個文字輔助路徑是**選配加速**，不是必須輸入：沒有文字描述（老師自己畫的圖、手寫題）時，原本的手動分組流程完全保留，兩條路共用同一套下游資料結構與渲染邏輯。

---

## 一、專案定位

讓 K-12 老師不需要任何設計或程式背景，就能把課本上常見的「重疊幾何圖」
（例如兩個四邊形疊在一起、△ABC 中 D 在 BC 上衍生出 △ABD 與 △ACD）拆解成一步步可教學的結構：
先切三角形、再標出哪些三角形共用邊、再讓老師自己決定要合併成什麼形狀，
最後用爆炸圖的方式把合併後的圖形拆開展示給學生看。

整個工具純前端運作，沒有後端、沒有資料庫、沒有電腦視覺依賴，部署在 GitHub Pages 上即可使用，
任何學校網路環境都能直接打開瀏覽器操作。

---

## 二、框架圖

### 2.1 整體架構

```
┌───────────────────────────────────────────────────────────────────┐
│                         瀏覽器（純前端）                             │
│                                                                     │
│  ┌───────────────────────┐                                        │
│  │      Input Layer       │                                        │
│  │  ┌─────────┐ ┌───────┐ │                                        │
│  │  │ 圖片貼上 │ │文字貼上│ │  ← 文字為選配                          │
│  │  └────┬────┘ └───┬───┘ │                                        │
│  │       │          │      │                                        │
│  │       │    ┌─────▼─────┐│                                        │
│  │       │    │ Tokenizer ││                                        │
│  │       │    │ → Parser  ││   Pipes-and-Filters：                 │
│  │       │    │→Classifier││   三個純函式串接，各自單一職責            │
│  │       │    └─────┬─────┘│                                        │
│  │       │          │      │                                        │
│  │  ┌────▼──────────▼────┐ │                                        │
│  │  │   ShapeSource       │ │  ← Strategy Pattern                   │
│  │  │  (Manual / Text)    │ │    兩種來源，同一輸出介面                │
│  │  └──────────┬──────────┘ │                                        │
│  └─────────────┼────────────┘                                        │
│                 ▼                                                    │
│  ┌─────────────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │     Domain Layer      │───▶│   Render    │    │             │      │
│  │  三角剖分（Ear Clip）  │    │    Layer    │    │             │      │
│  │  繞向正規化 / 頂點對齊  │    │  SVG 渲染   │    │             │      │
│  │  連通偵測 / 合併邏輯   │    │  圖層控制    │    │             │      │
│  │  約束驗證（選配）      │    │  爆炸動畫    │    │             │      │
│  └───────────┬───────────┘    └──────┬──────┘    │             │      │
│              │                        │           │             │      │
│  ┌───────────▼────────────────────────▼───────────┴───────────┐      │
│  │                    State（單一來源）                          │      │
│  │  vertices / triangles / connections / shapes / statements    │      │
│  └───────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  GitHub Pages（靜態託管）
```

**關鍵設計決策：** `ShapeSource` 是唯一的分岔點。不管 Shape 是老師手動分組出來的，還是文字解析引導出來的，往下游（三角剖分、連通偵測、合併、渲染）完全是同一套流程，沒有任何 if-else 分支需要因為輸入來源不同而改動。

### 2.2 資料流

#### 路徑 A：文字輔助（有題目文字時）

```
題目文字
   │
   ▼
Tokenizer（切 token）
   │
   ▼
Parser（△ABC → Statement，AB=AC → Statement …）
   │
   ▼
Classifier（定義性 vs 約束性）
   │
   ├─────────────────┐
   ▼                 ▼
定義性 Statement    約束性 Statement
（△ABC, D∈BC…）      （∠B=60°, AB=AC…）
   │                 │
   ▼                 ▼
收集「唯一字母集合」    存起來，之後用來
（去重，例：          「驗證」老師點出來的
 △ABC+△ABD → {A,B,C,D}） 座標是否吻合（選配）
   │
   ▼
引導式點名精靈
「請點出 A 的位置」→「請點出 B」→ …
（每個字母只問一次，不管它在幾個聲明裡重複出現）
   │
   ▼
Vertex[]（name 對應文字裡的字母，position 是老師點的座標）
   │
   ▼
用 Statement 直接 resolve 出 Shape/Triangle
（△ABC 的三個字母已經知道對應哪三個 vertex id，不用再猜）
```

**這一步解決了共用頂點的正確性問題，而且是「設計上不可能出錯」而非「事後偵測出錯」**：因為每個字母只點一次，`△ABC` 和 `△ABD` 共用的 A、B 本來就是同一個 Vertex 物件、同一組座標，不存在「兩個 A 座標對不齊」的情況，連 snapping 都不需要。

#### 路徑 B：手動分組（沒有文字，或文字解析不出來時的後備路徑）

```
圖片貼上
   │
   ▼
老師點頂點（可選擇性標名字，非強制）
   │
   ▼
Snapping（螢幕像素距離 < 8px 視為同一頂點，因為手動點擊
          兩個視覺上重疊的角時，座標不可能像文字引導那樣天生一致）
   │
   ▼
老師按「完成這組」結束當前多邊形
   │
   ▼
Ear Clipping 三角剖分
```

#### 匯流點：兩條路徑最終都產出相同的資料結構

```
Shape[] / Triangle[]
   │
   ▼
Connection（連通偵測：兩個 Triangle 共用邊 → 記錄下來）
   │
   ▼
老師勾選圖層、合併連通圖形
   │
   ▼
爆炸圖展示
```

`connectivity.ts` 完全不需要知道 Shape 是哪條路徑來的——它只看 Triangle 的 vertexIds 有沒有交集，這是兩條路徑共用同一份程式碼的關鍵。

### 2.3 資料模型

```typescript
// ── 幾何基礎型別 ──────────────────────────────────

// 老師點的頂點（不論來自手動點擊或引導式點名）
type Vertex = {
  id: string;
  name?: string;          // "A", "B", "C"（文字模式必填；手動模式選填）
  position: { x: number; y: number };
};

// 系統用 Ear Clipping 切出的三角形（原子單位）
type Triangle = {
  id: string;
  vertexIds: [string, string, string];
  visible: boolean;       // 圖層開關
  color: string;          // 僅用於 focus，不用於 identity
};

// 系統偵測的連通關係（兩條輸入路徑共用同一套邏輯）
type Connection = {
  triangleA: string;
  triangleB: string;
  sharedEdge: [string, string]; // 共用的兩個頂點；若只共用 1 點則為共頂點候選
};

// 老師（或文字聲明直接對應）合併的圖形
type Shape = {
  id: string;
  triangleIds: string[];
  label: string;          // "四邊形 ABCD"，文字模式下可直接沿用聲明來源
  visible: boolean;
  source?: 'manual' | 'text'; // 記錄這個 Shape 是哪條路徑產生的，方便除錯與 UI 標示
};

// ── 文字解析：定義性 / 約束性聲明 ──────────────────

type Statement =
  // 定義性：引入圖形結構
  | { kind: 'triangle'; id: string; vertices: [string, string, string]; source: string }
  | { kind: 'quadrilateral'; id: string; vertices: string[]; source: string }
  | { kind: 'point-on-segment'; id: string; point: string; segment: [string, string]; source: string }
  | { kind: 'segment'; id: string; endpoints: [string, string]; source: string }
  // 約束性：只約束既有名稱，不引入新點，用來顯示+驗證，不驅動圖形
  | { kind: 'angle-value'; id: string; vertices: [string, string, string]; value: number; unit: 'deg'; source: string }
  | { kind: 'equal-length'; id: string; segments: [[string, string], [string, string]]; source: string }
  | { kind: 'equal-angle'; id: string; angles: [[string, string, string], [string, string, string]]; source: string }
  | { kind: 'parallel'; id: string; segments: [[string, string], [string, string]]; source: string }
  | { kind: 'perpendicular'; id: string; segments: [[string, string], [string, string]]; source: string };

type ClassifiedStatements = {
  definitions: Statement[];
  constraints: Statement[];
  unresolved: string[];   // 解析不出來的原始文字片段，UI 要明確列出，不能悄悄丟掉
};

// ── 整個場景 ──────────────────────────────────────

type Scene = {
  image: HTMLImageElement | null;
  text: string;                        // 老師貼的題目文字（選填）
  classifiedStatements: ClassifiedStatements | null;
  vertices: Vertex[];
  triangles: Triangle[];
  connections: Connection[];
  shapes: Shape[];
  mode: 'idle' | 'guided-naming' | 'adding-vertex' | 'selecting' | 'exploding';
  currentGroup: string[];              // 手動模式：目前正在編輯的頂點組
  namingQueue: string[];               // 文字模式：還沒被老師點出座標的字母清單
};
```

### 2.4 目錄結構

```
geometry-teaching-tool/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── LICENSE                        # GPL-3.0
├── README.md
│
├── public/
│   └── favicon.svg
│
└── src/
    ├── main.tsx
    ├── App.tsx
    │
    ├── domain/                    # 純函數，無 DOM、無 React
    │   ├── geometry/
    │   │   ├── types.ts           # Vertex, Triangle, Connection, Shape
    │   │   ├── triangulate.ts     # Ear Clipping 三角剖分（凹凸皆可）
    │   │   ├── winding.ts         # 繞向正規化（signed area 反轉）
    │   │   ├── snapVertex.ts      # 頂點對齊（僅手動模式使用，螢幕像素 epsilon）
    │   │   ├── connectivity.ts    # 共用邊偵測（兩條輸入路徑共用，不管來源）
    │   │   ├── convexCheck.ts     # 凸多邊形檢查（僅供 UI 提示用）
    │   │   ├── mergeShapes.ts     # 三角形合併成多邊形
    │   │   └── verifyConstraint.ts# 約束驗證（角度/長度是否符合老師點的座標，選配）
    │   │
    │   ├── parser/                # 文字解析管線，三段純函式，各自單一職責
    │   │   ├── types.ts           # Token, Statement
    │   │   ├── tokenizer.ts       # 文字 → Token[]
    │   │   ├── parser.ts          # Token[] → Statement[]
    │   │   └── classifier.ts      # Statement[] → { definitions, constraints, unresolved }
    │   │
    │   ├── semantic/
    │   │   ├── collectRequiredLabels.ts  # definitions → 唯一字母集合（去重）
    │   │   └── resolveShapesFromStatements.ts # Statement + Vertex[] → Shape[]
    │   │
    │   └── graph/
    │       └── adjacency.ts       # 三角形鄰接表
    │
    ├── store/
    │   └── useSceneStore.ts       # Zustand / 單一狀態來源
    │
    ├── features/
    │   ├── canvas/
    │   │   ├── Canvas.tsx         # 主畫布（SVG）
    │   │   ├── ImageLayer.tsx     # 背景圖
    │   │   ├── VertexLayer.tsx    # 紅點 + 拖曳 + snapping + 視覺回饋
    │   │   ├── TriangleLayer.tsx  # 三角形渲染
    │   │   └── ShapeLayer.tsx     # 合併後的圖形
    │   │
    │   ├── controls/
    │   │   ├── Toolbar.tsx        # 模式切換
    │   │   ├── GroupControl.tsx   # 手動模式：「完成這組」按鈕
    │   │   ├── LayerPanel.tsx     # 三角形圖層開關
    │   │   ├── ShapePanel.tsx     # 合併圖形列表
    │   │   └── ExplodeControl.tsx # 爆炸圖控制
    │   │
    │   ├── input/
    │   │   ├── PasteHandler.tsx   # Clipboard API（圖片）
    │   │   ├── FileDrop.tsx       # 拖曳上傳（備用）
    │   │   ├── TextInput.tsx      # 題目文字輸入框（選配）
    │   │   └── shapeSource/
    │   │       ├── ShapeSource.ts          # interface（Strategy Pattern）
    │   │       ├── ManualGroupingSource.ts # 手動分組策略
    │   │       └── TextConstraintSource.ts # 文字解析策略
    │   │
    │   └── parser/
    │       ├── GuidedNaming.tsx   # 依 namingQueue 依序引導老師點名
    │       ├── ParserView.tsx     # 樹狀顯示定義性/約束性聲明
    │       └── UnresolvedList.tsx # 顯示解析不出來的原始文字，提示手動處理
    │
    └── types/
        └── scene.ts
```

---

## 三、設計原則：SRP 與 Design Pattern

**Strategy Pattern（輸入來源）**

```typescript
interface ShapeSource {
  resolve(vertices: Vertex[]): { shapes: Shape[]; warnings: string[] };
}

class ManualGroupingSource implements ShapeSource { /* 沿用 currentGroup 流程 */ }
class TextConstraintSource implements ShapeSource { /* 沿用 classifiedStatements.definitions */ }
```

下游 Domain（三角剖分、connectivity、mergeShapes）、Render（圖層、爆炸圖）完全不需要知道 Shape 從哪來——這是把「輸入來源的差異」封裝在 Input Layer，不外洩到 Domain/Render 的具體做法。

**Pipes-and-Filters（文字解析管線）**

`tokenize()` → `parse()` → `classify()` 是三個互不相依的純函式，每個只做一件事：Tokenizer 只切字元、Parser 只認樣式、Classifier 只做定義/約束的二分類。任何一段要換演算法（例如之後要支援更多符號）都不影響另外兩段，也不影響呼叫方。

**SRP 在 domain/ 層的具體落實**

| 檔案 | 唯一職責 |
|---|---|
| `triangulate.ts` | 只負責把有序頂點切成三角形，不管頂點從哪來 |
| `winding.ts` | 只負責判斷並反轉繞向 |
| `snapVertex.ts` | 只負責螢幕像素容差判斷，不知道 Shape、Statement 是什麼 |
| `connectivity.ts` | 只負責找出兩個 Triangle 之間的共用邊，不管 Shape 來源 |
| `collectRequiredLabels.ts` | 只負責從 Statement[] 收集去重後的字母集合 |
| `resolveShapesFromStatements.ts` | 只負責把已命名的 Vertex[] 對應到 Statement 產生 Shape[] |
| `verifyConstraint.ts` | 只負責驗證，不驅動任何頂點座標改變（選項 C，見 5.8） |

每個函式輸入輸出明確、無副作用、可以獨立寫單元測試——這也是為什麼 Sprint 0 可以在 5 天內把幾乎所有風險驗證完。

---

## 四、Agile 開發流程

### 4.1 Sprint 總覽

- Sprint 0 ── 技術驗證（5 天，含文字解析）
- Sprint 1 ── 頂點輸入（手動 + 引導式點名）+ 三角剖分（1.5 週）
- Sprint 2 ── 圖層控制 + 連通偵測 + Parser 樹狀顯示（1 週）
- Sprint 3 ── 合併圖形 + 爆炸圖（1 週）
- Sprint 4 ── 整合優化 + 部署（1 週）

**總計：約 5.5〜6.5 週**

---

### Sprint 0：技術驗證（5 天）

**目標：** 確認幾何核心與文字解析核心都可行，兩者互不阻擋。

|任務|產出|
|---|---|
|硬編碼 5 個頂點的凸多邊形，實作 Ear Clipping 三角剖分|`triangulate.ts` + 單元測試|
|硬編碼一組凹多邊形（如 6 頂點 L 形），驗證 Ear Clipping 正確切割|`triangulate.ts` 單元測試（凹多邊形案例）|
|撰寫退化案例測試（共線點、極小角、重複點）|`triangulate.ts` 單元測試（邊界案例）|
|實作「找不到耳朵時有限步數終止」的優雅失敗|`triangulate.ts` 錯誤處理 + 單元測試|
|實作輸入繞向正規化（signed area 反轉）|`winding.ts` + 單元測試|
|硬編碼三角形，實作共用邊偵測（僅兩三角形共用的邊）|`connectivity.ts` + 單元測試|
|實作頂點對齊（snapping）：以螢幕像素為 epsilon 單位（僅手動模式）|`snapVertex.ts` + 單元測試|
|**Tokenizer 實作**（△、∠、=、⊥、∥、∈、°、字母、數字）|`tokenizer.ts` + 單元測試|
|**Parser 實作**（triangle / point-on-segment / angle-value / parallel / perpendicular / **equal-length**）|`parser.ts` + 單元測試|
|**Classifier 實作**（定義性 vs 約束性，並收集 unresolved 原始文字）|`classifier.ts` + 單元測試|
|**collectRequiredLabels 實作**（definitions → 去重字母集合）|`collectRequiredLabels.ts` + 單元測試|
|用 SVG 渲染三角形，測試凸多邊形/凹多邊形填充|一個靜態 HTML 頁面|
|測試爆炸圖平移動畫|`requestAnimationFrame` 插值|

**驗收（幾何核心，沿用原方案）：**

- 硬編碼的 5 個頂點（凸多邊形），能正確切成 3 個三角形，並偵測到共用邊
- 硬編碼的 6 頂點凹多邊形（L 形），能正確切成 4 個三角形，且切割結果不產生自我相交的三角形
- 共線點、極小角、重複點的退化輸入，演算法能有限步數終止並回傳錯誤，而非卡死
- 逆時針輸入的頂點，經繞向正規化後能正確切割
- 模擬老師先畫圖形 A（4 頂點），再畫圖形 B（4 頂點，其中 1 個頂點與 A 的某頂點距離 < 8 螢幕像素），系統應自動判定為同一頂點，並正確反映共用邊

**驗收（文字解析核心，新增）：**

|驗收案例|輸入|預期結果|
|---|---|---|
|基本三角形|`△ABC`|解析出 1 個 `triangle` Statement，definitions|
|多重宣告的去重|`△ABC，△ABD`|`collectRequiredLabels` 回傳 `{A,B,C,D}`（4 個，不是 6 個）|
|點在線段上|`D∈BC`|解析出 1 個 `point-on-segment` Statement|
|等長聲明|`AB=AC`|解析出 1 個 `equal-length` Statement（constraints）|
|角度賦值|`∠B=60°`（或 `∠ABC=60°`）|解析出 1 個 `angle-value` Statement（constraints）|
|複合輸入|`△ABC，D∈BC，AD⊥BC，∠B=60°`|1 triangle + 1 point-on-segment（definitions）+ 1 perpendicular + 1 angle-value（constraints）|
|無法辨識的片段|任意亂碼或不支援的樣式|回傳空陣列，該片段原文出現在 `unresolved` 裡，不拋錯、不中斷|

**驗收：** 全部通過即可進入 Sprint 1；任一項卡住，代表對應模組（幾何或文字）需要重新設計，而且只損失 5 天。

---

### Sprint 1：頂點輸入（手動 + 引導式點名）+ 三角剖分（1.5 週）

**User Story：** 作為老師，我可以貼上題目文字，系統自動列出需要標出的字母，依序引導我點出對應的點；或者我也可以不貼文字，直接手動點頂點分組。兩種方式最終都能正確切成三角形。

|任務|檔案|
|---|---|
|Clipboard API 貼上圖片|`PasteHandler.tsx`|
|**題目文字輸入框（選配）**|`TextInput.tsx`|
|**貼上文字後即時呼叫 tokenizer/parser/classifier**|`TextConstraintSource.ts`|
|圖片作為 SVG 背景|`ImageLayer.tsx`|
|**引導式點名精靈：依 namingQueue 逐一提示「請點出 X」**|`GuidedNaming.tsx`|
|**未辨識文字清單顯示（unresolved）**|`UnresolvedList.tsx`|
|點擊新增頂點（紅點）— 手動模式|`VertexLayer.tsx`|
|新增頂點時執行 snapping 判斷（螢幕像素距離 < 8px 視為同一點）— 僅手動模式|`VertexLayer.tsx` + `snapVertex.ts`|
|Snapping 觸發時的視覺回饋（頂點閃一下）|`VertexLayer.tsx`|
|拖曳調整頂點位置（拖曳時同樣套用 snapping，兩模式皆可拖曳微調）|`VertexLayer.tsx`|
|「完成這組」按鈕 / 雙擊空白處結束當前組 — 僅手動模式|`GroupControl.tsx` + `Toolbar.tsx`|
|呼叫三角剖分（Ear Clipping + 繞向正規化）— 兩模式共用|`triangulate.ts` + `winding.ts`|
|**用 Statement 直接 resolve 出 Shape**（文字模式，不經過 Ear Clipping 猜測）|`resolveShapesFromStatements.ts`|
|渲染三角形|`TriangleLayer.tsx`|
|Ear Clipping 失敗時的 UI 提示（非阻擋）|`TriangleLayer.tsx` + `triangulate.ts`|

**驗收：**

- 貼上題目文字 `△ABC，D∈BC`，系統列出需要點名的字母 `A, B, C, D`（只問 4 次）
- 依序點完 4 個字母對應的位置後，系統正確產生 `△ABC` 與由 `D∈BC` 衍生的線段/三角形資訊，不需要老師手動分組
- 貼上一張圖，不貼文字，點 4 個頂點，系統自動切成 2 個三角形（原手動流程不變）
- 貼上一張圖，點出一個凹多邊形（例如 L 形的 6 個頂點），系統正確切成 4 個三角形
- 拖曳頂點，三角形即時更新（兩模式皆可）
- 拖曳頂點靠近另一個既有頂點時，自動吸附合併，且被吸附的頂點有視覺回饋（僅手動模式；文字模式因為每個字母只點一次，本來就不會有座標不齊的問題）
- 若某段文字無法解析，UI 明確列出原始文字片段，並允許老師改用手動分組處理該部分
- 若某組頂點無法自動切割，UI 顯示提示，老師可以調整頂點
- 按「清除」可以重新開始

**Definition of Done：**

- `domain/` 層的純函數（含 `parser/`、`semantic/`）有單元測試
- Chrome + Firefox 測試通過
- 無 console error

---

### Sprint 2：圖層控制 + 連通偵測 + Parser 視覺化（1 週）

**User Story：** 作為老師，我可以勾選/取消每個三角形，系統自動標記哪些三角形共用邊；如果我有貼文字，我還可以看到系統解析出的定義與約束樹狀清單。

|任務|檔案|
|---|---|
|三角形圖層開關 UI|`LayerPanel.tsx`|
|連通偵測（僅兩三角形共用的邊，懸邊不計；兩條輸入路徑共用同一函式）|`connectivity.ts`|
|共用邊視覺化（虛線或高亮）|`TriangleLayer.tsx`|
|三角形顏色僅用於 focus|`TriangleLayer.tsx`|
|點擊三角形 → 高亮|`TriangleLayer.tsx`|
|**Parser-style 樹狀顯示（定義性 / 約束性分兩區塊）**|`ParserView.tsx`|
|**約束驗證：老師點的座標是否符合約束值（選配，時間允許再做）**|`verifyConstraint.ts`|

**驗收：**

- 4 個頂點切成 2 個三角形，系統正確標記共用邊
- 懸邊（只屬於一個三角形的邊）不出現在連通關係中
- 勾選/取消圖層，三角形即時顯示/隱藏
- 點擊三角形，該三角形高亮，其他淡化
- 有貼文字時，畫面上能看到「定義（圖形結構）」與「約束（可編輯）」兩個區塊，各自列出解析結果
- （選配）若約束值與老師點的實際座標差距超過容差，UI 顯示警告，但不強制修改頂點位置

**Definition of Done：**

- 連通偵測有單元測試（含懸邊案例）
- 圖層開關狀態保存在 store
- 無 console error

---

### Sprint 3：合併圖形 + 爆炸圖（1 週）

（與原方案相同，不受文字解析影響——這正是 Strategy Pattern 帶來的隔離效果。）

**User Story：** 作為老師，我可以把連通的三角形合併成更大的圖形，並按爆炸圖拆開展示。

|任務|檔案|
|---|---|
|合併連通三角形|`mergeShapes.ts`|
|合併後的圖形列表|`ShapePanel.tsx`|
|爆炸方向策略：固定角度偏移（第 i 個圖形沿角度 i × 360/N 方向平移固定距離，圖形本身不旋轉）|`ExplodeControl.tsx`|
|爆炸圖平移動畫|`ExplodeControl.tsx`|
|爆炸圖控制（播放/暫停/重置）|`ExplodeControl.tsx`|
|合併圖形與三角形的切換|`ShapePanel.tsx`|

**驗收：**

- 2 個共用邊的三角形可以合併成四邊形
- 按「爆炸」→ 圖形平移分開，每個圖形沿不同角度偏移
- 可以選擇以三角形為單位，或以合併圖形為單位爆炸

**Definition of Done：**

- 合併邏輯有單元測試
- 動畫流暢（60fps）
- 爆炸後可以重置回原狀

---

### Sprint 4：整合優化 + 部署（1 週）

**User Story：** 作為老師，我可以在任何裝置上打開網頁，貼上圖片（和選配的文字），完成整個流程。

|任務|檔案|
|---|---|
|響應式佈局（桌機/平板）|`App.tsx`|
|匯出 SVG / PNG|`utils/svg.ts`|
|GitHub Pages 部署|`vite.config.ts`|
|README + 使用說明|`README.md`|
|GPL-3.0 LICENSE|`LICENSE`|
|跨瀏覽器測試|—|

**驗收：**

- 在 GitHub Pages 上可以完整使用
- 平板（電子白板）操作正常
- 匯出的 SVG 可以在簡報中使用
- 文字解析與手動分組兩條路徑都能在真實裝置上跑通

---

## 五、風險與應對

|風險|機率|影響|應對|
|---|---|---|---|
|三角剖分對凹多邊形失效|低|中|Sprint 0 改用 Ear Clipping 演算法取代 fan triangulation，凹凸多邊形皆可直接處理|
|Ear Clipping 在退化輸入（共線、極小角、重複點）卡死|中|高|Sprint 0 加入「找不到耳朵時有限步數終止」，回傳錯誤而非卡死；UI 提示老師調整頂點|
|頂點輸入繞向不一致（順時針 vs 逆時針）|中|中|Sprint 0 加入 `winding.ts`，以 signed area 判斷並反轉|
|分次描繪的重疊圖形，共用頂點座標無法完全一致（**僅手動模式**）|中|高|Sprint 0／Sprint 1 加入頂點 snapping，epsilon 綁定螢幕像素（8px）；**文字模式因引導式點名一次只點一個字母，此風險在設計上不存在**|
|**「點擊順序＝命名順序」與疊圖共用頂點衝突**（已修正）|—|—|**已改為「文字先決定唯一字母集合 → 引導式依序點名」，每個字母只問一次，不受聲明重複出現次數影響**|
|**文字解析對非標準輸入格式脆弱（position-based token 匹配）**|中|低|解析不出來的片段列入 `unresolved`，UI 明確提示、允許手動補分組，不阻擋主流程|
|**老師沒有題目文字可貼**|中|低|文字為選配加速路徑，手動分組永遠是可用的後備路線|
|頂點太多導致三角剖分爆炸|低|低|n < 30 時 O(n²) 足夠，超過時提示|
|電子白板觸控事件不相容|中|中|Sprint 4 專門測試，用 pointer events 而非 mouse events|
|圖片太大導致渲染卡頓|低|低|限制圖片最大邊長，超過時自動縮放|
|GitHub Pages 路由問題|低|低|用 hash router 或單頁應用|

---

## 六、工程細節備忘

### 5.1 Ear Clipping 的優雅失敗

- 迴圈步數上限設為 `n²` 或 `2n`，超過即終止
- 回傳 `{ success: false, reason: '...' }`，而非拋出異常
- UI 顯示提示，讓老師調整頂點後重試

### 5.2 頂點 Snapping 的 epsilon 單位（僅手動模式）

- epsilon 綁定「螢幕像素」而非「世界座標」
- 建議值：8px
- 換算方式：`worldEpsilon = screenEpsilon / zoomLevel`
- **文字模式不需要這個機制**：因為引導式點名保證每個字母只對應一個 Vertex 物件，共用頂點是「同一個物件」而不是「兩個座標接近的物件」，沒有容差判斷的必要

### 5.3 「完成這組」的明確動作（僅手動模式）

- 老師需要一個明確的動作來結束當前組，才能開始下一組
- 建議：工具列上的「完成這組」按鈕，或雙擊空白處

### 5.4 懸邊（dangling edge）的處理

- 連通偵測只考慮「兩個三角形共用的邊」
- 懸邊（只屬於一個三角形的邊）不參與連通
- `connectivity.ts` 對兩條輸入路徑一視同仁，不需要因為 Shape 來源不同而特判

### 5.5 爆炸圖的方向策略

**MVP 決定：固定角度偏移。** 第 i 個圖形沿角度 i × 360/N 方向平移固定距離，圖形本身不旋轉——只是位移向量的方向不同。平移前後圖形的邊長、角度都應保持不變，只有位置改變。

### 5.6 輸入繞向正規化

- `winding.ts` 入口計算 signed area，若為負則反轉頂點順序
- 這一步很便宜，但漏掉的話會隨機出錯，很難 debug

### 5.7 引導式點名的設計要點

- 收集字母集合的來源是**所有定義性 Statement**（triangle、quadrilateral、point-on-segment、segment），約束性 Statement（角度值、等長）**不應該引入新字母**——如果約束性聲明裡出現了尚未被任何定義性聲明提到的字母，這代表文字有隱含資訊沒講清楚，應該把該片段丟進 `unresolved`，讓老師手動處理，而不是靜默地把它也加進 namingQueue
- 引導順序建議按字母在文字裡「第一次出現」的順序，符合老師閱讀文字時的直覺
- 每完成一個字母的點名，UI 要有清楚的進度顯示（例如「3 / 4」），避免老師中途搞不清楚點到哪了

### 5.8 約束驗證採用「驗證」而非「求解」（選項 C）

修改 `∠ABC = 60°` 這類約束值之後，**不會**反過來拖動頂點位置——因為做到那樣需要幾何約束求解器（處理欠定/過定系統、數值迭代收斂），是完全不同量級的工程，MVP 階段不該碰。

老師點的頂點位置就是他想要的位置。約束值是「描述這個圖形的性質」，用來**驗證**老師畫的圖跟文字描述是否一致：

```typescript
function verifyAngle(
  a: Point, b: Point, c: Point,
  expected: number,
  tolerance: number = 5
): { ok: boolean; actual: number; delta: number } {
  const angle = computeAngle(a, b, c);
  const delta = Math.abs(angle - expected);
  return { ok: delta <= tolerance, actual: angle, delta };
}
```

驗證失敗時 UI 顯示例如「∠ABC = [60]° ⚠️ 實際 55°」，老師可以選擇修改約束值（接受實際值）或拖曳頂點（讓實際角度接近 60°）——這形成一個完整閉環：**文字 → 結構 → 驗證 → 視覺回饋 → 調整**，但驅動權始終在老師手上。

---

## 七、MVP 完成後的下一步

等老師試用後，再決定要不要加：

|功能|優先度|備註|
|---|---|---|
|匯出動畫 GIF|★★|老師可以放進簡報|
|多組頂點集合|★★|一張圖有多個獨立圖形|
|約束驗證的完整 UI（5.8）|★★|Sprint 2 已做基礎版，可再打磨|
|自動偵測頂點（角點偵測）|★|風險較高，會重新引入 CV 依賴，違背「零 CV」的核心設計，需審慎評估|
|從掃描圖檔 OCR 出題目文字|★|同樣會重新引入 CV/OCR 依賴；優先鼓勵老師直接複製可選取的電子書文字，不做圖像 OCR|
|圓弧支援|★|需要不同的幾何處理|
|學生模式|★|讓學生自己操作|

---

## 八、給你的行動清單

- [ ] 1. 建 repo，選 GPL-3.0
- [ ] 2. Sprint 0：硬編碼 5 頂點（凸多邊形），驗證 Ear Clipping
- [ ] 3. Sprint 0：硬編碼凹多邊形（L 形），驗證 Ear Clipping 正確處理
- [ ] 4. Sprint 0：驗證退化輸入（共線、極小角、重複點）的優雅失敗
- [ ] 5. Sprint 0：驗證繞向正規化（signed area 反轉）
- [ ] 6. Sprint 0：驗證頂點 snapping（螢幕像素 epsilon，僅手動模式）
- [ ] 7. Sprint 0：驗證連通偵測（含懸邊案例）
- [ ] 8. Sprint 0：實作並測試 Tokenizer（含 equal-length 對應的 `=` token）
- [ ] 9. Sprint 0：實作並測試 Parser（含 equal-length 分支）
- [ ] 10. Sprint 0：實作並測試 Classifier（含 unresolved 收集）
- [ ] 11. Sprint 0：實作並測試 collectRequiredLabels（驗證去重效果）
- [ ] 12. Sprint 0：驗證 SVG 渲染 + 平移動畫
- [ ] 13. 等老師回覆 2〜3 張圖 + 對應題目文字（若有）
- [ ] 14. Sprint 1〜4：照上面走
- [ ] 15. 部署到 GitHub Pages
- [ ] 16. 給老師試用，特別觀察老師是否願意貼題目文字、引導式點名是否比純手動分組更輕鬆

---

## 結論

這一版把三個階段的討論收斂成一個一致的架構：

- **幾何核心（Ear Clipping + 連通偵測 + 合併 + 爆炸）維持原方案不變**，純前端、零後端、零 CV
- **文字解析是選配加速路徑**，用 Strategy Pattern 跟幾何核心完全隔離，解析失敗不影響手動流程
- **修正了「點擊順序＝命名順序」在共用頂點情境下會失效的問題**，改為「文字先決定唯一字母集合 → 引導式依序點名」，這也順帶讓文字模式下的共用頂點正確性變成設計上的必然，而不是事後靠 snapping 容差去猜
- Sprint 0 從 3 天延長為 5 天，把文字解析的核心風險（tokenizer/parser/classifier/去重）一併在最早期驗證掉

總時程約 5.5〜6.5 週，核心風險依然集中在 Sprint 0 就能驗證清楚。如果 Sprint 0 過了，後面就是照表操課；如果卡住，你只損失 5 天，而不是 5 週。

現在就可以開始了。
