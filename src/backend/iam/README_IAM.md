# 身分與存取管理 (IAM) 設計指南

本平台實作了嚴謹的 IAM 模組，以落實**最小權限原則 (Principle of Least Privilege)** 並防堵內部越權。

## 1. 角色導向存取控制 (RBAC)
我們移除了直接綁定於使用者的靜態權限，所有的存取控制都必須透過配發 `Role` (角色) 來進行。
*   在 `src/backend/iam/types.ts` 中定義了 `Role` 介面，其 `permissions` 屬性採用 `action:resource` 的精細粒度（如 `read:pipeline`, `execute:pipeline`）。
*   在 `IAMService.ts` 的 `authorize` 方法內，系統會依序比對用戶包含角色的每一項權限，達成默認拒絕 (Default Deny) 的白名單實踐。

## 2. 本地端帳號 vs 網路帳號
針對金融或高機密單位的要求，我們精細區分了帳號的跨網域性質：
*   **本地端帳號 (Local Account)**：此類帳號（例如 Server 的 Root Admin 或專用資料終端）在核發時，即會綁定其所在的實體機器或終端指紋 (儲存於 `boundDeviceId`)。若嘗試從其他位置登入將被直接拒絕，杜絕了帳號外流導致遠端遙控的可能。
*   **網路帳號 (Network Account)**：允許資料科學家或主管進行跨網域的登入操作，但其身上被配發的角色權限往往有著更嚴苛的讀寫限制。

## 3. 防堵內部越權的防禦實踐
透過 `src/backend/api/authMiddleware.ts` 封裝驗證邏輯：
```typescript
app.get('/api/pipelines', requirePermission('read:pipeline'), pipelineHandler);
app.post('/api/pipelines', requirePermission('write:pipeline'), pipelineHandler);
```
任何未聲明 `requiresPermission` 的路由，默認將無法被網路存取。我們不僅檢查使用者是否存在，也會檢查 `currentDeviceId` 確保本地設備實體信任，從而從根源防堵越權提權。
