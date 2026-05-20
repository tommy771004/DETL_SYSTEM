/**
 * @file pipelineRoutes.ts
 * @description 展示多元觸發機制中的 Event-Driven Webhook。
 * 讓外部系統 (例如 ERP) 動態打 API 並帶入當次 payload，然後推入 BullMQ 任務佇列等待非同步調度引擎執行。
 */
import express from 'express';
import { JCSController } from '../jcs/JCSController.js';
import { PipelineConfig } from '../engine/types.js';
import { addPipelineToStore, getPipelineFromStore } from '../engine/Store.js';
import { requirePermission } from './authMiddleware.js';

import { AuditLogService } from '../iam/AuditLogService.js';

// 初始化 Controller，將它匯出以供跨檔案使用
export const jcsController = new JCSController(
  { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 },
  `web-api-node-${Math.random().toString(36).substring(7)}`
);

// 動態啟動 Controller 邏輯 (取得 Active 角色)
jcsController.start();

const router = express.Router();

router.post('/pipelines/:pipelineId/trigger', requirePermission('execute:pipeline'), async (req, res) => {
  const { pipelineId } = req.params;
  const dynamicPayload = req.body; 

  console.log(`[Webhook] Received trigger for pipeline: ${pipelineId}`);
  console.log(`[Webhook] Variables injected from request body:`, dynamicPayload);

  try {
  // 當前測試直接將畫布 config 塞在 dynamicPayload.config 中
  // 在 Trinity JCS 中，Webhook/API 觸發會透過 Controller 分派給 Worker
  if (dynamicPayload.config) {
      // 確保將動態送來的 pipeline config 存入 Store 以供 MetaMan 分析
      addPipelineToStore(dynamicPayload.config);
  } else {
      const existingConfig = getPipelineFromStore(pipelineId);
      if (existingConfig) {
          dynamicPayload.config = existingConfig;
      }
  }
  const job = await jcsController.dispatchJob(pipelineId, dynamicPayload);
    
    AuditLogService.log({
      userId: 'system',
      action: 'pipeline_triggered',
      resource: pipelineId,
      details: `Triggered with payload, JobId: ${job.id}`,
      success: true
    });

    res.status(200).json({ 
      success: true, 
      message: `Pipeline ${pipelineId} triggered successfully (Managed by JCS HA Controller).`,
      jobId: job.id
    });

  } catch (error) {
    AuditLogService.log({
      userId: 'system',
      action: 'pipeline_triggered',
      resource: pipelineId,
      details: `Trigger failed: ${error}`,
      success: false
    });

    console.warn(`[Webhook Error] Ensure Redis is running for BullMQ. Error: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// -- JCS 監控儀表板 APIs --

// 取得所有作業 (Jobs) 目錄與狀態
router.get('/jcs/jobs', async (req, res) => {
  try {
    const queue = jcsController.queue;
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed()
    ]);

    const formatJob = async (j: any) => ({
      id: j.id,
      name: j.name,
      pipelineId: j.data?.pipelineId || 'unknown',
      state: await j.getState(),
      progress: j.progress,
      timestamp: j.timestamp,
      finishedOn: j.finishedOn,
      failedReason: j.failedReason
    });

    const formatJobs = async (jobs: any[]) => Promise.all(jobs.map(formatJob));

    res.json({
        waiting: await formatJobs(waiting),
        active: await formatJobs(active),
        completed: await formatJobs(completed),
        failed: await formatJobs(failed)
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// 統一回收指定任務的執行日誌
router.get('/jcs/jobs/:jobId/logs', async (req, res) => {
    try {
        const queue = jcsController.queue;
        const job = await queue.getJob(req.params.jobId);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        const logs = await queue.getJobLogs(job.id!);
        res.json({ logs: logs.logs });
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

export default router;

