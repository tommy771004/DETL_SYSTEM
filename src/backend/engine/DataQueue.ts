/**
 * @file DataQueue.ts
 * @description  資料佇列 (Data Queue) 機制。
 * 非同步緩衝與流量控制機制，部署於讀取器、轉換器與寫入器之間，
 * 透過非同步的佇列機制吸收各節點間 I/O 速度的巨大差異，防止記憶體溢出（OOM）並確保管線順暢。
 */

export class DataQueue {
  private buffer: any[] = [];
  private isDone: boolean = false;
  private waitingResolve: (() => void) | null = null;
  private error: Error | null = null;

  // 設定佇列的水位線，以實現 Backpressure 控制
  private highWaterMark: number;

  constructor(highWaterMark: number = 5000) {
    this.highWaterMark = highWaterMark;
  }

  /**
   * 推送資料至佇列
   * 如果佇列滿了，會等待至佇列被消耗 (簡易 Backpressure)
   */
  public async push(records: any[]): Promise<void> {
    if (this.error) throw this.error;
    if (this.isDone) throw new Error('DataQueue 已經標示結束，無法再寫入資料');

    this.buffer.push(...records);

    // 喚醒等待讀取的人
    if (this.waitingResolve) {
      this.waitingResolve();
      this.waitingResolve = null;
    }

    // Backpressure: 若超過水位線，則稍微等待 (Yield to event loop)
    while (this.buffer.length >= this.highWaterMark && !this.error) {
      await new Promise(resolve => setTimeout(resolve, 10)); // 簡單的背壓節流
    }
  }

  /**
   * 標記資料已全部輸入完畢
   */
  public end(): void {
    this.isDone = true;
    if (this.waitingResolve) {
      this.waitingResolve();
      this.waitingResolve = null;
    }
  }

  /**
   * 通知佇列發生錯誤，立刻中斷
   */
  public destroy(err: Error): void {
    this.error = err;
    this.isDone = true;
    if (this.waitingResolve) {
      this.waitingResolve();
      this.waitingResolve = null;
    }
  }

  /**
   * 取得 Async Iterator，供下游持續抽出資料
   * 每次拉取最多回傳指定長度的 chunk
   */
  public async *consume(chunkSize: number = 100): AsyncGenerator<any[], void, unknown> {
    while (true) {
      if (this.error) {
        throw this.error;
      }

      if (this.buffer.length > 0) {
        const chunk = this.buffer.splice(0, chunkSize);
        yield chunk;
      } else if (this.isDone) {
        return;
      } else {
        // 等待新資料
        await new Promise<void>(resolve => {
          this.waitingResolve = resolve;
        });
      }
    }
  }
}
