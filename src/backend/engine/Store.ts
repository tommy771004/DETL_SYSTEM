import { PipelineConfig } from './types.js';

export const GlobalPipelineStore: PipelineConfig[] = [];

export function addPipelineToStore(pipeline: PipelineConfig) {
  const index = GlobalPipelineStore.findIndex(p => p.pipelineId === pipeline.pipelineId);
  if (index >= 0) {
    GlobalPipelineStore[index] = pipeline;
  } else {
    GlobalPipelineStore.push(pipeline);
  }
}

export function getPipelineFromStore(pipelineId: string) {
  return GlobalPipelineStore.find(p => p.pipelineId === pipelineId);
}
