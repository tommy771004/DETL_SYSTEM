/**
 * @file CheckpointManager.ts
 * @description 斷點續傳機制 (Checkpointing) 的儲存與讀取中心。
 * 使用 Redis 儲存每個節點成功後的輸出狀態，當任務失敗重試時，可直接載入通過的節點狀態。
 */
import RedisMock from 'ioredis-mock';
const Redis = RedisMock;

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
});

export class CheckpointManager {
  /**
   * 儲存節點的執行結果 (Checkpoint)
   * @param jobId 任務 ID (用於區分不同的執行批次)
   * @param nodeId  Pipeline 節點 ID
   * @param nodeOutput 節點處理完畢的資料陣列
   */
  public static async saveCheckpoint(jobId: string, nodeId: string, nodeOutput: any[]): Promise<void> {
    const key = `checkpoint:${jobId}:${nodeId}`;
    // 實務上：為了避免 Redis 被大資料塞爆，大量資料應儲存至 S3 或是 Database 並在此僅存參照 (Reference)。
    // 此處作為範例，直接將產出結果序列化存入 Redis。
    await redis.set(key, JSON.stringify(nodeOutput));
    console.log(`[CheckpointManager] Saved checkpoint for node ${nodeId} (Job: ${jobId})`);
  }

  /**
   * 取得節點的斷點紀錄
   */
  public static async getCheckpoint(jobId: string, nodeId: string): Promise<any[] | null> {
    const key = `checkpoint:${jobId}:${nodeId}`;
    const data = await redis.get(key);
    if (!data) return null;
    
    console.log(`[CheckpointManager] Loaded checkpoint for node ${nodeId} (Job: ${jobId})`);
    return JSON.parse(data);
  }

  /**
   * 清除特定 Job 的全部斷點
   */
  public static async clearCheckpoints(jobId: string): Promise<void> {
    const keys = await redis.keys(`checkpoint:${jobId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[CheckpointManager] Cleared ${keys.length} checkpoints for Job: ${jobId}`);
    }
  }
}
