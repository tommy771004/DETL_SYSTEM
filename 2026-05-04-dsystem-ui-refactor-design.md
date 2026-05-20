# DSystem AI-ETL Platform — 全面 UI/UX 重構設計規格

**日期**：2026-05-04  
**版本**：1.0  
**方向**：方案 B —  現代化詮釋  
**範圍**：全部 11 個模組，設計一次到位，分階段實作

---

## 一、設計決策摘要

| 面向 | 決策 |
|------|------|
| 重構目標 | 視覺重設計 + UX 架構重組 + 功能完整性，全面對標  原始介面 |
| 視覺風格 | 深色主題為主，支援淺色模式切換（雙主題） |
| 國際化 | 全面 i18n，中文 / 英文即時切換（react-i18next） |
| Job Tree | 完整 CRUD + 右鍵選單 + 跨介面導航 |
| JF Designer | 混合式：Job 開啟畫布，頂部 Step Tabs，每個 Step 獨立 ETL 設計區 |
| 實作優先序 | Phase 1：三大核心介面；Phase 2：5 個功能模組；Phase 3：3 個治理模組 |

---

## 二、Design Token 系統與雙主題架構

### 2.1 Token 命名規範

所有顏色透過 CSS 自訂屬性（Custom Properties）定義，掛載於 `:root`，`[data-theme="dark"]` 為預設，`[data-theme="light"]` 為淺色覆蓋。

```css
/* 介面層 */
--surface-base        /* 主背景 */
--surface-raised      /* 卡片 / 面板 */
--surface-overlay     /* 側邊欄 / Header */
--surface-hover       /* 滑鼠懸停背景 */
--surface-active      /* 選取/激活背景 */

/* 邊框 */
--border-subtle       /* 細分隔線 */
--border-strong       /* 強調邊框 */
--border-focus        /* 焦點輪廓 */

/* 文字 */
--text-primary        /* 主要文字 */
--text-secondary      /* 次要文字 */
--text-muted          /* 提示 / 標籤 */
--text-inverse        /* 反色（按鈕文字） */

/* 品牌色 */
--accent-blue         /* 主要操作色 */
--accent-blue-dim     /* 藍色背景淡版 */
--accent-blue-text    /* 藍色文字 */

/*  狀態色（兩主題語意保持一致） */
--status-running-bg   /* 執行中背景 */
--status-running-fg   /* 執行中文字 */
--status-running-bar  /* 執行中進度條 / 色條 */
--status-waiting-bg   /* 等待中背景（粉紅） */
--status-waiting-fg
--status-waiting-bar
--status-success-bg   /* 成功背景（綠） */
--status-success-fg
--status-success-bar
--status-failed-bg    /* 失敗背景（紅） */
--status-failed-fg
--status-failed-bar
```

### 2.2 深色主題值

```css
[data-theme="dark"] {
  --surface-base: #0f1117;
  --surface-raised: #161b27;
  --surface-overlay: #1a2035;
  --surface-hover: #1e2a3a;
  --surface-active: #1e3a5f;
  --border-subtle: #1e2a3a;
  --border-strong: #2d3f53;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #4a5568;
  --accent-blue: #2563eb;
  --accent-blue-dim: #1e3a5f;
  --accent-blue-text: #60a5fa;
  /*  狀態色 */
  --status-running-bg: #0d1f35;  --status-running-fg: #93c5fd;  --status-running-bar: #3b82f6;
  --status-waiting-bg: #2d0a1e;  --status-waiting-fg: #f9a8d4;  --status-waiting-bar: #f472b6;
  --status-success-bg: #0a2118;  --status-success-fg: #6ee7b7;  --status-success-bar: #10b981;
  --status-failed-bg: #2d0a0a;   --status-failed-fg: #fca5a5;   --status-failed-bar: #ef4444;
}
```

### 2.3 淺色主題值

```css
[data-theme="light"] {
  --surface-base: #f8fafc;
  --surface-raised: #ffffff;
  --surface-overlay: #f1f5f9;
  --surface-hover: #e2e8f0;
  --surface-active: #dbeafe;
  --border-subtle: #e2e8f0;
  --border-strong: #cbd5e1;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent-blue: #2563eb;
  --accent-blue-dim: #dbeafe;
  --accent-blue-text: #1d4ed8;
  /*  狀態色（調整飽和度符合 WCAG AA） */
  --status-running-bg: #dbeafe;  --status-running-fg: #1e40af;  --status-running-bar: #1d4ed8;
  --status-waiting-bg: #fce7f3;  --status-waiting-fg: #9d174d;  --status-waiting-bar: #be185d;
  --status-success-bg: #d1fae5;  --status-success-fg: #065f46;  --status-success-bar: #065f46;
  --status-failed-bg: #fee2e2;   --status-failed-fg: #991b1b;   --status-failed-bar: #991b1b;
}
```

### 2.4 主題切換機制

- Header 右側 Sun / Moon icon 按鈕切換
- 狀態存入 `localStorage('dsystem-theme')`
- `index.html` 的 `<script>` 標籤在 body 渲染前讀取並套用（防止 FOUC）
- 全域 `transition: background-color 200ms, color 200ms, border-color 200ms`

---

## 三、i18n 架構

### 3.1 技術方案

採用 `react-i18next` + `i18next-browser-languagedetector`。

```
src/frontend/locales/
├── zh-TW/
│   ├── common.json      # 按鈕、標籤、狀態、錯誤訊息
│   ├── designer.json    # JF Designer 專屬文字
│   ├── console.json     # Task Console
│   ├── admin.json       # Admin UI
│   └── modules.json     # Metaman/Quality/MDM/Stream/UDM/IAM/Audit/DP
└── en/
    ├── common.json
    ├── designer.json
    ├── console.json
    ├── admin.json
    └── modules.json
```

### 3.2 切換機制

- Header 右側 `ZH / EN` 文字切換按鈕
- 呼叫 `i18next.changeLanguage()` 即時生效，無需重載
- 語言偏好存入 `localStorage('dsystem-lang')`

### 3.3  狀態標籤對照

| 狀態 | 英文 | 中文 |
|------|------|------|
| Waiting | Waiting | 等待中 |
| Running | Running | 執行中 |
| Success | Success | 成功 |
| Failed | Failed | 失敗 |
| Completed | Completed | 已完成 |

---

## 四、App Shell 佈局架構

### 4.1 整體三欄結構

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (52px)                                           │
│  [Logo] [麵包屑]          [ZH/EN] [☀/🌙] [狀態] [頭像]  │
├───────────┬──────────────────────────────────────────────┤
│           │  CONTENT HEADER (48px)                       │
│  LEFT     │  模組標題 + 麵包屑 + 操作按鈕                 │
│  SIDEBAR  ├──────────────────────────────────────────────┤
│  (240px   │                                              │
│  / 56px   │         MAIN CONTENT AREA                    │
│  折疊)    │                                              │
│           │                                              │
│  Nav 區   │                                              │
│  ──────   │                                              │
│  Job Tree │                                              │
└───────────┴──────────────────────────────────────────────┘
```

### 4.2 Header（52px）

- **左側**：Logo（Zap icon + "DSystem AI-ETL" + 版本徽章 v2.0）
- **右側**：語言切換（ZH/EN）→ 主題切換（Sun/Moon）→ Redis 狀態點 → WebSocket 狀態點 → 使用者頭像 Dropdown（顯示使用者名稱、角色、登出）
- **中央不顯示麵包屑**（麵包屑統一放置於 Content Header）

### 4.3 Left Sidebar

**折疊模式**：240px（展開）/ 56px（icon-only，Job Tree 隱藏）

**模組導航群組**：

| 群組 | 模組 |
|------|------|
|  Core | JF Designer、Task Console、Admin UI |
| Modules | Metaman、Data Quality、MDM、Streaming、UDM |
| Security & Governance | IAM、Audit、Data Protection |

**Job Hierarchy Tree**（下半部，flex-1，可捲動）：
- 分隔線區隔 Nav 與 Tree
- 頂端有「＋ 新增事業主體」按鈕
- 支援右鍵 Context Menu（詳見第五節）
- 選取 Job 後高亮顯示

### 4.4 Content Header（48px）

依 activeTab 動態切換（Content Header 是麵包屑與操作按鈕的唯一位置）：
- **JF Designer**：`[Entity] / [Category] / [Job 名稱]` 麵包屑 + Step Tabs + `+ 新增步驟` + `Job 屬性` + `測試執行` + `部署執行`
- **Task Console**：`Task Console — 作業執行監控` + `自動更新開關` + `手動重整` + `篩選`
- **Admin UI**：`Admin UI` 標題 + 次級子導覽（連線資源 / MetaMain / 代理節點 / 排程 / 系統設定）
- **其他模組**：模組名稱 + 模組專屬操作按鈕（如 `+ 新增規則`、`+ 新增串流`）

---

## 五、Job Tree — 完整 CRUD 與導航

### 5.1 資料結構

```typescript
interface TreeNode {
  id: string
  name: string
  type: 'entity' | 'category' | 'job'
  active?: boolean        // category: 排程開關
  agentId?: string        // job: 指定執行 Agent
  description?: string
  children?: TreeNode[]
}
```

狀態由前端 React state 管理，透過 REST API 與後端同步，支援樂觀更新。

### 5.2 節點視覺語言

| 層級 | 圖示 | 顏色 |
|------|------|------|
| Business Entity | `Briefcase` | 藍 #60a5fa |
| Category（展開） | `FolderOpen` | 黃 #fbbf24 |
| Category（折疊） | `Folder` | 黃 #fbbf24 |
| Job | `FileCode` | 綠 #34d399 |

Category 節點右側：ON/OFF 切換徽章（點擊即切換，不需右鍵）。

### 5.3 右鍵 Context Menu

**Entity 節點**：`+ 新增分類` / `重新命名` / `刪除事業主體`（二次確認）

**Category 節點**：`+ 新增作業` / `重新命名` / `切換排程開關` / `複製分類` / `刪除分類`（二次確認，警告含子 Job 數量）

**Job 節點**：`在設計器開啟` / `在監控台開啟` / `重新命名` / `複製作業`（對話框：目標分類 + 是否複製 Steps）/ `移動至…`（樹狀 Picker 彈窗）/ `刪除作業`（二次確認）

### 5.4 導航行為

| 操作 | 行為 |
|------|------|
| 點擊 Entity | 展開 / 折疊，主內容不變 |
| 點擊 Category | 展開 / 折疊，主內容不變 |
| 點擊 Job（單擊） | 高亮選取，主內容切換至 JF Designer，Header 更新麵包屑 |
| 右鍵 Job → 在監控台開啟 | 主內容切換至 Task Console，自動篩選該 Job |

### 5.5 Inline Rename

雙擊節點名稱 → 文字變為 `<input>` → Enter 確認 / Escape 取消 / 失焦自動確認。重複名稱顯示紅框驗證提示。

### 5.6 新增流程

`+ 新增作業` → 插入 inline rename 狀態新節點（預填 `New_Job`）→ Enter 後彈出 **Job 屬性對話框**：
- Agent 選擇（下拉）
- Retry Option（From Beginning / From Breakpoint）+ 間隔 + 最大重試次數
- Time Window（開始時間 / 結束時間）
- TX Date Setting
- Priority（1-199 滑桿）
- Bypass Error 開關
- Critical Job 開關
- Skip Missing Task 開關
- Only Apply Completed Task 開關
- Online / Offline Date Time

---

## 六、JF Designer — Step Tabs + ETL 畫布

### 6.1 整體佈局

```
┌─────────────────────────────────────────────────────────┐
│ CONTENT HEADER:  Corp_ETL / ETL_Jobs / nation_job        │
│  [Step 1: extract ×] [Step 2: transform ×] [+ 新增步驟] │
│                              [Job 屬性] [測試] [部署執行]│
├───────────┬─────────────────────────────────┬───────────┤
│  工具箱   │       ReactFlow ETL 畫布        │  屬性面板  │
│  (200px)  │   （目前選取 Step 的設計區）    │  (280px)  │
│           │                                 │           │
│  🔵READER │  [節點]──DQ──▶[節點]──DQ──▶[節點]│ 選取節點  │
│  🟣TRANS  │                                 │  設定表單  │
│  🟢WRITER │                                 │           │
└───────────┴─────────────────────────────────┴───────────┘
│  [▲ 執行日誌]（可展開/折疊，預設折疊，36px）             │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Step Tabs

- 每個 Tab 顯示：Step 類型 icon + Step 名稱 + `×`（hover 才顯示）
- Tab 可拖拉重排（決定執行順序）
- `+ 新增步驟` 開啟 Step 類型選擇對話框

**Step 類型清單**（對應  10 種類型）：

| 類型 | 描述 | 介面 |
|------|------|------|
| Data Management | ETL 資料流設計 | ReactFlow 畫布 |
| External Command | 外部指令執行 | 表單（指令輸入、Working Dir、環境變數） |
| SQL Script | 資料庫 SQL 腳本 | 程式碼編輯器 |
| FTP 傳輸 | 檔案上傳 / 下載 | 表單（來源、目的、模式） |
| Mail 通知 | 寄送電子郵件 | 表單（收件人、主旨、內容、附件） |
| REST API 呼叫 | HTTP GET/POST/PUT/DELETE | 表單（URL、Header、Body、Auth） |
| Recovery DM | 斷點續傳 ETL | ReactFlow 畫布（繼承 DM 設計） |
| SQL Report | SQL 結果產出報表 | 表單 + SQL 編輯器 |
| Big Data | Hadoop 任務 | 表單（需授權） |

### 6.3 工具箱（200px，可折疊）

含搜尋框，分三區段：

**READER（藍色 #60a5fa）**：
- JDBC 讀取器（jdbc_reader_generic）
- CSV 讀取器（file_reader_csv_format）
- API 來源（source_api）
- NoSQL 來源（source_nosql）
- Kafka 來源（source_kafka）

**TRANSFORMER（紫色 #c084fc）**：
- 欄位轉換器（transformer）
- SQL Execute（sql_execute）
- Local Join（local_join）
- Data Router（data_router）
- 自訂腳本（custom_script）
- AI 轉換（transform_ai）

**WRITER（綠色 #34d399）**：
- JDBC 寫入器（jdbc_writer_generic）
- Bulk Load 寫入器（bulk_load_writer）
- CSV 寫入器（file_writer_csv）
- 文字檔寫入器（file_writer_text_file）

### 6.4 節點外觀（CustomNode 升級）

- 頂部色條 3px：Reader=藍、Transformer=紫、Writer=綠
- 節點體：類型 icon（左）+ 節點名稱（粗體）+ 狀態徽章（右）
- 節點底部小字：關鍵設定摘要（如 `local_TP → nation` / `delimiter: ,`）
- 狀態徽章：`未設定`（灰）/ `已設定`（藍）/ `執行中`（藍動畫）/ `錯誤`（紅）

**Data Queue（DQ）連線外觀**：
- 灰色虛線 + 動畫（`stroke-dasharray` 流動效果）
- 點擊 DQ 線段 → 右側面板顯示分流條件設定（Data Router 後的 DQ 才可設定條件）

### 6.5 屬性面板（280px，右側）

點擊節點後渲染對應表單：

**JDBC 讀取器**：
- Connection 下拉（來自 Admin 已定義連線）
- Database / Table 串聯下拉
- SQL Editor（CodeMirror，支援 SQL 語法高亮）
- `Import Meta Column` 按鈕
- 欄位清單預覽（可調整欄位名稱、類型、長度）

**欄位轉換器（Transformer）**：
- 輸入欄位列表（唯讀，來自上游）
- 輸出欄位列表（可新增 / 刪除 / 排序）
- 每個輸出欄位右側 `Edit Rule` 按鈕 → **Rule 編輯器 Modal**：
  - 內建函式庫（decode、trim、日期轉換、數學運算、字串處理）
  -  內建變數（`${TXDATE}`、`${TXDATE1}`、`${TX2Y}` 等）
  - 即時語法驗證

**CSV 讀取器**：
- 檔案路徑（Assign File / Receive File 模式切換）
- 分隔符號（Delimiter）
- 起始列（Start Record Line，預設 2 跳過表頭）
- 編碼（UTF-8 / Big5 / GBK）
- `Import Meta Column`

**Local Join**：
- Left 來源（上游連接點 1）/ Right 來源（上游連接點 2）
- Join 類型：Normal（Inner）/ Left / Right / Full
- Join Condition：左右 Key 欄位對映（名稱不同時手動輸入）
- Output Column：勾選輸出欄位 + 順序調整
- 效能模式：Join In Memory / Page（可選 Compress）

**Data Router**：
- 輸出路徑數量（最多 16 路）
- 各路徑顯示連接的 DQ 及其條件摘要

**SQL Execute**：
- Connection 下拉
- Run Mode：Before / After / Within
- SQL 編輯器（支援 `.output` 指令語法高亮）
- `Set Column Meta` 按鈕（反白 SQL 後自動擷取欄位定義）

### 6.6 Job 屬性 Drawer

Content Header 的「Job 屬性」按鈕 → 右側滑入 Drawer（含所有  Job Attributes，詳見 5.6 節）

---

## 七、Task Console 重設計

### 7.1 整體佈局

```
┌──────────────────────────────────────────────────────────┐
│ CONTENT HEADER:  Task Console — 作業執行監控             │
│  [自動更新 ●ON]  最後更新：14:32:05  [手動重整] [篩選▼]  │
├──────────────┬───────────────────────────────────────────┤
│  左側篩選樹  │  [看板] [列表] [時間軸]    主內容區        │
│  (200px)     │  ──────────────────────────────────────── │
│              │  依選取視圖渲染                            │
│  ▶ Corp_ETL  │                                           │
│    ▶ETL_Jobs │                                           │
│      nation  │                                           │
└──────────────┴───────────────────────────────────────────┘
│  底部資源列（36px）：Worker | Queue 深度 | Redis | Leader│
└──────────────────────────────────────────────────────────┘
```

### 7.2 三種檢視模式

**① 看板視圖（Kanban）**：
- 四欄：等待中 / 執行中 / 已完成 / 失敗
- 維持  色彩語意（粉紅 / 深藍 / 綠 / 紅）
- Job Card 升級：名稱 + Pipeline ID + 執行耗時 + 進度條（執行中）+ 讀寫筆數摘要（已完成）+ 錯誤訊息 + Retry 按鈕（失敗）
- 卡片間移動觸發 fly-across 動畫
- 新 Job 進入以 slide-in 動畫出現

**② 列表視圖（List）**：
- 表格欄位：狀態徽章 | Job 名稱 | Pipeline ID | 開始時間 | 耗時 | 嘗試次數 | 操作
- 可排序（點擊欄標題）
- 分頁（每頁 20 筆）
- 行展開：完整 Log Viewer（三層 Tab：概覽 / 步驟 / 輸出日誌）
- 失敗行紅底，直接提供「重試」按鈕

**③ 時間軸視圖（Timeline）**：
- 橫向甘特圖，X 軸為時間，每 Job 一列
- 色塊填滿執行時段（顏色對應狀態）
- 懸停顯示詳細 Tooltip（Job 名稱、開始/結束時間、狀態）

### 7.3 Job 詳細 Log Drawer

點擊 Job Card「查看日誌」→ 右側滑入 Drawer（640px）：

| Tab | 內容 |
|-----|------|
| 概覽 | Job 屬性（名稱、Agent、Priority、Retry 設定） |
| 步驟 | 每個 Step 的狀態、開始/結束時間、耗時 |
| 輸出日誌 | 完整 Output Log（monospace，支援關鍵字搜尋、自動捲動） |

### 7.4 底部系統資源列（36px 固定）

```
Worker 節點：3/5 活躍 | Queue 深度：12 | Redis 延遲：2ms | Leader：node-01 | 今日完成：148 | 失敗率：1.3%
```

---

## 八、Admin UI 完整重設計

Admin UI 進入後，Content Header 切換為次級子導覽（五個區塊）。

### 8.1 連線資源管理（Resource）

- 表格：名稱 / 類型 / 主機端點 / Schema / 狀態 / 操作（測試、編輯、刪除）
- `+ 新增連線` → Create Connection Drawer：
  - 類型選擇（JDBC / FTP / Mail / NoSQL / Hadoop / Cloud）
  - 依類型動態渲染表單
  - JDBC：驅動（PostgreSQL / MySQL / Oracle / DB2 / Teradata）+ URL / Host / Port / 帳號 / 密碼 / Schema
  - `測試連線` 即時回饋（通過才啟用「儲存」按鈕）
- 連線名稱點擊：顯示使用此連線的所有 Job 相依性清單

### 8.2 MetaMain（元數據管理）

三層：Meta Database → Meta Table → Layout（欄位定義）

欄位編輯器（Layout）：

| # | 欄位名稱 | 資料類型 | 長度 | Key | 可空 | 操作 |
|---|----------|----------|------|-----|------|------|
| 1 | cust_id | VARCHAR | 20 | ✓ | ✗ | ✎ ✕ |

三種匯入方式：
- **匯入 CSV**：上傳 → 預覽 → 設定（分隔符號 / 編碼 / 表頭）→ 確認
- **匯入 DB Schema**：選連線 → 搜尋 Table → 勾選匯入
- **手動新增**：Inline 輸入列

### 8.3 代理節點管理（Agent）

Card 式節點列表，顯示：OS / IP / 並行數 / CPU% / RAM%  
Leader 節點顯示金色王冠徽章；Standby 顯示灰色盾牌。

Virtual Agent 設定：多實體 Agent 組合為虛擬群組，模式：Load Balance / Redundant。

### 8.4 排程設定（Scheduler）

Cron 排程列表，欄位：Job 名稱 / Cron 表達式 / 人類可讀描述 / 下次執行 / 狀態 / 操作

`+ 新增排程` Drawer：Job 選擇（樹狀 Picker）+ Cron 表達式輸入 + 即時預覽下次 5 次執行時間 + Time Window

### 8.5 系統設定（Settings）

- **全域變數**：Key-Value 表格（供所有 Job `${VARIABLE}` 使用）
- **通知設定**：SMTP 設定 + 告警規則（失敗 N 次 → 寄信）
- **系統資訊**：版本 / Node.js 版本 / Redis 版本 / 啟動時間（唯讀）

---

## 九、11 個模組儀表板規格

### 9.1 共用模組框架

每個模組頁面結構：
1. **KPI 卡列**（頂部，4-5 個指標卡）
2. **主要內容區**（Table / Chart / Canvas，視模組而定）
3. **右側操作**（Drawer 式，點擊觸發）

### 9.2 Metaman — 資料血緣與元數據

**KPI**：Meta Table 數 / 追蹤欄位數 / 資料來源數 / 最後更新

**血緣圖 Tab**：ReactFlow 渲染資料流向圖（Table 為節點，欄位對映為邊），支援縮放、全螢幕、匯出 PNG

**Metadata Browser Tab**：
- 樹狀瀏覽（Meta DB → Table → 欄位）
- 跨 Table 欄位全文搜尋
- Data Profiling 按鈕：空值率、唯一值數、最大/最小值

### 9.3 Data Quality — 資料品質

**KPI**：規則總數 / 通過率 / 今日驗證次數 / 告警數

**規則管理 Table**：規則名稱 / 目標 Table / 規則類型 / 通過率 / 最後執行 / 狀態

規則類型：非空值 / 唯一性 / 範圍 / 正則格式 / 跨表參照完整性 / 自訂 SQL 斷言

**趨勢圖**：7日 / 30日通過率折線圖

### 9.4 Master Data Management（MDM）

**KPI**：主資料實體數 / 重複記錄數 / 合併次數（今日）/ 待審核數

**實體管理 Tab**：主資料清單，點擊記錄 → Drawer 顯示完整欄位 + 變更歷史時間軸

**重複偵測 Tab**：疑似重複記錄對（相似度分數），提供合併 / 標記不重複操作

**合併規則 Tab**：設定欄位合併時的優先來源策略

### 9.5 Streaming Engine — 即時串流

**KPI**：活躍串流數 / EPS / 平均延遲（ms）/ 錯誤率

**串流管線 Card 列表**：名稱 / 來源 / 目的 / EPS / 延遲 / 操作（暫停、日誌、設定）

**即時監控圖**：選取串流後顯示 60 秒滾動視窗折線圖（EPS + 延遲），WebSocket 推送更新

**建立串流 Drawer**：來源（Kafka / WebSocket / HTTP Stream）+ 目的地 + 轉換規則 + 背壓設定

### 9.6 Unstructured Data（UDM）

**KPI**：已處理文件數 / 擷取欄位數 / 支援格式數 / 今日新增

**文件來源 Table**：來源名稱 / 類型 / 路徑 / 狀態 / 文件數

**擷取規則 Drawer**：
- PDF：頁碼範圍 / 表格擷取 / 正則抽取
- 網頁：CSS Selector / XPath / 多頁規則
- Word / Excel：工作表選擇 / 欄位對映

**擷取結果預覽**：JSON 樹狀結構預覽，可直接對映至 Meta Table

### 9.7 IAM & Security

**KPI**：使用者總數 / 角色數 / 今日登入次數 / 待審核申請數

**使用者管理 Tab**：Table（使用者 / 角色 / 上次登入 / 狀態 / 操作）

**角色管理 Tab**：RBAC 矩陣視圖

| 角色 | JF Designer | Task Console | Admin UI | Metaman |
|------|-------------|--------------|----------|---------|
| Superuser | ✅ | ✅ | ✅ | ✅ |
| Administrator | ✅ | ✅ | ✅ | ✅ |
| Developer | ✅ | 👁️ | ✗ | 👁️ |
| Operator | ✗ | ✅ | ✗ | 👁️ |
| Viewer | 👁️ | 👁️ | ✗ | 👁️ |

**權限申請 Tab**：待審核清單，Approver 一鍵批准 / 拒絕

### 9.8 Audit Logs

**KPI**：今日事件數 / 警告事件數 / 高風險操作數 / 涉及使用者數

**時間軸式 Log 列表**：時間 / 使用者 / 操作類型 icon / 描述 / 模組來源 / 風險等級

篩選：時間範圍 / 使用者 / 操作類型 / 模組 / 風險等級

匯出：CSV / JSON，支援自訂時間範圍

### 9.9 Data Protection

**KPI**：遮罩欄位數 / PII 偵測欄位數 / 今日遮罩操作數 / 合規報告數

**PII 偵測 Tab**：選 Meta Table → AI 自動掃描 → 標記 PII 欄位（含信心分數），可確認或忽略

**遮罩規則 Tab**：欄位 / PII 類型 / 遮罩方式 / 目標環境 / 狀態

遮罩方式：部分遮罩 / 隨機替換 / 固定替換 / 雜湊 / 加密

**合規報告 Tab**：一鍵產生 GDPR / PDPA 合規報告（PDF），含 PII 欄位清單 + 遮罩覆蓋率

---

## 十、實作分階規劃

### Phase 1（三大核心介面）
1. Design Token 系統 + 雙主題切換
2. i18n 框架建置（react-i18next + 語系檔）
3. App Shell 重構（Header + Sidebar 折疊 + Content Header）
4. Job Tree CRUD（右鍵選單 + inline rename + 新增 Job 對話框）
5. JF Designer 重構（Step Tabs + 工具箱 + 節點升級 + 屬性面板）
6. Task Console 重構（三種視圖 + WebSocket 動畫 + Log Drawer）
7. Admin UI 重構（五個子區塊完整 CRUD）

### Phase 2（功能模組）
8. Metaman（血緣圖 + Metadata Browser + Data Profiling）
9. Data Quality（規則管理 + 趨勢圖）
10. MDM（實體管理 + 重複偵測 + 合併規則）
11. Streaming Engine（串流管線 + 即時監控圖）
12. UDM（文件來源 + 擷取規則 + 結果預覽）

### Phase 3（治理模組）
13. IAM（使用者管理 + RBAC 矩陣 + 權限申請）
14. Audit Logs（時間軸 Log + 篩選 + 匯出）
15. Data Protection（PII 偵測 + 遮罩規則 + 合規報告）

---

## 十一、技術依賴新增

| 套件 | 用途 |
|------|------|
| `react-i18next` | i18n 框架 |
| `i18next-browser-languagedetector` | 語言自動偵測 |
| `@codemirror/lang-sql` | SQL 編輯器語法高亮 |
| `recharts` | 趨勢圖 / 即時監控圖（API 簡單，與 React 整合佳）|
| `@dnd-kit/core` + `@dnd-kit/sortable` | Step Tab 拖拉重排（現代輕量，替代 react-dnd）|

現有依賴（維持）：`@xyflow/react`、`dagre`、`tailwindcss`、`lucide-react`、`socket.io-client`
