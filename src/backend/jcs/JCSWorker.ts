/**
 * @file JCSWorker.ts
 * @description 分散式工作節點 (Distributed Worker Node)
 * 可以部署到多台實體機或 Container 中。
 * 具備端點互備援保護：所有 Worker 監聽同一個 Task Queue，
 * 若某台 Worker 斷線，處理中的任務會因 Stall Timeout 回到佇列，被其他 Worker 接手處理。
 */
import { Worker, Job } from './BullMQMock.js';
import { Orchestrator } from '../engine/Orchestrator.js';
import { PipelineConfig } from '../engine/types.js';

export class JCSWorker {
  private worker: Worker;
  private nodeId: string;

  constructor(redisConfig: { host: string, port: number }, nodeId: string) {
    this.nodeId = nodeId;
    
    this.worker = new Worker('jcs-jobs', async (job: Job) => {
      console.log(`[JCS Worker ${this.nodeId}] 取得 Job ${job.id}，開始執行 Pipeline...`);
      
      const { pipelineId, payload } = job.data;
      
      // 為了展示，我們只允許執行預先載入的 config (實務上應從 DB 取出 PipelineConfig)
      // 若 payload.config 存在就用它，否則拿預設值
      const config: PipelineConfig | undefined = payload.config;
      if (!config) {
         throw new Error('PipelineConfig not found in payload');
      }

      // 將 Orchestrator 日誌與 BullMQ 整合，以利 WebSocket 即時廣播
      const orchestrator = new Orchestrator(config, job.id!, false, async (progressMsg: any) => {
         await job.updateProgress(progressMsg);
         if (typeof progressMsg === 'string') {
            await job.log(progressMsg);
         } else {
            await job.log(`[Node: ${progressMsg.nodeId || 'SYSTEM'}] ${progressMsg.message}`);
         }
      });
      
      const result = await orchestrator.executePipeline(payload.variables || {});
      return result;
      
    });

    this.worker.on('failed', (job: any, err: any) => {
       console.log(`[JCS Worker ${this.nodeId}] 💥 Job ${job?.id} 執行失敗: ${err.message}`);
    });

    this.worker.on('completed', (job) => {
       console.log(`[JCS Worker ${this.nodeId}] ✅ Job ${job.id} 執行成功!`);
    });

    console.log(`[JCS Worker ${this.nodeId}] Worker 進程已啟動，準備接收並處理任務.`);
  }
}
