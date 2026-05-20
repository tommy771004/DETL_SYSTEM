/**
 * @file NodeRegistry.ts
 * @description Plugin System 核心，利用微核心架構負責動態註冊和取得各式 Node Handlers。
 * 遵循 Singleton 模式與 Open-Closed Principle。
 */
import { IPluginNode } from './types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NodeRegistry {
  private static instance: NodeRegistry;
  private nodes: Map<string, IPluginNode> = new Map();

  private constructor() {}

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  /**
   * 動態註冊節點外掛
   */
  public registerNode(nodePlugin: IPluginNode) {
    if (this.nodes.has(nodePlugin.type)) {
      console.warn(`[NodeRegistry] 節點類型 ${nodePlugin.type} 已存在，將被覆寫。`);
    }
    this.nodes.set(nodePlugin.type, nodePlugin);
    console.log(`[NodeRegistry] 成功註冊節點類型: ${nodePlugin.type}`);
  }

  /**
   * 取得對應類型的節點實作
   */
  public getNodeHandler(type: string): IPluginNode {
    const node = this.nodes.get(type);
    if (!node) {
      throw new Error(`[NodeRegistry] 找不到支援的節點類型: ${type}`);
    }
    return node;
  }

  /**
   * 動態掃描指定目錄並註冊節點模組
   * @param pluginsDir 外掛目錄路徑
   */
  public async scanAndRegister(pluginsDir: string = path.join(__dirname, '../plugins/nodes')) {
    try {
      const files = await fs.readdir(pluginsDir);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const filePath = path.join(pluginsDir, file);
          const moduleUrl = `file://${filePath}`; // 轉為 URL format 以供動態載入
          const nodeModule = await import(moduleUrl);
          
          // 檢查 Module 中所有的 exports
          for (const key in nodeModule) {
            const NodeClass = nodeModule[key];
            if (typeof NodeClass === 'function' && NodeClass.prototype && 'execute' in NodeClass.prototype) {
                try {
                  const instance = new NodeClass();
                   if (instance.type) {
                     this.registerNode(instance);
                   }
                } catch(e) {
                  // Ignore classes that cannot be instantiated without arguments
                }
            }
          }
        }
      }
    } catch (error) {
      console.error(`[NodeRegistry] 掃描外掛目錄失敗: ${pluginsDir}`, error);
    }
  }
}

// 匯出 Singleton 實例
export const pluginRegistry = NodeRegistry.getInstance();
