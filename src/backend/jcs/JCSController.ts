/**
 * @file JCSController.ts
 * @description 企業級排程控制器 (Central Server Controller)
 * 負責統籌規劃任務。結合 Active-Standby 機制，只有 Leader 會派定時排程。
 * 派發的任務透過 Redis 跨網路推入 Queue，交由分散的 Worker 執行。
 */
import { Queue } from './BullMQMock.js';
import { LeaderElection } from './LeaderElection.js';

export class JCSController {
  public queue: Queue;
  private leaderElection: LeaderElection;
  private nodeId: string;

  constructor(redisConfig: { host: string, port: number }, nodeId: string) {
    this.nodeId = nodeId;
    
    this.queue = new Queue('jcs-jobs');
    this.leaderElection = new LeaderElection({} as any, nodeId);
  }

  public start() {
    this.leaderElection.start();
    console.log(`[JCS Controller] 節點 ${this.nodeId} 已啟動，等待 Leader 競選...`);
    
    // 啟動排程掃描器
    setInterval(() => this.scheduleCronJobs(), 10000); // 模擬每 10 秒掃描
  }

  /**
   * 模擬掃描資料庫中設定好的定期任務
   */
  private async scheduleCronJobs() {
    if (!this.leaderElection.getIsLeader()) {
      return; // 雙機熱備援：Standby 節點不會觸發排程派發，避免重複執行
    }
    
    // 在這裡實作查詢資料庫中的 Cron 排程，如果到期則派送
    // console.log(`[JCS Controller Active] 正在掃描排程並派發任務...`);
  }

  /**
   * 允許外部 API 主動 (Webhook/手動) 觸發派發任務
   */
  public async dispatchJob(pipelineId: string, payload: any) {
    const job = await this.queue.add('execute-pipeline', { pipelineId, payload }, {
      removeOnComplete: true, // 完成後移除，減少 Redis 負載
      removeOnFail: false,    // 失敗則保留以供排錯與重試
      attempts: 3,            // 容錯保護：任務失敗自動重試 3 次
      backoff: {
        type: 'exponential',
        delay: 5000           // 延遲重試
      }
    });
    console.log(`[JCS Controller] 成功派發 Job ${job.id} (Pipeline: ${pipelineId}) 至叢集.`);
    return job;
  }
}
