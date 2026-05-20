# 分散式部署與高可用性架構設計 (Distributed Deployment & HA Architecture)

## 1. 系統部署架構總覽 (System Architecture Overview)
本資料整合平台專為企業級混合環境（On-Premises 本地端伺服器與 Private Cloud 私有雲）設計。架構採用 **Controller-Worker (Master-Slave)** 模式，確保核心管理單元與資料執行單元解耦，以實現高可用性 (High Availability, HA) 與水平擴展 (Horizontal Scalability)。

### 1.1 核心元件
- **HAProxy / Load Balancer**: 負責接收外部 API 請求並將請求分發至目前處於 Active 狀態的 Controller。
- **Controller (中央管理伺服器)**: 負責維護排程 (Cron)、提供 API 介面、管理 IAM、派發分散式任務至 Job Queue (透過 Redis / BullMQ)。
- **Worker (分散式執行節點)**: 訂閱 Redis Queue 中的 Task，實際執行 DAG Pipeline、資料轉換、來源端抽取與目的端寫入。
- **Redis (Cluster / Sentinel)**: 負責儲存分散式 Job Queue 與執行狀態，扮演系統中的高速訊息匯流排。
- **PostgreSQL / RDBMS**: 儲存 Metadata、Pipeline 結構、集中式防篡改稽核日誌 (Audit Log) 與系統 IAM 設定。

---

## 2. Active-Standby 雙機熱備援 (Controller HA)
Controller 節點採用 **Active-Standby (主從備援)** 模式，以避免單點故障 (Single Point of Failure, SPOF)：

- **選主機制 (Leader Election)**: Controllers 透過 Redis 分散式鎖 (Distributed Lock) 進行心跳偵測與選主。僅有取得鎖的 Active Controller 可以觸發排程器與寫入核心日誌，Standby Controller 則保持連線與狀態同步但不主動干預。
- **故障轉移 (Failover)**: 若 Active Controller 無預警停機或網路斷線，Standby Controller 將在數秒內未能取得心跳後，自動搶佔 Redis 鎖並提升為 Active 狀態，無縫接管所有管理與派程工作。載入平衡器 (HAProxy) 也會透過 health check 即時將流量導向健康的節點。

---

## 3. Worker 節點的互相容錯與接管 (Worker Fault Tolerance)
Worker 群組專注於繁重的資料處理任務，具備高度容錯機制：

- **無狀態設計 (Stateless)**: Worker 節點本身不保存工作狀態，所有進度、變數與 Log 皆即時回報至 Redis (由 BullMQ 狀態機管理)。
- **自動重試與接管 (Auto-Retry & Reclaim)**: 當某個 Worker 在處理任務期間斷線、OOM 崩潰或網路逾時，Redis 內的 Stalled Job Checker 機制會偵測到該任務逾時未發送 heartbeat，進而自動將該任務退回 Queue 中，由其他存活的 Worker 接管處理 (容錯轉移)，確保任務不遺失 (At-Least-Once Delivery)。
- **水平擴展 (Horizontal Scaling)**: 企業可彈性地在私有雲或本地端機房隨時增加或移除 Worker 節點，新節點啟動後自動向 Redis 註冊並開始分擔負載，無須修改任何 Controller 設定或重啟系統。

---

## 4. 混合環境部署 (On-Premises & Private Cloud)
所有微服務元件皆已容器化 (Dockerized)。可使用 Kubernetes (Helm Charts) 或輕量級 Docker Compose 在跨網段環境中部署。

- **On-Premises (地端機房)**: 在高合規要求的資料庫網段中部署少數 Worker，負責受限資料的存取。
- **Private Cloud (私有雲)**: 部署 Controller 與彈性的 Worker 集群，與地端 Worker 共用同一個 Redis 叢集進行工作分派，打破內外網頻寬限制與存取孤島。

---

## 5. 基礎設施即代碼 (Infrastructure as Code)
請參考同一目錄下的 `docker-compose.ha.yml` 與 `haproxy.cfg` 以啟動完整的本機 HA 叢集進行驗證測試。叢集包含：
- 1 x HAProxy (Load Balancer, 負責 Active-Standby 切換)
- 2 x Controller (Web, API, 排程)
- 3 x Worker (資料處理節點)
- 1 x Redis (Queue)
- 1 x PostgreSQL (Metadata & Audit Logs)
