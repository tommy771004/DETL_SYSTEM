/**
 * @file SourceCSVNode.ts
 * @description 一個用來進行 CSV 讀取的資料來源節點外掛
 */
import { IPluginNode, PluginCategory } from '../../engine/types.js';
import { DataQueue } from '../../engine/DataQueue.js';
import fs from 'fs';
import csv from 'csv-parser';
import { Readable } from 'stream';

export class SourceCSVNode implements IPluginNode {
  public type = 'source_csv';
  public category: PluginCategory = 'reader';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[SourceCSVNode] Parsing CSV... Data string provided? ${Boolean(config.dataString)} File Path? ${config.filePath}`);
    
    if (!outputQueue) {
      throw new Error('[SourceCSVNode] Missing output queue');
    }

    return new Promise((resolve, reject) => {
      let stream: Readable;
      if (config.dataString) {
          stream = Readable.from([config.dataString]);
      } else if (config.filePath) {
          stream = fs.createReadStream(config.filePath);
      } else {
        const err = new Error('Missing data file or data string');
        outputQueue.destroy(err);
        return reject(err);
      }

      let batch: any[] = [];
      const BATCH_SIZE = 100;

      stream
        .pipe(csv())
        .on('data', (data) => {
          batch.push(data);
          if (batch.length >= BATCH_SIZE) {
            // Pause stream while pushing to queue
            stream.pause();
            outputQueue.push(batch).then(() => {
                stream.resume();
            }).catch(err => {
                stream.destroy(err);
            });
            batch = [];
          }
        })
        .on('end', async () => {
          if (batch.length > 0) {
            await outputQueue.push(batch);
          }
          outputQueue.end();
          console.log(`[SourceCSVNode] Successfully finished reading CSV.`);
          resolve();
        })
        .on('error', (err) => {
          outputQueue.destroy(err);
          reject(err);
        });
    });
  }
}

