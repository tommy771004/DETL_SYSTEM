/**
 * @file EventDrivenFileMonitor.ts
 * @description  JCS 事件驅動觸發機制
 * 持續監控本地或遠端目錄檔案，驗證檔案數量、大小與完整性後，自動觸發下游作業。
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { jcsController } from '../api/pipelineRoutes.js';

export class EventDrivenFileMonitor {
  private watchDir: string;
  private processedFiles = new Set<string>();

  constructor(watchDir: string) {
    this.watchDir = watchDir;
    // Ensure directory exists
    if (!fs.existsSync(this.watchDir)) {
      fs.mkdirSync(this.watchDir, { recursive: true });
    }
  }

  public start() {
    console.log(`[JCS File Monitor] 啟動目錄監控機制: ${this.watchDir}`);
    // 實務上可能會用 chokidar 取代，這裡簡化使用 fs.watch 取代
    fs.watch(this.watchDir, async (eventType, filename) => {
      if (eventType === 'rename' && filename) {
         const filePath = path.join(this.watchDir, filename);
         // 檢查檔案是否存在 (新建或移入)
         if (fs.existsSync(filePath) && !this.processedFiles.has(filename)) {
            console.log(`[JCS File Monitor] 偵測到新檔案: ${filename}`);
             // 等待檔案寫入完成，實務上會有更嚴密的機制 (例如觀察大小不再變化)
            setTimeout(() => this.handleNewFile(filePath, filename), 1000); 
         }
      }
    });
  }

  private async handleNewFile(filePath: string, filename: string) {
    try {
      // 驗證 1: 檔案大小
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error('檔案大小為 0 結點 (Empty File)');
      }

      // 驗證 2: 檔案完整性 (計算 MD5，實務上會與 .md5 檔案比對)
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('md5').update(fileBuffer).digest('hex');
      console.log(`[JCS File Monitor] 檔案驗證成功: Size=${stats.size} bytes, MD5=${hashSum}`);
      
      this.processedFiles.add(filename);

      // 自動觸發下游作業 (Event-driven Trigger)
      // 動態組裝 Payload 與 Pipeline 設定
      const eventPayload = {
        event_trigger: 'file_arrival',
        file_path: filePath,
        file_name: filename,
        file_md5: hashSum,
        config: {
            pipelineId: `evt_pipe_${Date.now()}`,
            trigger: { type: 'event' },
            variables: {},
            nodes: [
                { id: "read_file", type: "source_csv", config: { filePath: filePath } },
                { id: "process", type: "transform_custom_script", config: { code: "module.exports = function(d) { return d; }" } },
                { id: "save_db", type: "dest_db", config: { table: 'event_driven_data' } }
            ],
            edges: [
                { source: "read_file", target: "process" },
                { source: "process", target: "save_db" }
            ]
        }
      };

      await jcsController.dispatchJob(`pipe_event_${filename}`, eventPayload);

    } catch (err: any) {
      console.error(`[JCS File Monitor] 檔案驗證失敗: ${err.message}`);
    }
  }
}
