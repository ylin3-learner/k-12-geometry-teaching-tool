# 幾何圖形教學工具：框架圖與 Agile 開發流程

**版本：** MVP 定稿 v7（結構／座標雙圖層模型 + 第二輪真實語料驗證後範圍收斂）
**授權：** GPL-3.0
**部署：** GitHub Pages（純前端、零後端）
**目標：** 讓 K-12 老師用最輕量的方式，把重疊幾何圖拆解成可教學的結構

一句話：老師貼上一張幾何題目截圖，貼上題幹文字（或用 OCR 識別），系統解析出文字裡宣告的三角形／四邊形等結構；老師只需要依系統提示，把每個提到的字母在圖上點一下標出位置，系統就能直接把文字宣告的形狀「畫」出來，再讓老師勾選圖層、按爆炸圖拆開展示。（「點在線段上」這類關係不需要文字解析——見 0.8 節）

技術本質：純前端 + 輕量文字解析（非通用 NLP）+ 兩圖層合成（結構圖層 × 座標圖層）
複雜度：文字解析為固定樣式的 O(n) tokenizer/parser；結構合成為 O(k)，k = Statement 數量；連通偵測為 O(k²)（k 通常 < 10）。**不涉及三角剖分、不涉及窮舉、不涉及組合搜尋。**
風險：核心風險集中在文字解析對真實語料的覆蓋率，可在 Sprint 0 用真實掃描檔驗證清楚

---

## 〇、核心模型是怎麼收斂出來的

這個專案的架構經過幾輪推翻重來，最後收斂到一個比最初「手動點頂點 → 系統自動三角剖分」簡單得多、但也更準確反映真實使用情境的模型。以下記錄推導過程，因為每一步的「為什麼不這樣做」跟結論本身一樣重要。

### 0.1 最初的假設：系統自動切三角形（已推翻）

最早的版本是「老師點頂點 → 系統用 Ear Clipping 自動三角剖分 → 老師勾選圖層合併」。這個假設有兩個問題：

1. **只適用於一種拓樸。** 真實語料裡（見 0.4）大量出現的是「兩條線交叉於一點」（蝴蝶結型），這種輸入根本不是一個簡單多邊形，Ear Clipping 這個工具用不上。
2. **切割是無語義的，會產生老師不需要的原子區塊。** 即使勉強切了，切出來的三角形本身不知道「哪幾塊合起來是老師要教的那個形狀」，還需要一層額外的合併邏輯去猜。

### 0.2 中間的假設：窮舉切割 + 文字窄化（已推翻）

下一版想法是：先把整張圖窮舉切成最小單位的原子面（用平面直線圖 PSLG 的方式處理任意交叉線段），再用文字宣告去搜尋「哪些原子面的聯集等於文字提到的形狀」。

這個想法在邏輯上可行，但**做了不必要的事**：如果文字已經明確宣告「△ABC」，系統要做的其實只是「把 A、B、C 三個點連起來」，不需要繞道先切出一堆原子面再逆向搜尋哪些面拼得出這個三角形。窮舉再窄化，是在解一個比實際問題更難的問題。

### 0.3 最終模型：結構圖層 × 座標圖層，直接合成

**關鍵洞察：形狀的「結構」（哪些點構成哪個形狀、依什麼順序連線）幾乎全部都已經寫在題幹文字裡了；系統唯一缺的是「這些字母對應到截圖上的哪個實際位置」。**

這兩件事是完全獨立的兩個圖層：

| 圖層 | 提供什麼 | 來源 | 特性 |
|---|---|---|---|
| **結構圖層** | 哪些字母構成一個形狀、依什麼順序連線、字母之間的語義關係（角相等、長度……） | 題幹文字解析（貼上文字或 OCR） | 純符號，無座標 |
| **座標圖層** | 每個字母對應截圖上的實際位置 | 老師點擊命名 | 純位置，無結構 |

兩層合成的方式很直接：拿到「△ABC」這句宣告後，去查 A、B、C 各自的座標（老師點擊命名過的），然後直接把三個點連起來畫出三角形——**不需要三角剖分，不需要窮舉，不需要搜尋**。

這個模型直接解決了老師操作繁瑣的問題：**老師不需要按順序點、不需要分組、不需要按確認鍵去標記「這幾個點屬於同一個形狀」**——順序與分組這些結構資訊，全部由文字宣告提供；老師只要「點一下、標個名字」，一個字母只做一次，做完就結束。

### 0.4 真實語料驗證（依實際掃描的講義題目）

用一份相似三角形單元的講義驗證了這個模型，歸納出四種在真實教材裡出現的情境：

**類型一：蝴蝶結型（shared-vertex crossing）**
例：`C-A-E` 一條直線、`B-A-D` 一條直線，交於 A，形成 △ABC、△ADE 共用頂點 A。
文字：「△ABC和△ADE」→ 直接連 A-B-C 一個三角形、A-D-E 另一個三角形。兩個三角形都是文字**直接**給的，不需要知道老師點擊順序。

**類型二：巢狀型（nested，point-on-segment）**
例：E、F 分別在 AB、AC 上，△AEF 疊在 △ACB 裡面，講義原文甚至直接畫了「拆解→」的手繪箭頭，把兩個三角形拆開展示——這正是這個工具想自動化的動作。
文字：「△ACB與△AEF」→ 一樣是兩個被文字直接命名的三角形，各自照宣告順序連線即可，不需要把大三角形「切開」才能拿到小三角形，因為小三角形的三個頂點（A、E、F）本身就已經是被點過名的座標。**「E 在 AB 上」這件事本身不需要被文字解析出來——見 0.8 節。**

**類型三：角相等衍生的相似（equal-angle）**
例：`∠A=∠CED`、`∠B=∠E，∠C=∠F`。這種「角等於角」的宣告，在原本的資料模型裡沒有對應的 Statement 類型（原本只有「角等於一個數值」），這次驗證後補上 `equal-angle`。

**類型四：只有約束條件，形狀名稱藏在子題裡**
例（講義第 4 題）：題幹只有 `AB // DE，AC=4，CD=3`，但子題 (1) 問「△ACB 與 △DCE 是否相似？」——三角形名稱藏在問句裡。
- **貼整題**（含子題）→ 三角形名稱抓得到，正常處理
- **只貼題幹**（不含子題）→ 沒有任何形狀宣告，系統明確引導老師補貼子題或改用手動連線

**額外驗證：三角形識別不依賴上下文語意**
講義裡很多是「△ABC和△ADE是否相似？」這種問句形式，甚至有「(1) △CAB~△___」這種填空題型（講義第 1 頁第 1 題）。這對核心構造沒有影響——Parser 是用「位置掃描」找 `△XYZ` 這個樣式，不管前後文是不是問句、句子裡有沒有中文字、後面接不接得上空格或底線，一樣抓得到三角形宣告。**這個工具不判斷、也不記錄「是否相似」這件事本身（scope 明確排除，見 0.7、0.8 節）——「△CAB~△___」這句話對系統來說唯一有意義的產出，就是「△CAB」這一個三角形宣告。**

### 0.5 沒有文字時的退路

沒有題幹文字（也沒有截圖可 OCR）時，結構這一層要從哪裡來？答案是：**老師手動指定連線順序，走同一套下游邏輯，只是「Statement 從哪來」不同。** 老師依序點擊已經命名好的幾個頂點（例如點 A → 點 B → 點 C），按下「完成這個形狀」，系統直接產生一個等同於文字宣告出來的 Shape。文字路徑與手動路徑最終匯流到同一個資料結構與同一套渲染/連通/爆炸邏輯，差別只在「順序資訊從文字來，還是從點擊順序來」。

### 0.6 手動連線是首選路徑之一，不是後備

某些題型下（例如第 4 題），手動連線反而比貼整題更快：

- **貼整題**：文字量大，Parser 要處理的噪音多，還要抓子題裡的形狀名稱
- **手動連線**：只要點 6 下（3+3），完全不會被中文字干擾

這說明手動連線不是「後備路徑」，而是「某些題型下的首選路徑」。Sprint 1 的 `ManualLinkControl.tsx` 值得投入足夠的設計時間。

### 0.7 MVP 明確不處理的範圍

- **截圖裡沒被文字命名、也沒被老師手動框出的剩餘區域**：不處理。這個工具的目的是把老師在教學時「會特別拿出來講」的那幾個形狀拆解展示，不是把整張圖窮盡分割成互斥區塊。
- **形狀之間的部分重疊但未被命名的區域**（例如兩個命名三角形之外，圖上還畫了别的線）：不特別處理，維持原圖背景顯示即可。
- **從線段關係反推該連成什麼形狀**：不做。如果系統開始從 `AB//DE` 猜「A、B、C 應該連成一個三角形」，就會退回之前推翻掉的「窮舉/猜測」模型。
- **判斷或記錄「兩個形狀是否相似」**：不做。相似與否是老師上課要問學生的教學問題，不是系統要計算或儲存的資訊。系統只負責解析結構（形狀由哪些點構成、怎麼連線）、標點、畫形狀、拆解展示——不涉及任何幾何性質的判定或證明。

### 0.8 範圍再收斂：拿掉 `similar`，拿掉 `point-on-segment` 的文字解析（第二輪語料驗證後）

對照一份真實掃描講義逐題檢查後，發現資料模型裡有兩個地方「多做了」不必要的事，值得記錄推翻的理由：

**拿掉 `similar`：** 這個專案的 scope 從頭到尾只處理「結構」——形狀由哪些點構成、依什麼順序連線——不處理「兩個形狀是否相似」這種教學判斷（見 0.7）。而且 0.4 節已經驗證過，Parser 抓三角形宣告本來就不靠上下文語意，問句、填空都抓得到。也就是說，`similar` 這個型別從一開始就沒有任何下游邏輯在消費它——`resolveShapesFromStatements` 不需要它來畫形狀，`connectivity` 不需要它來判斷共用頂點，爆炸圖也不需要它來決定方向。留著它只是徒增一個沒有下游消費者的資料型別，予以移除。

**拿掉 `point-on-segment` 的文字解析：** 這是本輪最值得記錄的推翻。原本以為「E、F 分別在 AB、AC 上」這句話需要 Parser 解析出一個獨立的關係型別，但實際檢查下游邏輯後發現完全不需要：`resolveShapesFromStatements` 畫 △AEF 只需要 definitions 裡的「△AEF」三角形宣告加上 A、E、F 三點的座標，不需要另外知道「E 在哪條線段上」；`connectivity` 純粹比對兩個 Shape 的 `vertexIds` 交集，同樣用不到這個資訊。

真正的原因是：**E 在 AB 上這件事，在老師把 E 點在照片上的那一刻就已經被座標圖層自動保證了，不需要文字圖層再講一次。** 這正是本專案「物理結構優先」的精神（見 0.5、0.6）——凡是點擊座標就能天然滿足的幾何事實，文字解析不需要重複確認。反過來說，文字圖層真正該負責的，只限定在「光靠座標點不出來的資訊」：也就是分組與連線順序（哪些字母構成哪個形狀）。

移除這兩者後，Parser 的必要覆蓋範圍收斂成純符號樣式（△／四邊形宣告、線段長度、角度值、平行、垂直、等角、等長），**不再需要理解任何中文語法結構**——這也讓最初選用 texify2（LaTeX 導向的 OCR）的判斷完全站得住：在這個收斂後的範圍裡，中文確實只是可以整段丟棄的分隔雜訊，不需要保留任何語意關鍵詞白名單，OCR 路徑與貼文字路徑在 Parser 覆蓋範圍上完全對等，不再有例外。

---

## 一、專案定位

讓 K-12 老師不需要任何設計或程式背景，就能把課本上常見的「重疊幾何圖」
（例如 △ABC 和 △ADE 交於一點、E、F 分別在 AB、AC 上衍生出的巢狀三角形）拆解成一步步可教學的結構：
系統依文字宣告直接構造出每個被命名的形狀，標出形狀之間共用哪些頂點，
老師勾選圖層、決定顯示順序，按爆炸圖拆開展示給學生看。

系統不判斷、也不記錄任何幾何性質（例如是否相似、是否全等）——這是老師教學時要問學生的問題，不是這個工具的職責。

整個工具純前端運作，沒有後端、沒有資料庫，部署在 GitHub Pages 上即可使用，
任何學校網路環境都能直接打開瀏覽器操作。

---

## 二、框架圖

### 2.1 整體架構

```
┌───────────────────────────────────────────────────────────────────┐
│                         瀏覽器（純前端）                             │
│                                                                     │
│  ┌─────────────────────────────┐                                   │
│  │         Input Layer          │                                   │
│  │  ┌─────────┐ ┌───────┐ ┌────┴─────┐                             │
│  │  │ 圖片貼上 │ │文字貼上│ │圖片 OCR   │  ← 文字/OCR 皆為選配        │
│  │  └────┬────┘ └───┬───┘ └────┬─────┘                             │
│  │       │          │           │                                   │
│  │       │          │     ┌─────▼─────┐                             │
│  │       │          │     │  Texo     │  Web Worker（條件性 Sprint）│
│  │       │          │     │  (ONNX)   │                             │
│  │       │          │     └─────┬─────┘                             │
│  │       │          │           │                                   │
│  │       │    ┌─────▼───────────▼─────┐                             │
│  │       │    │   LatexNormalizer      │  LaTeX → unicode           │
│  │       │    └─────────┬─────────────┘                             │
│  │       │              │                                           │
│  │       │    ┌─────────▼─────────────┐                             │
│  │       │    │ Tokenizer → Parser      │  → Statement[]（結構圖層） │
│  │       │    │  → Classifier           │    純符號，無座標          │
│  │       │    │  （純符號樣式匹配，       │                          │
│  │       │    │   中文一律當雜訊丟棄）    │                           │
│  │       │    └─────────┬─────────────┘                             │
│  │       │              │                                           │
│  │       │    ┌─────────▼─────────────┐                             │
│  │       │    │ collectRequiredLabels   │  去重字母集合               │
│  │       │    └─────────┬─────────────┘                             │
│  │       ▼              ▼                                           │
│  │  ┌─────────────────────────┐                                     │
│  │  │   Guided Naming          │  引導老師逐一點名                   │
│  │  │  （或手動依序點擊連線）   │  → Vertex[]（座標圖層）            │
│  │  └────────────┬─────────────┘                                    │
│  └───────────────┼───────────────────────────────────────────────┘  │
│                  ▼                                                  │
│  ┌───────────────────────────────┐   ┌─────────────┐               │
│  │        Domain Layer             │──▶│   Render    │               │
│  │  resolveShapesFromStatements    │   │    Layer    │               │
│  │  （結構 × 座標 → Shape，直接連線 │   │  SVG 渲染   │               │
│  │   不做三角剖分、不做窮舉）        │   │  圖層控制    │               │
│  │  connectivity（共用頂點偵測）    │   │  爆炸動畫    │               │
│  └───────────────┬─────────────────┘   └──────┬──────┘              │
│                  │                              │                    │
│  ┌───────────────▼──────────────────────────────▼───────────────┐   │
│  │                       State（單一來源）                          │   │
│  │  vertices / statements / shapes / connections                  │   │
│  └───────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  GitHub Pages（靜態託管）
```

**關鍵設計決策：**

1. **結構圖層與座標圖層完全獨立，直到 `resolveShapesFromStatements` 才合成。** Parser 產出的 `Statement[]` 全程不知道任何座標；`Vertex[]` 全程不知道任何結構。這個分離讓兩邊都可以獨立測試。

2. **沒有「三角剖分」這個核心步驟。** 每個被文字命名的形狀，要嘛是三角形（三點必然可直接連成，不會自交），要嘛是文字給出明確頂點順序的多邊形（SVG 的 `<polygon>` 原生支援凹多邊形，不需要預先剖分）。

3. **手動路徑與文字路徑匯流於同一個 `resolveShapesFromStatements`。** 沒有文字時，老師手動依序點擊產生的「順序」本質上就是一個手動輸入的 Statement，走完全相同的下游邏輯。

4. **文字圖層只負責「光靠座標點不出來的資訊」。** 分組與連線順序（哪些字母構成哪個形狀）必須來自文字；「點在線段上」這種光靠座標就自然成立的事實，不需要文字圖層重複確認（見 0.8）。

### 2.2 資料流

#### 路徑 A：文字輔助（有題幹文字時，主要路徑）

```
題幹文字（老師貼上，或 OCR 識別後校對）
   │
   ▼
LatexNormalizer（LaTeX → unicode，若來自 OCR）
   │
   ▼
Tokenizer → Parser → Classifier
   │  △ABC → { kind: 'triangle', vertices: ['A','B','C'] }
   │  ∠A=∠CED → { kind: 'equal-angle', ... }
   │  ∠C=∠AEF=90° → 拆解為 2 個 Statement：
   │      { kind: 'equal-angle', angles: [['A','E'? ...]] }（∠C 與 ∠AEF 相等）
   │      { kind: 'angle-value', vertices: ['A','E','F'], value: 90 }（∠AEF=90°）
   │  AC=4 → { kind: 'segment-length', segment: ['A','C'], value: 4 }
   │  （中文連接詞、「和」「與」「上」「是否相似」等，一律當雜訊丟棄，
   │   不需要語意理解 —— 見 0.8）
   ▼
Statement[]（結構圖層，純符號）
   │
   ▼
collectRequiredLabels（去重字母集合，例：{A,B,C,D,E}）
   │
   ▼
引導式點名精靈
「請點出 A 的位置」→「請點出 B」→ …
（無序、不分組、一個字母只問一次）
   │
   ▼
Vertex[]（座標圖層：name + position）
   │
   ▼
resolveShapesFromStatements(Statement[], Vertex[])
   │  對每個定義性 Statement，把字母換成對應 Vertex 座標，
   │  依宣告順序直接連線構造 Shape
   │  ← 不做三角剖分、不做搜尋，純粹是查表 + 連線
   │
   ├── 若缺少定義性 Statement（例如只貼題幹）→ 不合成 Shape
   │   UI 明確提示：「目前偵測到 N 個約束條件，但沒有形狀宣告。
   │                  建議：貼上完整題目（含子題），或使用手動連線。」
   │
   └── 若缺少某些字母的座標 → 該 Shape 暫不合成
       UI 提示「還缺 X 個頂點」
   ▼
Shape[]（每個都有名字、有完整座標，可直接渲染）
```

#### 路徑 B：純手動（沒有題幹文字時的退路，也是某些題型的首選）

```
圖片貼上
   │
   ▼
老師點擊命名頂點（無序，一個字母點一次）
   │
   ▼
Snapping（螢幕像素距離 < 8px 視為同一頂點）
   │
   ▼
老師依序點擊已命名的頂點，構成一個形狀的邊界
   │  （等同於手動輸入一個 Statement）
   ▼
老師按「完成這個形狀」
   │
   ▼
直接產生 Shape（與路徑 A 的 resolveShapesFromStatements 邏輯一致）
```

#### 路徑 C：圖片 OCR（文字路徑的前置處理器）

```
題目截圖（老師手動裁切到幾何聲明密集區域）
   │
   ▼
Texo（Transformers.js，純前端，Web Worker）
   │
   ▼
LaTeX 文字 → LatexNormalizer → 回填文字輸入框（老師校對）
   │
   ▼
後續與路徑 A 完全共用
（Parser 範圍已收斂成純符號樣式，OCR 與貼文字路徑覆蓋範圍完全對等，見 0.8）
```

#### 匯流點：連通偵測 + 展示

```
Shape[]（不管來自路徑 A 或 B）
   │
   ▼
connectivity：偵測 Shape 之間共用哪些頂點
   （蝴蝶結型：共用 1 個頂點；巢狀型：E、F 分別是共用頂點）
   │
   ▼
老師勾選圖層顯示/隱藏
   │
   ▼
爆炸圖：每個 Shape 整組沿固定角度平移展開（不拆解成更小單位）
```

### 2.3 資料模型

```typescript
// ── 座標圖層 ──────────────────────────────────────

type Vertex = {
  id: string;
  name: string;            // "A", "B", "C" —— 文字模式必填，是合成的查找鍵
  position: { x: number; y: number };  // 圖片座標系（image space）
};

// ── 結構圖層：純符號，無座標 ────────────────────────

type Statement =
  // 定義性（直接構造 Shape 的依據）
  | { kind: 'triangle'; id: string; vertices: [string, string, string]; source: string }
  | { kind: 'quadrilateral'; id: string; vertices: string[]; source: string }
  // 輔助性（不直接構造 Shape，僅供選配的約束驗證使用）
  | { kind: 'segment'; id: string; endpoints: [string, string]; source: string }
  | { kind: 'point-on-segment'; id: string; point: string; segment: [string, string]; source: string }
    // ↑ 選配：MVP 的 Parser 不主動解析這個 kind（見 0.8）。
    //   「點在線段上」這個事實由座標圖層自然滿足，不需要文字重複宣告。
    //   保留這個型別只是為了未來若要做「約束驗證」（§6.7）時有地方掛資料，
    //   不是 Sprint 0 的必要覆蓋範圍。
  // 約束性（供教學顯示用，不驅動任何座標）
  | { kind: 'angle-value'; id: string; vertices: [string, string, string]; value: number; unit: 'deg'; source: string }
  | { kind: 'segment-length'; id: string; segment: [string, string]; value: number; source: string }
  | { kind: 'equal-angle'; id: string; angles: [[string, string, string], [string, string, string]]; source: string }
  | { kind: 'equal-length'; id: string; segments: [[string, string], [string, string]]; source: string }
  | { kind: 'parallel'; id: string; segments: [[string, string], [string, string]]; source: string }
  | { kind: 'perpendicular'; id: string; segments: [[string, string], [string, string]]; source: string };

// 注意：沒有 `similar` kind。相似性判斷不在這個工具的 scope 內（見 0.7、0.8）。
// 「△CAB~△___」這種問句/填空句式，Parser 只會從中抓出「△CAB」一個 triangle 宣告，
// 「~△___」的部分因為抓不到完整字母組合，自然被忽略，不需要任何特殊處理。

type ClassifiedStatements = {
  definitions: Statement[];   // triangle / quadrilateral —— 直接構造 Shape
  auxiliary: Statement[];     // segment / point-on-segment —— MVP 中通常為空，僅供選配的約束驗證
  constraints: Statement[];   // 角度、長度、等長、平行、垂直 —— 純顯示用
  unresolved: string[];       // 解析不出來的片段，UI 明確列出
};

// ── 合成結果：Shape 直接由 Statement + Vertex 構造 ──────

type Shape = {
  id: string;
  name: string;             // "△ABC"、"四邊形ABCD"
  vertexIds: string[];      // 依 Statement 宣告順序，對應到 Vertex.id
  visible: boolean;
  source: 'text' | 'manual';
};

// ── 連通關係：Shape 之間共用哪些頂點（純比對 vertexIds 交集，不依賴 point-on-segment）──

type Connection = {
  shapeA: string;
  shapeB: string;
  sharedVertexIds: string[]; // 1 個 = 蝴蝶結型共用頂點；2 個以上 = 共用邊/多點
};

// ── OCR（選配路徑）─────────────────────────────────

type OCRStatus = 'idle' | 'loading-model' | 'recognizing' | 'done' | 'error';

type OCRResult = {
  status: OCRStatus;
  latex: string;
  confidence?: number;
  error?: string;
  modelProgress?: number;
};

// ── 整個場景 ──────────────────────────────────────

type Scene = {
  image: HTMLImageElement | null;
  text: string;
  classifiedStatements: ClassifiedStatements | null;
  ocrResult: OCRResult | null;
  vertices: Vertex[];
  shapes: Shape[];
  connections: Connection[];
  mode: 'idle' | 'guided-naming' | 'manual-naming' | 'manual-linking' | 'exploding';
  namingQueue: string[];      // 引導式點名的剩餘字母
  currentManualShape: string[]; // 手動連線模式下，目前正在組的頂點序列
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
├── NOTES.md
│
├── public/
│   └── favicon.svg
│
└── src/
    ├── main.tsx
    ├── App.tsx
    │
    ├── domain/                    # 純函數，無 DOM、無 React
    │   ├── parser/
    │   │   ├── types.ts
    │   │   ├── latexNormalizer.ts # LaTeX → unicode
    │   │   ├── tokenizer.ts       # 含 ∼、= 等符號
    │   │   ├── parser.ts          # 含 triangle/quad/equal-angle/segment-length/連等式拆解等樣板
    │   │   └── classifier.ts      # 定義性 / 輔助性 / 約束性 / unresolved
    │   │
    │   ├── semantic/
    │   │   ├── collectRequiredLabels.ts
    │   │   └── resolveShapesFromStatements.ts   # 核心合成邏輯
    │   │
    │   ├── interaction/           # 手動路徑的互動邏輯
    │   │   ├── snapVertex.ts      # 螢幕像素 epsilon 換算
    │   │   └── screen.ts          # 螢幕像素 ↔ 圖片座標換算
    │   │
    │   └── graph/
    │       └── connectivity.ts    # Shape 之間共用頂點偵測
    │
    ├── services/
    │   └── ocr/
    │       ├── TexoWorker.ts
    │       └── texoClient.ts
    │
    ├── store/
    │   └── useSceneStore.ts
    │
    ├── features/
    │   ├── canvas/
    │   │   ├── Canvas.tsx
    │   │   ├── ImageLayer.tsx
    │   │   ├── VertexLayer.tsx    # 紅點 + 拖曳 + snapping
    │   │   └── ShapeLayer.tsx     # 直接渲染 Shape
    │   │
    │   ├── controls/
    │   │   ├── Toolbar.tsx
    │   │   ├── ManualLinkControl.tsx  # 手動依序點擊連線、「完成這個形狀」
    │   │   ├── LayerPanel.tsx
    │   │   └── ExplodeControl.tsx
    │   │
    │   ├── input/
    │   │   ├── PasteHandler.tsx
    │   │   ├── TextInput.tsx      # placeholder 明確提示「請貼完整題目，含子題」
    │   │   ├── OCRInput.tsx
    │   │   └── OCRStatusBar.tsx
    │   │
    │   └── parser/
    │       ├── GuidedNaming.tsx
    │       ├── ParserView.tsx
    │       └── UnresolvedList.tsx
    │
    └── types/
        └── scene.ts
```

**與前版的關鍵差異：**

- `domain/geometry/` 更名並拆分為 `parser/`、`semantic/`、`interaction/`、`graph/`，語義更清楚
- 移除了 `triangulate.ts`、`winding.ts`、`convexCheck.ts`、`mergeShapes.ts`
- `TriangleLayer.tsx` 改為 `ShapeLayer.tsx`
- 新增 `ManualLinkControl.tsx`，手動連線是首選路徑之一
- 資料模型移除 `similar` kind；`point-on-segment` 保留型別但移出 Parser 的必要解析範圍（見 0.8、2.3）

---

## 三、設計原則

**Pipes-and-Filters（文字解析管線）**

`latexNormalizer()` → `tokenize()` → `parse()` → `classify()` 是四個互不相依的純函式。

**兩圖層分離原則**

`Statement[]`（結構圖層）與 `Vertex[]`（座標圖層）在合成之前完全獨立，各自可以單獨測試：
- 測試 Parser 時不需要任何座標
- 測試 Snapping/連通偵測時不需要任何文字

**文字圖層只負責座標點不出來的資訊**

分組與連線順序（哪些字母構成哪個形狀）必須來自文字（或手動連線的等價輸入）；任何光靠座標點擊就能天然成立的幾何事實（例如「點在線段上」），不需要文字圖層重複解析（見 0.8）。這個原則同時決定了 Parser 的必要覆蓋範圍，也決定了 OCR 裁切只需要覆蓋純符號區域即可，不需要辨識中文語法。

**SRP 在 domain/ 層的具體落實**

| 檔案 | 唯一職責 |
|---|---|
| `latexNormalizer.ts` | 只負責 LaTeX → unicode 轉換 |
| `tokenizer.ts` | 只負責把文字切成 token |
| `parser.ts` | 只負責把 token 序列轉成 Statement（含連等式拆解） |
| `classifier.ts` | 只負責把 Statement 分類，收集 unresolved |
| `collectRequiredLabels.ts` | 只負責從定義性 Statement 收集去重字母集合 |
| `resolveShapesFromStatements.ts` | 只負責把 Statement + Vertex 合成為 Shape，不做任何幾何切割 |
| `connectivity.ts` | 只負責找出 Shape 之間共用的頂點 |
| `snapVertex.ts` | 只負責螢幕像素容差判斷（手動路徑用） |

---

## 四、Agile 開發流程

### 4.1 Sprint 總覽

- Sprint 0 ── 文字解析核心 + 結構/座標合成邏輯（4 天）
- Sprint 1 ── 頂點輸入（引導式點名 + 手動連線）+ 形狀渲染（1 週）
- Sprint 2 ── 圖層控制 + 連通偵測 + 爆炸圖（1 週）
- Sprint 2.5 ── 圖片 OCR 整合（1 週，**條件性：需先通過 Spike 驗證**）
- Sprint 3 ── 整合優化 + 部署（1 週）

**總計：約 4.5〜5.5 週**

---

### Sprint 0：文字解析核心 + 結構/座標合成邏輯（4 天）

**目標：** 確認「文字直接構造形狀」這個核心模型可行，並用真實語料驗證 Parser 覆蓋率。

|任務|產出|
|---|---|
|`latexNormalizer.ts` 實作（`\triangle`→`△`、`\overline{}`→去包裹、`^{\circ}`→`°`、`//`→`∥`）|`latexNormalizer.ts` + 單元測試|
|Tokenizer 實作（△、∠、=、⊥、∥、°、∼、字母、數字、中文標點）|`tokenizer.ts` + 單元測試|
|**Parser：通用修飾詞跳過機制**（「若」「已知」「設」「令」等前綴，**逐子句（以逗號/句號切分）各自判斷，不是只在整句最前面跳一次**）|`parser.ts` + 單元測試|
|Parser：triangle / quadrilateral 樣板（**不含 point-on-segment，見 0.8**）|`parser.ts` + 單元測試|
|**Parser 新增：`equal-angle` 樣板**（∠A=∠CED、∠B=∠E,∠C=∠F）|`parser.ts` + 單元測試|
|**Parser 新增：`segment-length` 樣板**（AC=4、CD=3）|`parser.ts` + 單元測試|
|**Parser 新增：連等式（chain equality）拆解**（`∠C=∠AEF=90°` 拆成兩兩配對：`equal-angle{∠C,∠AEF}` + `angle-value{∠AEF,90}`）|`parser.ts` + 單元測試|
|Parser：parallel / perpendicular / equal-length / angle-value 樣板|`parser.ts` + 單元測試|
|Classifier：定義性 / 輔助性 / 約束性 / unresolved 四分類|`classifier.ts` + 單元測試|
|`collectRequiredLabels` 實作（依「第一次出現順序」去重）|`collectRequiredLabels.ts` + 單元測試|
|**`resolveShapesFromStatements` 實作：核心合成邏輯（最優先驗證）**|`resolveShapesFromStatements.ts` + 單元測試|
|`connectivity.ts`：Shape 之間共用頂點偵測（純比對 `vertexIds` 交集）|`connectivity.ts` + 單元測試|
|**用真實掃描講義驗證完整流程（見 0.4 四種情境）**|端到端測試|

**驗收（文字解析）：**

|驗收案例|輸入|預期結果|
|---|---|---|
|蝴蝶結型|`△ABC和△ADE`|2 個 `triangle` Statement，合成後共用頂點 A|
|巢狀型|`△ACB與△AEF`|2 個 `triangle` Statement，`collectRequiredLabels` 正確去重出 {A,C,B,E,F}|
|角相等|`∠A=∠CED`|1 個 `equal-angle` Statement|
|角相等（多組）|`∠B=∠E，∠C=∠F`|2 個 `equal-angle` Statement|
|**線段長度**|`AC=4`|1 個 `segment-length` Statement|
|**連等式（角度鏈式相等 + 數值）**|`若∠C=∠AEF=90°`|「若」被跳過後，拆解為 2 個 Statement：`equal-angle{∠C,∠AEF}` + `angle-value{∠AEF,90}`|
|**修飾詞重複出現（逐子句跳過）**|`若∠A=∠CED，若BC=20，CD=5`|3 個 Statement：`equal-angle` + 2 個 `segment-length`；兩個「若」都被各自正確跳過，第二個「若」不會因為前面已跳過一次而誤判|
|**「若」前綴**|`若BC=8`|1 個 `segment-length` Statement（「若」被跳過）|
|**「已知」前綴**|`已知AB=4`|1 個 `segment-length` Statement|
|**「設」前綴**|`設AC=x`|`segment-length`（若 x 是數字）或進 unresolved（若 x 是變數）|
|**問句 / 填空形式的三角形宣告**|`(1) △CAB~△___`|1 個 `triangle` Statement（△CAB）；不因問句或填空而漏抓；不產生任何相似性相關的 Statement（`similar` 型別已移除，見 0.8）|
|中文夾雜|`△ABC和△ADE`|「和」被跳過，不影響 Parser|
|**點在線段上（不再由 Parser 解析）**|`E、F兩點分別在AB、AC上`|不產生任何 Statement；E、F 的位置由老師點擊座標決定，此關係已隱含於座標圖層，見 0.8|
|**只貼題幹（第 4 題）**|`AB // DE，AC=4，CD=3`|0 個 `triangle`，2 個 `segment-length` + 1 個 `parallel`（都是 constraints）|

**驗收（結構/座標合成）：**

- 給定 `{ kind: 'triangle', vertices: ['A','B','C'] }` 與對應座標，`resolveShapesFromStatements` 正確合成一個 `Shape`，`vertexIds` 順序與宣告一致
- 蝴蝶結型真實案例：兩個三角形宣告 + 5 個點的座標，合成出 2 個 Shape，`connectivity` 正確判斷兩者共用 1 個頂點
- 巢狀型真實案例：兩個三角形宣告 + 座標，合成出 2 個 Shape
- **缺少定義性 Statement（只貼題幹）時，不合成任何 Shape，UI 明確提示**
- **缺少某些字母座標時，該 Shape 暫不合成，UI 提示「還缺 X 個頂點」**

**風險：** 低。主要風險是 Parser 對真實語料措辭變體的覆蓋率，可以持續用更多語料補測試案例。

---

### Sprint 1：頂點輸入（引導式點名 + 手動連線）+ 形狀渲染（1 週）

**User Story：** 作為老師，我可以貼上題幹文字，系統列出需要標出的字母，我依序點出對應位置，系統直接畫出文字宣告的形狀；如果沒有文字，我也可以手動依序點擊已命名的頂點，直接組出一個形狀。

|任務|檔案|
|---|---|
|Clipboard API 貼上圖片|`PasteHandler.tsx`|
|題幹文字輸入框（placeholder 明確提示「請貼完整題目，含子題」），即時觸發 Parser 管線|`TextInput.tsx`|
|圖片作為 SVG 背景|`ImageLayer.tsx`|
|引導式點名精靈（依 `namingQueue` 逐一提示）|`GuidedNaming.tsx`|
|點擊新增頂點（紅點）+ snapping|`VertexLayer.tsx` + `snapVertex.ts`|
|拖曳調整頂點位置|`VertexLayer.tsx`|
|**手動連線模式：依序點擊已命名頂點 + 「完成這個形狀」**|`ManualLinkControl.tsx`|
|未辨識文字清單顯示|`UnresolvedList.tsx`|
|**「只貼題幹」的降級 UI（提示貼完整題目或改用手動連線）**|`ParserView.tsx`|
|**「此字母在圖上找不到」的逃生口（跳過字母）**|`GuidedNaming.tsx`|
|直接渲染 Shape（依 `vertexIds` 畫 polygon）|`ShapeLayer.tsx`|

**驗收：**

- 貼上 `△ABC，D∈BC`，系統列出 `A, B, C, D`，依序點完後正確畫出 △ABC
- 貼上蝴蝶結型真實案例文字，點完 5 個字母後，正確畫出兩個交於一點的三角形
- **貼上第 4 題題幹（只有 AB//DE、AC=4、CD=3），系統明確提示「沒有形狀宣告」，引導老師補貼子題或手動連線**
- 沒有文字時，手動依序點 A → B → C → 「完成這個形狀」，正確畫出一個三角形
- 老師只標記了部分字母時，UI 清楚顯示「還缺哪些字母」
- **老師找不到某個字母時，可以標記「跳過」，系統繼續處理其他部分**

---

### Sprint 2：圖層控制 + 連通偵測 + 爆炸圖（1 週）

**User Story：** 作為老師，我可以勾選/取消每個形狀的顯示，系統標出形狀之間共用哪些頂點；按下爆炸圖，形狀整組平移分開展示。

|任務|檔案|
|---|---|
|形狀圖層開關 UI|`LayerPanel.tsx`|
|**共用頂點視覺化（高亮共用點）**|`ShapeLayer.tsx`|
|**爆炸方向計算（先用蝴蝶結型驗證，再處理巢狀型）**|`ExplodeControl.tsx`|
|爆炸控制（播放/暫停/重置）|`ExplodeControl.tsx`|
|Parser 解析結果樹狀顯示（定義性/輔助性/約束性/unresolved）|`ParserView.tsx`|

**驗收：**

- 勾選/取消圖層，形狀即時顯示/隱藏
- 蝴蝶結型案例：按「爆炸」，兩個三角形以共用頂點 A 為錨點分開平移
- 巢狀型案例：按「爆炸」，兩個形狀分開，不互相卡住
- 爆炸後可重置回原狀，動畫流暢（60fps）

---

### Sprint 2.5：圖片 OCR 整合（1 週，**條件性**）

> **⚠️ 條件性 Sprint：** 需先通過 Spike 驗證，確認 Texo 對幾何聲明的識別率可接受，才正式納入。

**Spike 階段（半天，先於 Sprint 2.5）：**

| 檢查項目 | 記錄方式 |
|---|---|
| 模型輸出格式 | 貼出原始輸出字串 |
| 中文部分是否被正確忽略或變成亂碼 | 標記「無中文 / 亂碼 / 漏掉」（此項風險已因 0.8 節的範圍收斂而降低——Parser 本來就只需要符號部分，中文整段丟棄即可，不再需要 OCR 也保留語意）|
| 幾何符號輸出的格式 | 列出實際符號 |
| 只裁切到符號部分（不含中文）的輸出正確率 | 對比裁切前後 |
| 識別一張圖需要多長時間 | 計時 |
| 老師需要裁切到什麼程度才能得到可用輸出 | 描述裁切範圍 |

**決策門檻：**
- 「裁切到只剩幾何聲明」的輸出正確率 > 80%，且老師願意裁切 → OCR 值得做
- 若裁切後仍錯誤率高，或老師不願意裁切 → OCR 降級為「遠期選項」

**Sprint 任務（若 Spike 通過）：**

|任務|檔案|
|---|---|
|安裝 `@huggingface/transformers`|`package.json`|
|實作 Texo Web Worker|`TexoWorker.ts`|
|實作主執行緒與 Worker 通訊封裝|`texoClient.ts`|
|圖片 OCR 輸入框|`OCRInput.tsx`|
|模型載入/識別進度顯示|`OCRStatusBar.tsx`|
|OCR 失敗時的降級引導|`OCRInput.tsx`|

---

### Sprint 3：整合優化 + 部署（1 週）

|任務|檔案|
|---|---|
|響應式佈局（桌機/平板）|`App.tsx`|
|匯出 SVG / PNG|`utils/svg.ts`|
|GitHub Pages 部署|`vite.config.ts`|
|README + 使用說明|`README.md`|
|iPad Safari 測試（pointer events、Clipboard API 手勢限制）|—|
|跨瀏覽器測試|—|
|OCR 模型備用下載源（若 Sprint 2.5 已納入）|`vite.config.ts`|

**驗收：**

- 在 GitHub Pages 上可以完整使用
- 平板（電子白板）操作正常
- 匯出的 SVG 可以在簡報中使用

---

## 五、風險與應對

| 風險 | 機率 | 影響 | 應對 |
|---|---|---|---|
| 文字解析對真實語料措辭變體覆蓋不全 | 中 | 中 | Sprint 0 用真實掃描講義驗證，`unresolved` 機制兜底 |
| **「只貼題幹」導致沒有任何形狀宣告** | **中** | **中** | **Sprint 1 UI 明確提示「建議貼完整題目或改用手動連線」** |
| **老師找不到某個宣告的字母（題目印錯、看漏）** | **中** | **低** | **Sprint 1 加入「跳過字母」的逃生口** |
| 老師標記字母時點錯位置，導致形狀畫錯 | 中 | 中 | 拖曳調整 + 「還缺哪些字母」的明確提示 |
| 老師沒有題幹文字可貼 | 中 | 低 | 手動連線路徑永遠可用，走同一套合成邏輯 |
| 缺座標的 Statement 被誤渲染 | 低 | 中 | `resolveShapesFromStatements` 明確檢查座標齊全才合成 |
| 兩個 Shape 共用頂點的爆炸方向計算不直覺 | 低 | 低 | Sprint 2 用真實拓樸（蝴蝶結、巢狀）驗證錨點邏輯 |
| OCR 訓練分佈與真實輸入不匹配 | 中（原為高，因 0.8 節範圍收斂而降低） | 中 | Sprint 2.5 條件性，先做 Spike 驗證；Parser 需求已完全收斂為純符號樣式，OCR 只需覆蓋這部分即可 |
| OCR 模型首次載入需下載 80MB | 高 | 中 | 顯示下載進度；提供跳過選項 |
| 電子白板觸控事件不相容 | 中 | 中 | Sprint 3 測試；用 pointer events |
| GitHub Pages 路由問題 | 低 | 低 | 用 hash router |

**已移除的風險（因架構簡化而不再適用）：**
- 三角剖分對凹多邊形失效、Ear Clipping 退化輸入卡死、頂點輸入繞向不一致、自交多邊形輸入——這些都是三角剖分演算法特有的風險，在「文字直接構造形狀」的模型下不會發生。
- **相似性判斷邏輯**——scope 明確排除（見 0.7），不再是模型的一部分。
- **「點在線段上」的文字語意解析**——改由座標圖層自然滿足，不需要 Parser 理解中文語法結構（見 0.8）。

---

## 六、工程細節備忘

### 6.1 兩圖層分離的測試策略

- Parser 測試：只依賴文字輸入，不 mock 座標
- Snapping 測試：只依賴座標輸入，不 mock 文字
- `resolveShapesFromStatements` 測試：同時給 Statement[] 和 Vertex[]，驗證合成結果

### 6.2 頂點 Snapping 的 epsilon 單位（僅手動路徑）

- epsilon 綁定「螢幕像素」（建議 8px）
- 換算：`worldEpsilon = screenEpsilon / zoomLevel`
- 文字模式不需要此機制（每個字母只點一次，共用頂點天生一致）

### 6.3 「完成這個形狀」的明確動作（手動連線模式）

- 老師依序點擊已命名的頂點，構成一個形狀的邊界
- 按下「完成這個形狀」按鈕，或雙擊最後一個頂點
- 系統產生一個 `source: 'manual'` 的 Shape

### 6.4 懸邊處理

連通偵測只考慮「Shape 之間共用的頂點」（純比對 `vertexIds` 交集），不處理懸邊（因為 Shape 是完整的命名形狀，不會有懸邊），也不依賴 `point-on-segment` 這類輔助性 Statement。

### 6.5 爆炸圖的方向策略

固定角度偏移：第 i 個形狀沿角度 i × 360/N 方向平移固定距離，形狀本身不旋轉。
- **蝴蝶結型**：以共用頂點為錨點，兩個形狀沿射線分開
- **巢狀型**：小形狀原地淡出，大形狀保持；或小形狀往上移

### 6.6 引導式點名的設計要點

- 收集字母集合的來源是**所有 Statement**（包含約束性，因為 `AC=4` 也提到了 A、C）
- 引導順序按字母在文字裡「第一次出現」的順序
- UI 顯示進度（例如「3 / 5」）
- 每個字母都有「跳過」選項（逃生口）

### 6.7 約束驗證採用「驗證」而非「求解」（選配功能）

約束值不驅動頂點位置改變。驗證失敗時 UI 顯示警告，但不強制修改。**這是 MVP 之外的選配功能**——如果未來要做「E 是否真的落在 AB 線段附近」這類檢查，才需要用到 `point-on-segment` Statement；MVP 不主動解析這個 kind（見 0.8、2.3）。

### 6.8 LaTeX 正規化層

`latexNormalizer.ts` 是「PDF 文字 / OCR 輸出」與「Tokenizer」之間的橋樑。

```typescript
const LATEX_MAP: Record<string, string> = {
  '\\triangle': '△',
  '\\angle': '∠',
  '\\perp': '⊥',
  '\\parallel': '∥',
  '\\sim': '∼',
  '\\circ': '°',
  '\\degree': '°',
  '//': '∥',
};
```

### 6.9 Parser 的通用修飾詞跳過機制（逐子句判斷）

在比對任何 `X=n` 或 `X=Y` 樣板之前，先跳過一個可選的修飾詞 token（「若」「已知」「設」「令」等）。**這個跳過動作必須逐子句（以逗號、句號等標點切分後）各自判斷，不是只在整句最前面跳一次**——真實語料裡常見同一句話裡「若」出現多次，例如「若∠A=∠CED，若BC=20，CD=5」，第二個「若」如果因為第一個「若」已經被跳過而被誤判成正文的一部分，會導致該子句的 `X=n` 樣板比對失敗。逐子句判斷後，未來遇到新的修飾詞也只需要改這一個共用機制，不用逐一修改每個樣板。

### 6.9.1 連等式（chain equality）拆解

真實語料裡常見「A=B=C」這種鏈式等式，例如「∠C=∠AEF=90°」——這句話同時宣告了兩件事：∠C 與 ∠AEF 相等，而且兩者都等於 90°。Parser 需要把鏈式等式拆解成所有相鄰的兩兩配對：

- 若鏈裡的項目都是符號（例如 `∠A=∠B=∠C`）→ 拆成兩個（或以上）`equal-angle` Statement
- 若鏈裡有一項是數值（例如 `∠C=∠AEF=90°`）→ 符號對符號的部分拆成 `equal-angle`，符號對數值的部分拆成 `angle-value`，數值可以視需要傳遞給鏈裡其他同組的角（`∠C=∠AEF=90°` 可衍生出 `angle-value{∠C,90}` 與 `angle-value{∠AEF,90}` 兩者，或只保留其中一個加上一個 `equal-angle` 佐證兩者相等——實作時取其一即可，不影響下游渲染邏輯，只影響教學顯示的完整度）

只解單一等號（A=B）的樣板無法處理這種鏈式輸入，會漏掉其中一段訊息，因此這是一個獨立於既有 `equal-angle`/`angle-value` 樣板之外、需要額外實作的拆解邏輯。

### 6.10 「只貼題幹」的降級 UI

當 `classifiedStatements.definitions` 為空，但 `constraints` 不為空時：

```
目前偵測到 N 個約束條件（AB//DE、AC=4、CD=3），
但沒有形狀宣告。

建議：
  (a) 貼上完整題目（含子題，形狀名稱可能藏在問句裡）
  (b) 使用手動連線，直接標記 △ACB 與 △DCE
```

### 6.11 OCR 的模型選擇與載入（條件性 Sprint）

**模型：** `Xenova/texify2`（Transformers.js 的 ONNX 版本，底層為 `vikp/texify2`）。

**載入方式：**

```typescript
// services/ocr/TexoWorker.ts
import { pipeline } from '@huggingface/transformers';

let texify: any = null;

self.onmessage = async (e) => {
  const { type, image } = e.data;
  if (type === 'load') {
    texify = await pipeline('image-to-text', 'Xenova/texify2', {
      progress_callback: (info) => {
        self.postMessage({ type: 'progress', data: info });
      },
    });
    self.postMessage({ type: 'loaded' });
  }
  if (type === 'recognize' && texify) {
    const result = await texify(image);
    self.postMessage({ type: 'result', latex: result[0].generated_text });
  }
};
```

**注意：** `progress_callback` 是 `pipeline()` 的**第三個參數選項**，不是設在全域的 `env` 物件上。

**OCR 與貼文字路徑的覆蓋範圍現已對等：** 因為 0.8 節已經把 Parser 的必要範圍收斂成純符號樣式（不再需要解析「點在線段上」這類依賴中文語法的關係），texify2（一個以 LaTeX/數學符號為訓練目標的模型）的能力範圍與 Parser 的需求範圍完全吻合。老師裁切截圖時只需要框住符號密集區，中文可以整段排除在裁切範圍之外，不會遺漏任何 Parser 需要的資訊。

### 6.12 OCR 失敗的降級路徑

1. 模型載入失敗 → 引導至「手動貼上文字」
2. 識別結果為空 → 引導至「手動貼上文字」
3. 識別結果無法解析 → `unresolved` 顯示，引導至「手動連線」

---

## 七、MVP 完成後的下一步

|功能|優先度|備註|
|---|---|---|
|未命名剩餘區域的視覺化|★★|目前 MVP 明確不處理（見 0.7）|
|多組獨立疊圖（一張圖有多組不相關的形狀）|★★|需要 UI 上區分「這是哪一組」|
|匯出動畫 GIF|★★|老師可以放進簡報|
|`point-on-segment` 約束驗證（選配）|★|MVP 不做，見 §6.7；若要做，資料型別已預留|
|支援手寫公式 OCR|★|需整合其他模型|
|學生模式|★|讓學生自己操作|

---

## 八、給你的行動清單

- [ ] 1. 建 repo，選 GPL-3.0
- [ ] 2. Sprint 0：實作 `latexNormalizer.ts`，用真實語料驗證
- [ ] 3. Sprint 0：Tokenizer + Parser（含通用修飾詞逐子句跳過、`equal-angle`、`segment-length`、連等式拆解）
- [ ] 4. Sprint 0：Classifier 四分類實作
- [ ] 5. Sprint 0：`collectRequiredLabels` 實作
- [ ] 6. Sprint 0：**`resolveShapesFromStatements` 核心合成邏輯，這是最該優先驗證的部分**
- [ ] 7. Sprint 0：用真實掃描講義驗證四種情境（蝴蝶結、巢狀、equal-angle、只有約束條件）
- [ ] 8. Sprint 0：`connectivity.ts` 共用頂點偵測
- [ ] 9. 等老師回覆 2〜3 張圖 + 對應題幹文字
- [ ] 10. Sprint 1〜3：照上面走
- [ ] 11. Sprint 2.5 前置：用真實掃描檔做 OCR Spike
- [ ] 12. 部署到 GitHub Pages
- [ ] 13. 給老師試用

---

## 結論

這一版把核心模型從「系統自動切割幾何圖」改成「結構圖層（文字）× 座標圖層（點擊）直接合成」，並在第二輪真實語料驗證後進一步收斂了範圍：

- **不再需要三角剖分、繞向正規化、凸性檢查、自交檢查**——這些都是切割演算法特有的問題，在直接構造模型下不存在
- **老師的操作被簡化到最低限度**：只需要點擊 + 命名，一個字母一次，不用管順序、不用分組
- **結構永遠來自文字（或手動連線的等價輸入），座標永遠來自點擊**，兩者在合成前互不相依，方便獨立測試
- **文字圖層只負責座標點不出來的資訊**：分組與連線順序來自文字，「點在線段上」這類光靠座標就自然成立的事實不需要文字重複解析——這是第二輪語料驗證後最重要的範圍收斂（見 0.8）
- **系統不判斷、也不記錄任何幾何性質（是否相似、是否全等）**——這是老師教學的職責，不是這個工具的 scope；`similar` 型別因此從資料模型移除
- **Parser 的必要覆蓋範圍收斂成純符號樣式**（△／四邊形宣告、線段長度、角度值、平行、垂直、等角、等長，外加連等式拆解），中文可以整段當雜訊丟棄，不需要語意理解——這讓 texify2（LaTeX 導向的 OCR）的選型與 Parser 的實際需求完全吻合，OCR 路徑與貼文字路徑的覆蓋範圍不再有落差
- **用真實掃描講義驗證過四種情境**（蝴蝶結型、巢狀型、角相等型、只有約束條件），確認這個模型能處理實際教材裡的疊圖情境
- **手動連線是首選路徑之一，不是後備**（第 4 題就是最好的例子）
- **「只貼題幹」不是 bug，是系統該有的誠實行為**，UI 明確引導老師補貼子題或改用手動連線
- 總時程約 4.5〜5.5 週，比含三角剖分的版本更短，因為移除了一整條不必要的幾何演算法

現在就可以開始了。
