/**
 * @file CustomScriptNode.ts
 * @description 實作「自定義腳本節點」，使用 Node.js 原生的 vm 模組提供沙盒 (Sandbox) 環境。
 * 讓使用者可以用 JavaScript 對上游串流/陣列進行特規轉換，而不會破壞主服務。
 */
import { IPluginNode, PluginCategory } from '../../engine/types.js';
import { SandboxExecutor } from '../../engine/SandboxExecutor.js';
import { DataQueue } from '../../engine/DataQueue.js';

export class CustomScriptNode implements IPluginNode {
  public type = 'transform_custom_script';
  public category: PluginCategory = 'transformer';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[CustomScriptNode] Executing custom script... (Language: ${config.language || 'javascript'})`);
    
    if (!inputQueue) throw new Error('[CustomScriptNode] Missing input queue');
    if (!outputQueue) throw new Error('[CustomScriptNode] Missing output queue');

    const code = config.code;
    if (!code) {
      throw new Error(`[CustomScriptNode] Missing 'code' in config`);
    }

    try {
      // Consume data chunks asynchronously from input queue and push transformed chunks to output queue
      for await (const chunk of inputQueue.consume(500)) {
        // 透過 SandboxExecutor 安全執行使用者程式碼
        const result = SandboxExecutor.run(code, chunk, variables);
        await outputQueue.push(result);
      }
      outputQueue.end();
      console.log(`[CustomScriptNode] Execution complete.`);
    } catch (err) {
      console.error(`[CustomScriptNode] Error executing custom script:`, err);
      outputQueue.destroy(err as Error);
      throw err;
    }
  }
}

