/**
 * @file BasicNodes.ts
 * @description 一包基礎內建節點 (包含 Source API, DB Destination, AI Transform)
 */
import { IPluginNode, PluginCategory } from '../../engine/types.js';
import { DataQueue } from '../../engine/DataQueue.js';
import { GoogleGenAI } from '@google/genai';

export class SourceApiNode implements IPluginNode {
  public type = 'source_api';
  public category: PluginCategory = 'reader';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[SourceApiNode] Fetching data from: ${config.endpoint}`);
    if (!outputQueue) throw new Error('[SourceApiNode] Missing output queue');

    try {
      let data = [];
      if (config.endpoint && config.endpoint.startsWith('http')) {
        const response = await fetch(config.endpoint);
        data = await response.json();
      } else if (config.searchQuery && process.env.GEMINI_API_KEY) {
        // Integrates Google Search Grounding to generate data arrays
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const batchPrompt = `
          Based on the real-time information from Google Search, generate a structured JSON array of records for this query: 
          "${config.searchQuery}"
          Return EXACTLY a JSON array. Do not return markdown.
        `;
        try {
          const result = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: [batchPrompt],
             tools: [{ googleSearch: {} }],
          });
          const rawResponse = result.text?.trim() || "";
          const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
             data = JSON.parse(jsonMatch[0]);
          }
        } catch (aiErr) {
          console.error("[SourceApiNode] AI search failed:", aiErr);
        }
      } else {
        // Fallback for demo testing if no valid endpoint is provided
        data = [
          { id: 1, value: 150, description: "Fallback data 1" },
          { id: 2, value: 50, description: "Fallback data 2" }
        ];
      }
      
      if (!Array.isArray(data)) {
         data = [data]; // Normalize to array
      }
      
      await outputQueue.push(data);
      outputQueue.end();
    } catch (err) {
      outputQueue.destroy(err as Error);
      throw err;
    }
  }
}

export class DestDbNode implements IPluginNode {
  public type = 'dest_db';
  public category: PluginCategory = 'writer';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[DestDbNode] Setup Database Connection Pool...`);
    if (!inputQueue) throw new Error('[DestDbNode] Missing input queue');

    const tableName = config.table || 'default_table';
    const chunkSize = config.chunkSize || 500;
    const maxConcurrency = config.maxConcurrency || 5;
    
    // 模擬連線池獲取獨立連線
    const getConnection = async () => ({
        beginTransaction: async () => {}, // 每個連線獨立的 Transaction
        commit: async () => {},
        rollback: async () => {},
        executeBatch: async (table: string, data: any[]) => {
            await new Promise(r => setTimeout(r, Math.random() * 200 + 100)); // 模擬 I/O 延遲
        },
        release: () => {} // 放回連線池
    });

    let activeWorkers = 0;
    const pendingWorkers: Promise<void>[] = [];

    // 單一寫入任務
    const processChunk = async (chunk: any[]) => {
        const conn = await getConnection();
        try {
            await conn.beginTransaction();
            await conn.executeBatch(tableName, chunk);
            await conn.commit(); // 獨立 Commit 避免跨連線鎖死
            console.log(`[DestDbNode] Committed a chunk of ${chunk.length} rows to ${tableName}.`);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    };

    try {
      for await (const chunk of inputQueue.consume(chunkSize)) {
        // 利用 Promise 陣列限制最大併發(Multi-tasking)寫入數
        while (activeWorkers >= maxConcurrency) {
            await Promise.race(pendingWorkers);
        }

        activeWorkers++;
        const worker = processChunk(chunk).finally(() => {
            activeWorkers--;
            pendingWorkers.splice(pendingWorkers.indexOf(worker), 1);
        });
        pendingWorkers.push(worker);
      }
      
      // 等待最後殘餘的資料庫寫入完成
      await Promise.all(pendingWorkers);
      console.log(`[DestDbNode] Write completed successfully.`);
      if (outputQueue) outputQueue.end(); 
    } catch (err) {
      if (outputQueue) outputQueue.destroy(err as Error);
      throw err;
    }
  }
}

export class TransformAINode implements IPluginNode {
  public type = 'transform_ai';
  public category: PluginCategory = 'transformer';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[TransformAINode] Executing AI Transform with prompt: "${config.prompt}"`);
    if (!inputQueue) throw new Error('[TransformAINode] Missing input queue');
    if (!outputQueue) throw new Error('[TransformAINode] Missing output queue');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      for await (const chunk of inputQueue.consume(50)) { // LLMs can't take huge batches
        let transformed = chunk;
        if (config.prompt && process.env.GEMINI_API_KEY) {
          try {
             const batchPrompt = `
You are a batch data processor. 
Process the following JSON array of records based on this instruction: 
"${config.prompt}"

Input JSON:
${JSON.stringify(chunk)}

Return EXACTLY a JSON array of the processed records. Do not return markdown. Do not return anything else but the raw JSON array.
`;
             
             const result = await ai.models.generateContent({
               model: 'gemini-2.5-flash',
               contents: [batchPrompt],
             });
             const rawResponse = result.text?.trim() || "";
             const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
             if (jsonMatch) {
                transformed = JSON.parse(jsonMatch[0]);
             }
          } catch (aiErr) {
             console.error("[TransformAINode] AI transformation failed, passing through raw data:", aiErr);
          }
        }
        await outputQueue.push(transformed);
      }
      outputQueue.end();
    } catch (err) {
      outputQueue.destroy(err as Error);
      throw err;
    }
  }
}

