# CLAUDE.md — AI-ETL Platform (DSystem) 架構指引

本文件提供 AI 助手（如 Claude）了解此專案的完整架構脈絡，以便精確地協助程式開發、除錯及功能擴充。

---

## 專案概覽

**ai-etl-platform** 是一個仿照  企業資料整合架構設計的全端 ETL 平台，具備：

- **視覺化 Pipeline 編輯器**（React + ReactFlow）
- **分散式 DAG 執行引擎**（Node.js + TypeScript）
- **企業級排程控制系統 JCS**（BullMQ + Redis，Active-Standby 高可用）
- **事件驅動觸發機制**（FTP Inbox 檔案監控）
- **即時狀態推播**（Socket.IO WebSocket）
- **插件式節點系統**（Open-Closed Principle，可動態擴充）

---

## 技術堆疊

| 分層 | 技術 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| UI 組件 | Tailwind CSS v4、Radix UI、Lucide React |
| Pipeline 視覺化 | @xyflow/react (React Flow) |
| 後端框架 | Express.js + TypeScript（Node.js ESM，`"type": "module"`）|
| 任務佇列 | BullMQ v5 |
| 快取 / 分散式鎖 | Redis（ioredis v5）|
| 即時通訊 | Socket.IO v4 |
| AI 轉換節點 | Google Gemini SDK（`@google/genai`）|
| CSV 解析 | csv-parser |
| 啟動命令 | `node --experimental-strip-types server.ts` |

---

## 專案結構

```
DSystem/
├── server.ts                     # 主入口：Express + Socket.IO + JCS + 插件註冊
├── vite.config.ts                # Vite 前端建置設定
├── package.json
├── ftp_inbox/                    # 事件驅動監聽目錄（模擬 FTP 落地檔）
│   └── sample_file.csv
└── src/
    ├── backend/
    │   ├── api/
    │   │   └── pipelineRoutes.ts # REST API 路由 + JCSController 初始化
    │   ├── core/
    │   │   └── DAGParser.ts      # 拓撲排序 (Kahn's Algorithm)，偵測循環依賴
    │   ├── engine/
    │   │   ├── types.ts          # 全域型別定義（PipelineConfig、IPluginNode 等）
    │   │   ├── Orchestrator.ts   # 核心調度引擎，執行 DAG 流程
    │   │   ├── DataQueue.ts      # 非同步資料佇列（背壓控制）
    │   │   ├── NodeRegistry.ts   # 插件系統核心（Singleton）
    │   │   ├── CheckpointManager.ts  # 斷點續傳（Redis 儲存）
    │   │   ├── SandboxExecutor.ts    # Node.js vm 沙盒執行器
    │   │   └── VariableInjector.ts   # ${VARIABLE} 變數替換引擎
    │   ├── jcs/
    │   │   ├── JCSController.ts      # 排程控制器（Leader 角色派發任務）
    │   │   ├── JCSWorker.ts          # 分散式工作節點（從 Redis 取任務執行）
    │   │   ├── LeaderElection.ts     # Redis SETNX 分散式鎖（Active-Standby）
    │   │   └── EventDrivenFileMonitor.ts  # 檔案事件驅動觸發 + MD5 驗證
    │   ├── plugins/nodes/
    │   │   ├── BasicNodes.ts         # SourceApiNode、TransformAINode、DestDbNode
    │   │   ├── CustomScriptNode.ts   # 使用者自訂 JS 腳本節點（沙盒執行）
    │   │   └── SourceCSVNode.ts      # CSV 檔案來源節點
    │   └── websocket/
    │       └── socketManager.ts      # Socket.IO 初始化與 Job Room 廣播
    └── frontend/
        ├── main.tsx
        ├── App.tsx
        └── components/
            ├── PipelineCanvas.tsx    # ReactFlow DAG 視覺化編輯器
            └── JcsDashboard.tsx      # JCS 監控儀表板（每 5 秒輪詢）
```

---

## 資料流動路徑

```
觸發來源
  ├── Webhook POST /api/pipelines/:id/trigger
  └── EventDrivenFileMonitor（偵測 ftp_inbox/ 新檔案）
          │
          ▼
    JCSController（Leader 節點）
    ── 利用 Redis SETNX LeaderElection，只有 Leader 才派發 Cron
    ── dispatchJob() → BullMQ Queue（jcs-jobs）
          │
          ▼
    JCSWorker（可多節點，concurrency=5，lockDuration=30s）
    ── 從 Redis Queue 取任務
    ── 實例化 Orchestrator（傳入 onProgress 回調 → BullMQ job.updateProgress）
          │
          ▼
    Orchestrator
    ── mergedVariables = pipeline.variables + dynamicPayload
    ── DAGParser.getExecutionOrder()（拓撲排序）
    ── 為每個節點建立 DataQueue（inputQueue / outputQueue）
    ── 啟動 Edge Router（非同步消費 outputQueue → 分發至各 target inputQueue）
    ── 逐節點呼叫 pluginRegistry.getNodeHandler(type).execute(...)
          │
          ▼
    Plugin Node 執行（Reader → DataQueue → Transformer → DataQueue → Writer）
    ── injectVariables() 替換 config 中 ${VAR} 變數
    ── CheckpointManager 可儲存節點輸出至 Redis（斷點續傳）
          │
          ▼
    QueueEvents（BullMQ）→ socketManager.broadcastToJob()
    ── progress → node-progress 事件
    ── completed → pipeline-completed 事件
    ── failed → pipeline-failed 事件
          │
          ▼
    前端 Socket.IO Client 接收即時狀態更新
```

---

## 核心模組說明

### `Orchestrator`（`engine/Orchestrator.ts`）
- Pipeline 主執行引擎，接受 `PipelineConfig`、`jobId`、`isTestRun`、`onProgress` 回調。
- 使用 `DAGParser` 取得拓撲排序後的節點執行順序。
- 為每個節點建立獨立的 `inputQueue` 與 `outputQueue`（`DataQueue` 實例）。
- Edge Router 以非同步方式消費 outputQueue，根據 `edge.condition` 動態路由資料至下游節點。
- 支援 `vm` 沙盒動態估值 edge 條件表達式（如 `vars.count > 100`）。
- `isTestRun = true` 時，在 `/api/pipeline/test-run` 路由中直接使用，不透過 BullMQ。

### `DAGParser`（`core/DAGParser.ts`）
- Kahn's Algorithm 拓撲排序，同時偵測循環依賴並拋出錯誤。
- 輸入 `PipelineConfig`，輸出排序後的 `PipelineNode[]`。

### `DataQueue`（`engine/DataQueue.ts`）
- 非同步記憶體緩衝佇列，`highWaterMark` 預設 5000 筆（背壓控制）。
- `push(records[])` — 上游寫入資料，超過水位則等待。
- `end()` — 標示資料輸入完畢。
- `destroy(err)` — 錯誤終止。
- `consume(chunkSize)` — AsyncGenerator，供下游節點逐批消費。

### `NodeRegistry`（`engine/NodeRegistry.ts`）
- Singleton 插件管理器。
- `registerNode(IPluginNode)` — 手動註冊節點插件。
- `scanAndRegister(dir)` — 動態掃描目錄並自動實例化所有符合 `IPluginNode` 介面的類別。
- `getNodeHandler(type)` — 取得節點實作，找不到則拋出錯誤。

### `IPluginNode`（`engine/types.ts`）
所有節點插件必須實作的介面：
```typescript
interface IPluginNode {
  type: string;
  category: 'reader' | 'transformer' | 'writer';
  execute(
    config: Record<string, any>,
    inputQueue: DataQueue | null,
    outputQueue: DataQueue | null,
    variables: Record<string, any>
  ): Promise<void>;
}
```
- `reader`：`inputQueue` 為 null，負責產生資料並寫入 `outputQueue`。
- `transformer`：從 `inputQueue` 消費，處理後寫入 `outputQueue`。
- `writer`：`outputQueue` 為 null，從 `inputQueue` 消費並寫入目標系統。

### `SandboxExecutor`（`engine/SandboxExecutor.ts`）
- 使用 Node.js `vm` 模組建立受限執行環境。
- 遮蔽 `process`、`require`、`global`、`setTimeout` 等危險 API。
- 執行逾時保護：3000ms（防止無窮迴圈鎖死 Event Loop）。
- 使用者腳本必須以 `module.exports = function(data, vars) { return data; }` 形式導出。

### `CheckpointManager`（`engine/CheckpointManager.ts`）
- 靜態工具類別，以 `checkpoint:{jobId}:{nodeId}` 為 Redis key 儲存節點輸出。
- `saveCheckpoint` / `getCheckpoint` / `clearCheckpoints`。
- 注意：大量資料應改為儲存至 S3 或資料庫，此處僅示範序列化至 Redis。

### `VariableInjector`（`engine/VariableInjector.ts`）
- 純函數 `injectVariables(config, variables)`，遞迴替換物件中所有 `${VAR_NAME}` 佔位符。
- 在 Orchestrator 中於節點執行前呼叫，將 Pipeline 全域變數與動態 Payload 注入節點 config。

### `JCSController`（`jcs/JCSController.ts`）
- 中央排程控制器，初始化 BullMQ `Queue('jcs-jobs')` 與 `LeaderElection`。
- `start()` — 啟動 Leader 競選 + 定時（10秒）掃描 Cron 排程（目前為 stub，需接 DB）。
- `dispatchJob(pipelineId, payload)` — 推入 BullMQ，設定 `attempts: 3`、指數退避重試、`removeOnComplete: true`。
- **全域實例**：在 `pipelineRoutes.ts` 建立並匯出 `export const jcsController`，供 `EventDrivenFileMonitor` 等跨模組使用。

### `JCSWorker`（`jcs/JCSWorker.ts`）
- 分散式工作節點，監聽 `jcs-jobs` 佇列，`concurrency: 5`。
- `lockDuration: 30000`（30秒），超時未回應則任務自動釋放，由其他節點接手（端點互備援）。
- 從 `job.data.payload.config` 取得 `PipelineConfig` 並執行 `Orchestrator`。
- 進度透過 `job.updateProgress()` 回報，由 `server.ts` 中的 `QueueEvents` 橋接至 Socket.IO。

### `LeaderElection`（`jcs/LeaderElection.ts`）
- 基於 `Redis SET key value EX ttl NX` 實作 Active-Standby 分散式鎖。
- TTL = 10 秒，每 5 秒（TTL/2）嘗試更新鎖，確保 Leader 連線正常時不被搶占。
- 優雅關閉（`stop()`）時以 Lua 腳本原子性釋放鎖，讓 Standby 立刻接管。

### `EventDrivenFileMonitor`（`jcs/EventDrivenFileMonitor.ts`）
- 使用 `fs.watch` 監聽 `ftp_inbox/` 目錄（生產環境建議改用 `chokidar`）。
- 新檔案到達後 1 秒延遲（等待寫入完成），驗證檔案大小 > 0 及計算 MD5。
- 驗證通過後，組裝含 `event_trigger: 'file_arrival'`、`file_path`、`file_md5` 的 Payload，呼叫 `jcsController.dispatchJob()` 自動觸發下游 Pipeline。

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/api/pipelines/:pipelineId/trigger` | Webhook 觸發，`req.body` 為動態 Payload，含 `config` 與 `variables` |
| `GET` | `/api/jcs/jobs` | 回傳 `{ waiting, active, completed, failed }` 各狀態 Job 列表 |
| `GET` | `/api/jcs/jobs/:jobId/logs` | 取得特定 Job 執行日誌（需對照 `pipelineRoutes.ts` 確認是否已實作）|
| `POST` | `/api/pipeline/test-run` | 開發沙盒執行，`req.body.config` 為 PipelineConfig，跳過 BullMQ 同步執行 |
| `GET` | `/api/health` | 健康檢查，回傳 `{ status: 'ok', time }` |

---

## 前端架構

### `PipelineCanvas`（`frontend/components/PipelineCanvas.tsx`）
- ReactFlow 拖拉式 DAG 視覺化編輯器。
- `compilePipeline()` — 將 React Flow 的 `nodes[]` + `edges[]` 編譯為 `PipelineConfig` JSON。
- 透過 `onSaveConfig(config)` 回調將 Pipeline 設定傳遞至父元件。
- 預設節點：`Source API → AI Transform → Custom Script → Dest DB`。

### `JcsDashboard`（`frontend/components/JcsDashboard.tsx`）
- 每 5 秒輪詢 `/api/jcs/jobs`，顯示 Waiting / Active / Completed / Failed 各區塊。
- 以色彩條（`statusColor`）區分 Job 狀態。

---

## 插件節點清單

| 類別 | type 字串 | 說明 |
|------|-----------|------|
| Reader | `source_api` | 模擬 API 資料抓取，輸出 mock 陣列（可替換為真實 fetch）|
| Reader | `source_csv` | 從指定 `filePath` 讀取 CSV 並串流推入 DataQueue |
| Transformer | `transform_ai` | 呼叫 Google Gemini API 進行資料轉換（config: `prompt`、`apiKey`）|
| Transformer | `custom_script` | 以 SandboxExecutor 執行使用者自訂 JS，`module.exports = fn(data, vars)` |
| Writer | `dest_db` | 模擬多執行緒併發寫入資料庫（config: `table`、`chunkSize`、`maxConcurrency`）|

---

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `REDIS_HOST` | `127.0.0.1` | Redis 主機位址 |
| `REDIS_PORT` | `6379` | Redis 連接埠 |
| `PORT` | `3000` | Express HTTP 伺服器監聽埠 |
| `GEMINI_API_KEY` | —（必填）| Google Gemini API 金鑰，用於 `TransformAINode` |

---

## 開發與執行

```bash
# 安裝依賴
npm install

# 啟動後端（需先啟動 Redis）
npm start   # node --experimental-strip-types server.ts

# 啟動前端開發伺服器
npm run dev  # vite

# 建置前端靜態資源（供後端服務）
npm run build
```

---

## 重要設計原則與注意事項

1. **ESM 模組**：所有 `import` 路徑必須加上 `.js` 副檔名（即使原始碼為 `.ts`），因為 `"type": "module"` 啟用 Node.js ESM 模式。

2. **插件新增流程**：
   - 在 `src/backend/plugins/nodes/` 建立新檔案，實作 `IPluginNode` 介面（`type`、`category`、`execute`）。
   - 在 `server.ts` 呼叫 `pluginRegistry.registerNode(new YourNode())` 手動註冊，或確保 `scanAndRegister()` 能自動掃到。

3. **DataQueue 消費規則**：Writer 節點消費完 inputQueue 後，不需要呼叫 `outputQueue.end()`（Writer 的 outputQueue 為 null）；Reader 節點推送完資料後**必須**呼叫 `outputQueue.end()`，否則下游節點將永久等待。

4. **BullMQ 與 Redis 依賴**：所有 JCS 功能（`JCSController`、`JCSWorker`、`LeaderElection`、`CheckpointManager`）皆依賴本地或遠端 Redis。無 Redis 時，`/api/pipeline/test-run` 路由仍可獨立運作（繞過 BullMQ）。

5. **SandboxExecutor 限制**：`vm` 沙盒無法完全隔離所有攻擊向量（與 `isolated-vm` 相比）。若需生產級安全隔離，應替換為 `isolated-vm` 或獨立子進程。

6. **Socket.IO CORS**：目前 `origin: '*'` 允許所有來源，生產環境應限制為特定前端網域。

7. **PipelineConfig 格式**：Webhook 觸發時，`req.body` 應包含 `{ config: PipelineConfig, variables: Record<string, any> }`，其中 `config` 為完整的 Pipeline JSON（可由前端 `PipelineCanvas.compilePipeline()` 產生）。
