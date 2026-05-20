/**
 * @file types.ts
 * @description 定義整個系統的 Pipeline 結構與 Node/Edge 介面
 */

import { DataQueue } from './DataQueue.js';

export interface Edge {
  source: string;
  target: string;
  condition?: string; // e.g. "success", or custom js condition string
}

export interface PipelineNode {
  id: string;
  type: string;
  config: Record<string, any>;
}

export interface PipelineTrigger {
  type: string;
  dynamicPayload?: boolean;
}

export interface PipelineConfig {
  pipelineId: string;
  trigger: PipelineTrigger;
  variables: Record<string, any>;
  nodes: PipelineNode[];
  edges: Edge[];
}

export type PluginCategory = 'reader' | 'transformer' | 'writer';

// 節點執行引擎的介面 (重構符合 架構)
export interface IPluginNode {
  type: string;
  category: PluginCategory;
  /**
   * 執行節點任務
   * @param config 節點設定
   * @param inputQueue 上游資料佇列 (若是 Reader 則為 null)
   * @param outputQueue 下游資料佇列 (若是 Writer 則為 null)
   * @param variables 變數環境
   */
  execute(
    config: Record<string, any>, 
    inputQueue: DataQueue | null, 
    outputQueue: DataQueue | null, 
    variables: Record<string, any>
  ): Promise<void>;
}

