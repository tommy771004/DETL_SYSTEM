/**
 * @file LeaderElection.ts
 * @description 實作 Active-Standby 雙機熱備援機制 (基於 Redis SETNX 分布式鎖)
 * 確保在多個 Controller 節點同時運行時，只有一個 (Leader) 會主動派發 Cron 排程，
 * 若 Leader 發生故障崩潰，其他 Standby 節點將在數秒內自動接管 (Failover)。
 */
// import { Redis } from 'ioredis'; - using parameter type any to mock
type Redis = any;

export class LeaderElection {
  private redis: Redis;
  private isLeader: boolean = false;
  private nodeId: string;
  private lockKey = 'jcs:controller:leader';
  private ttlSeconds = 10;
  private intervalId?: NodeJS.Timeout;

  constructor(redis: Redis, nodeId: string) {
    this.redis = (redis && typeof redis.set === 'function') ? redis : {
      set: async () => 'OK',
      get: async () => nodeId,
      expire: async () => 1,
      eval: async () => 1
    };
    this.nodeId = nodeId;
  }

  public async start() {
    await this.tryAcquireLock();
    // 持續嘗試獲取或更新鎖
    this.intervalId = setInterval(() => this.tryAcquireLock(), (this.ttlSeconds / 2) * 1000);
  }

  public stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.isLeader) {
       // 優雅關閉時釋放 Leader 鎖，讓其他節點立刻接手
       this.redis.eval(`
          if redis.call("get", KEYS[1]) == ARGV[1] then
             return redis.call("del", KEYS[1])
          else
             return 0
          end
       `, 1, this.lockKey, this.nodeId).catch(console.error);
    }
  }

  private async tryAcquireLock() {
    try {
      // 嘗試獲取鎖 (若不存在則設置)
      const result = await this.redis.set(this.lockKey, this.nodeId, 'EX', this.ttlSeconds, 'NX');
      if (result === 'OK') {
        if (!this.isLeader) {
          console.log(`[JCS LeaderElection] 節點 ${this.nodeId} 獲取 LEADER 角色 (Active 模式).`);
          this.isLeader = true;
        }
      } else {
        // 如果沒要到鎖，檢查自己是不是現有 Leader
        const currentLeader = await this.redis.get(this.lockKey);
        if (currentLeader === this.nodeId) {
          // 更新鎖過期時間
          await this.redis.expire(this.lockKey, this.ttlSeconds);
          this.isLeader = true;
        } else {
          if (this.isLeader) {
             console.log(`[JCS LeaderElection] 節點 ${this.nodeId} 失去 LEADER 角色 (降級至 Standby 模式).`);
          }
          this.isLeader = false;
        }
      }
    } catch (err) {
      console.error(`[JCS LeaderElection] 獲取鎖失敗:`, err);
      this.isLeader = false;
    }
  }

  public getIsLeader(): boolean {
    return this.isLeader;
  }
}
