# 幾何圖形教學工具：框架圖與 Agile 開發流程

**版本：** MVP 定稿（含 Sprint 0 補強項目 + 工程細節收斂 + 體驗與相容性補強）
**授權：** GPL-3.0
**部署：** GitHub Pages（純前端、零後端）
**目標：** 讓 K-12 老師用最輕量的方式，把重疊幾何圖拆解成可教學的結構

一句話：老師貼上一張幾何圖，點頂點，系統自動切三角形，老師勾選圖層、合併連通圖形，按爆炸圖拆開展示。

技術本質：純前端 + 離散圖論 + 凸多邊形/凹多邊形渲染
複雜度：O(n²)（Ear Clipping 實務上），n = 頂點數（通常 < 30）
風險：集中且可在 Sprint 0／Sprint 1 內驗證清楚（無 CV、無後端；凹多邊形、頂點對齊、退化輸入、繞向不一致、自交多邊形五項風險已納入 Sprint 0 驗證範圍；undo/redo、自動保存、iPad Safari 相容性已納入 Sprint 1／Sprint 4）

---

## 一、專案定位

讓 K-12 老師不需要任何設計或程式背景，就能把課本上常見的「重疊幾何圖」
（例如兩個四邊形疊在一起、L 形拆解成矩形組合）拆解成一步步可教學的結構：
先切三角形、再標出哪些三角形共用邊、再讓老師自己決定要合併成什麼形狀，
最後用爆炸圖的方式把合併後的圖形拆開展示給學生看。

整個工具純前端運作，沒有後端、沒有資料庫，部署在 GitHub Pages 上即可使用，
任何學校網路環境都能直接打開瀏覽器操作。

---

## 二、框架圖

### 2.1 整體架構

```
┌─────────────────────────────────────────────────────────┐
│                    瀏覽器（純前端）                        │
│                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │    Input    │    │   Domain    │    │   Render    │  │
│  │    Layer    │───▶│    Layer    │───▶│    Layer    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                   │                   │        │
│         ▼                   ▼                   ▼        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  圖片貼上    │    │ 三角剖分     │    │  SVG 渲染   │  │
│  │  頂點點擊    │    │（Ear Clip） │    │  圖層控制    │  │
│  │  拖曳調整    │    │ 頂點對齊     │    │  爆炸動畫    │  │
│  │  Snapping   │    │ 繞向正規化   │    │            │  │
│  │            │    │ 連通偵測     │    │            │  │
│  │            │    │ 合併邏輯     │    │            │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │              State（單一來源）                      │    │
│  │      vertices / triangles / connections / shapes │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                  GitHub Pages（靜態託管）
```

### 2.2 資料流

```
圖片貼上
   │
   ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Vertex  │────▶│ Triangle │────▶│Connection│────▶│  Shape   │
│ 老師點的  │     │ 系統切的  │     │系統偵測的 │     │ 老師合併的│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                 │                 │                 │
     ▼                 ▼                 ▼                 ▼
  紅點顯示           圖層開關          共用邊標記         爆炸圖單位
     ▲
     │
  Snapping
（螢幕像素距離 < 8px
   視為同一頂點）
     │
     ▼
  視覺回饋
（吸附時頂點閃一下）
```

### 2.3 資料模型

```typescript
// 老師點的頂點
type Vertex = {
  id: string;
  position: { x: number; y: number };
  label?: string; // "A", "B", "C"
};

// 系統用 Ear Clipping 切出的三角形（原子單位）
// 注：改用 Ear Clipping 而非單純 fan triangulation，
// 凹多邊形（如 L 形、星形拆解）也能正確切割，
// 仍產出 n - 2 個三角形。
type Triangle = {
  id: string;
  vertexIds: [string, string, string];
  visible: boolean; // 圖層開關
  color: string;    // 僅用於 focus，不用於 identity
};

// 系統偵測的連通關係
// 注：只有「兩個三角形共用的邊」才會產生 Connection，
// 懸邊（dangling edge，只屬於一個三角形）不參與連通。
type Connection = {
  triangleA: string;
  triangleB: string;
  sharedEdge: [string, string]; // 共用的兩個頂點
};

// 老師勾選合併的圖形（可選）
type Shape = {
  id: string;
  triangleIds: string[];
  label: string; // "四邊形 ABCD"
  visible: boolean;
};

// 整個場景
type Scene = {
  image: HTMLImageElement | null; // 背景圖
  vertices: Vertex[];
  triangles: Triangle[];
  connections: Connection[];
  shapes: Shape[];
  mode: 'idle' | 'adding-vertex' | 'selecting' | 'exploding';
  // 新增：當前正在編輯的頂點組（用於「完成這組」按鈕）
  currentGroup: string[]; // vertex ids
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
    │   │   ├── snapVertex.ts      # 頂點對齊（螢幕像素 epsilon）
    │   │   ├── connectivity.ts    # 共用邊偵測（僅兩三角形共用的邊）
    │   │   ├── convexCheck.ts     # 凸多邊形檢查（僅供 UI 提示用）
    │   │   └── mergeShapes.ts     # 三角形合併成多邊形
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
    │   │   ├── Toolbar.tsx        # 模式切換（點頂點/選取/爆炸）
    │   │   ├── GroupControl.tsx   # 「完成這組」按鈕
    │   │   ├── LayerPanel.tsx     # 三角形圖層開關
    │   │   ├── ShapePanel.tsx     # 合併圖形列表
    │   │   └── ExplodeControl.tsx # 爆炸圖控制
    │   │
    │   └── input/
    │       ├── PasteHandler.tsx   # Clipboard API
    │       └── FileDrop.tsx       # 拖曳上傳（備用）
    │
    └── utils/
        ├── id.ts                  # 穩定 ID 生成
        ├── svg.ts                 # SVG 輔助函數
        └── screen.ts              # 螢幕像素 ↔ 世界座標換算
```

---

## 三、Agile 開發流程

### 3.1 Sprint 總覽

- Sprint 0 ── 技術驗證（3 天）
- Sprint 1 ── 頂點輸入 + 三角剖分（1 週）
- Sprint 2 ── 圖層控制 + 連通偵測（1 週）
- Sprint 3 ── 合併圖形 + 爆炸圖（1 週）
- Sprint 4 ── 整合優化 + 部署（1 週）

**總計：4〜5 週**

---

### Sprint 0：技術驗證（3 天）

**目標：** 確認核心演算法可行，並提前驗證四項最可能出問題的邊界情境
（凹多邊形三角剖分、退化輸入、老師分次點擊共用頂點的座標誤差、頂點繞向不一致）。

|任務|產出|
|---|---|
|硬編碼 5 個頂點的凸多邊形，實作 Ear Clipping 三角剖分|`triangulate.ts` + 單元測試|
|**硬編碼一組凹多邊形（如 6 頂點 L 形），驗證 Ear Clipping 正確切割**|`triangulate.ts` 單元測試（凹多邊形案例）|
|**撰寫退化案例測試（共線點、極小角、重複點）**|`triangulate.ts` 單元測試（邊界案例）|
|**實作「找不到耳朵時有限步數終止」的優雅失敗**|`triangulate.ts` 錯誤處理 + 單元測試|
|**實作輸入繞向正規化（signed area 反轉）**|`winding.ts` + 單元測試|
|硬編碼三角形，實作共用邊偵測（僅兩三角形共用的邊）|`connectivity.ts` + 單元測試|
|**實作頂點對齊（snapping）：以螢幕像素為 epsilon 單位**|`snapVertex.ts` + `screen.ts` + 單元測試|
|用 SVG 渲染三角形，測試凸多邊形/凹多邊形填充|一個靜態 HTML 頁面|
|測試爆炸圖平移動畫|`requestAnimationFrame` 插值|

**驗收：**

- 硬編碼的 5 個頂點（凸多邊形），能正確切成 3 個三角形，並偵測到共用邊
- **硬編碼的 6 頂點凹多邊形（L 形），能正確切成 4 個三角形，且切割結果不產生自我相交的三角形**
- **共線點、極小角、重複點的退化輸入，演算法能有限步數終止並回傳錯誤，而非卡死**
- **逆時針輸入的頂點，經繞向正規化後能正確切割**
- **模擬老師先畫圖形 A（4 頂點），再畫圖形 B（4 頂點，其中 1 個頂點與 A 的某頂點距離 < 8 螢幕像素），系統應自動判定為同一頂點，並正確反映共用邊**

**風險：** 幾乎為零。如果這步卡住，代表 Ear Clipping、繞向正規化、或頂點對齊的實作有問題，及早發現。

---

### Sprint 1：頂點輸入 + 三角剖分（1 週）

**User Story：** 作為老師，我可以在圖片上點出頂點，系統自動用 Ear Clipping 切成三角形，
凹凸多邊形皆可正確處理；分次描繪的重疊圖形，共用頂點會自動對齊；
我可以明確地「完成這一組」再開始下一組。

|任務|檔案|
|---|---|
|Clipboard API 貼上圖片|`PasteHandler.tsx`|
|圖片作為 SVG 背景|`ImageLayer.tsx`|
|點擊新增頂點（紅點）|`VertexLayer.tsx`|
|**新增頂點時執行 snapping 判斷（螢幕像素距離 < 8px 視為同一點）**|`VertexLayer.tsx` + `snapVertex.ts`|
|**Snapping 觸發時的視覺回饋（頂點閃一下）**|`VertexLayer.tsx`|
|拖曳調整頂點位置（拖曳時同樣套用 snapping）|`VertexLayer.tsx`|
|**「完成這組」按鈕 / 雙擊空白處結束當前組**|`GroupControl.tsx` + `Toolbar.tsx`|
|呼叫三角剖分（Ear Clipping + 繞向正規化）|`triangulate.ts` + `winding.ts`|
|渲染三角形|`TriangleLayer.tsx`|
|**Ear Clipping 失敗時的 UI 提示（非阻擋）**|`TriangleLayer.tsx` + `triangulate.ts`|

**驗收：**

- 貼上一張圖，點 4 個頂點，系統自動切成 2 個三角形
- **貼上一張圖，點出一個凹多邊形（例如 L 形的 6 個頂點），系統正確切成 4 個三角形**
- 拖曳頂點，三角形即時更新
- **拖曳頂點靠近另一個既有頂點時，自動吸附合併，且被吸附的頂點有視覺回饋**
- **點擊「完成這組」後，可以開始下一組頂點**
- **若某組頂點無法自動切割，UI 顯示提示，老師可以調整頂點**
- 按「清除」可以重新開始

**Definition of Done：**

- `domain/` 層的純函數有單元測試
- Chrome + Firefox 測試通過
- 無 console error

---

### Sprint 2：圖層控制 + 連通偵測（1 週）

**User Story：** 作為老師，我可以勾選/取消每個三角形，系統自動標記哪些三角形共用邊。

|任務|檔案|
|---|---|
|三角形圖層開關 UI|`LayerPanel.tsx`|
|連通偵測（僅兩三角形共用的邊，懸邊不計）|`connectivity.ts`|
|共用邊視覺化（虛線或高亮）|`TriangleLayer.tsx`|
|三角形顏色僅用於 focus|`TriangleLayer.tsx`|
|點擊三角形 → 高亮|`TriangleLayer.tsx`|

**驗收：**

- 4 個頂點切成 2 個三角形，系統正確標記共用邊
- **懸邊（只屬於一個三角形的邊）不出現在連通關係中**
- 勾選/取消圖層，三角形即時顯示/隱藏
- 點擊三角形，該三角形高亮，其他淡化

**Definition of Done：**

- 連通偵測有單元測試（含懸邊案例）
- 圖層開關狀態保存在 store
- 無 console error

---

### Sprint 3：合併圖形 + 爆炸圖（1 週）

**User Story：** 作為老師，我可以把連通的三角形合併成更大的圖形，並按爆炸圖拆開展示。

|任務|檔案|
|---|---|
|合併連通三角形|`mergeShapes.ts`|
|合併後的圖形列表|`ShapePanel.tsx`|
|**爆炸方向策略：固定角度偏移（第 i 個圖形沿角度 i × 360/N 方向平移固定距離，圖形本身不旋轉）**|`ExplodeControl.tsx`|
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

**User Story：** 作為老師，我可以在任何裝置上打開網頁，貼上圖片，完成整個流程。

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

---

## 四、風險與應對

|風險|機率|影響|應對|
|---|---|---|---|
|三角剖分對凹多邊形失效|低|中|**已於 Sprint 0 改用 Ear Clipping 演算法取代 fan triangulation，凹凸多邊形皆可直接處理；`convexCheck.ts` 降級為 UI 提示用途，不再是阻擋條件**|
|**Ear Clipping 在退化輸入（共線、極小角、重複點）卡死**|**中**|**高**|**Sprint 0 加入「找不到耳朵時有限步數終止」，回傳錯誤而非卡死；UI 提示老師調整頂點**|
|**頂點輸入繞向不一致（順時針 vs 逆時針）**|**中**|**中**|**Sprint 0 加入 `winding.ts`，以 signed area 判斷並反轉，確保輸入一致**|
|**分次描繪的重疊圖形，共用頂點座標無法完全一致**|**中**|**高**|**Sprint 0／Sprint 1 加入頂點 snapping，epsilon 綁定螢幕像素（8px），拖曳時同樣套用；吸附時有視覺回饋**|
|頂點太多導致三角剖分爆炸|低|低|n < 30 時 O(n²) 足夠，超過時提示|
|電子白板觸控事件不相容|中|中|Sprint 4 專門測試，用 pointer events 而非 mouse events|
|圖片太大導致渲染卡頓|低|低|限制圖片最大邊長，超過時自動縮放|
|GitHub Pages 路由問題|低|低|用 hash router 或單頁應用|

---

## 五、工程細節備忘

以下是 Sprint 0～3 需要特別注意的實作細節，避免踩坑：

### 5.1 Ear Clipping 的優雅失敗

Ear Clipping 在以下情況可能找不到耳朵而進入無限迴圈：

- 三點共線（退化三角形）
- 極小角（浮點誤差導致方向判斷錯誤）
- 輸入頂點順序是順時針而非逆時針

**實作要求：**
- 迴圈步數上限設為 `n²` 或 `2n`，超過即終止
- 回傳 `{ success: false, reason: '...' }`，而非拋出異常
- UI 顯示提示，讓老師調整頂點後重試

### 5.2 頂點 Snapping 的 epsilon 單位

- **epsilon 綁定「螢幕像素」而非「世界座標」**
- 建議值：8px（可依裝置調整）
- 換算方式：`worldEpsilon = screenEpsilon / zoomLevel`
- 原因：老師放大檢視時，吸附行為才不會變得過於敏感或過於寬鬆

### 5.3 Snapping 的視覺回饋

- 吸附觸發時，被吸附的頂點閃一下（例如放大 1.2 倍再縮回）
- 或顯示一個短暫的提示圈
- 沒有視覺回饋，老師會不知道「剛剛發生了什麼」

### 5.4 「完成這組」的明確動作

- 老師需要一個明確的動作來結束當前組，才能開始下一組
- 建議：工具列上的「完成這組」按鈕，或雙擊空白處
- 沒有這個動作，老師會不知道什麼時候該停

### 5.5 懸邊（dangling edge）的處理

- 連通偵測只考慮「兩個三角形共用的邊」
- 懸邊（只屬於一個三角形的邊）不參與連通
- `connectivity.ts` 實作時明確處理

### 5.6 爆炸圖的方向策略

N 個圖形要爆炸時，每個圖形往哪個方向移動？三種常見選擇：

|策略|說明|適用|
|---|---|---|
|沿質心向外|每個圖形從整體質心往外移|圖形分散、不重疊|
|按網格排列|圖形移到預先定義的格子位置|圖形數量固定、需要整齊|
|**固定角度偏移**|**第 i 個圖形沿角度 i × 360/N 方向平移固定距離，圖形本身不旋轉——只是位移向量的方向不同**|**最簡單，MVP 採用**|

**MVP 決定：固定角度偏移。** 實作成本最低，視覺效果足夠。
**注意：**「旋轉」指的是決定平移方向的角度，不是把三角形/圖形本身的幾何形狀轉動；平移前後圖形的邊長、角度都應保持不變，只有位置改變。

### 5.7 輸入繞向正規化

- 老師點頂點時，可能是順時針，也可能是逆時針
- Ear Clipping 需要一致的繞向
- `winding.ts` 入口計算 signed area，若為負則反轉頂點順序
- 這一步很便宜，但漏掉的話會隨機出錯，很難 debug

---

## 六、MVP 完成後的下一步

等老師試用後，再決定要不要加：

|功能|優先度|備註|
|---|---|---|
|匯出動畫 GIF|★★|老師可以放進簡報|
|多組頂點集合|★★|一張圖有多個獨立圖形|
|自動偵測頂點（角點偵測）|★|風險較高，但比線偵測簡單|
|圓弧支援|★|需要不同的幾何處理|
|學生模式|★|讓學生自己操作|

---

## 七、給你的行動清單

- [ ] 1. 建 repo，選 GPL-3.0
- [ ] 2. Sprint 0：硬編碼 5 頂點（凸多邊形），驗證 Ear Clipping
- [ ] 3. Sprint 0：硬編碼凹多邊形（L 形），驗證 Ear Clipping 正確處理
- [ ] 4. Sprint 0：驗證退化輸入（共線、極小角、重複點）的優雅失敗
- [ ] 5. Sprint 0：驗證繞向正規化（signed area 反轉）
- [ ] 6. Sprint 0：驗證頂點 snapping（螢幕像素 epsilon）
- [ ] 7. Sprint 0：驗證連通偵測（含懸邊案例）
- [ ] 8. Sprint 0：驗證 SVG 渲染 + 平移動畫
- [ ] 9. 等老師回覆 2〜3 張圖
- [ ] 10. Sprint 1〜4：照上面走
- [ ] 11. 部署到 GitHub Pages
- [ ] 12. 給老師試用

---

## 結論

你這個專案的 MVP 非常乾淨：

- 純前端、零後端、GitHub Pages 託管
- Ear Clipping 實務上約 O(n²)，n < 30 時仍是毫秒級
- 完全避開 CV；凹多邊形、退化輸入、頂點對齊、繞向不一致四項風險已於 Sprint 0 納入驗證範圍
- GPL-3.0，開源，任何 K-12 老師都能用
- 4〜5 週完成，核心風險集中在 Sprint 0 的 3 天內即可驗證清楚

Sprint 0 只需要 3 天，就能驗證整個核心是否成立（含凹多邊形、退化輸入、頂點對齊、繞向正規化四項補強驗證）。
如果 Sprint 0 過了，後面就是照表操課。
如果 Sprint 0 卡住，你只損失 3 天，而不是 3 個月。

現在就可以開始了。
