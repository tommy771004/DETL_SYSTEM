/**
 * @file DAGParser.ts
 * @description 實作具備拓撲排序 (Topological Sort) 的有向無環圖 (DAG) 解析器。
 * 負責檢驗 JSON 中的 nodes 與 edges，並產生安全的執行順序陣列，同時偵測循環依賴 (Circular Dependency)。
 */
import { PipelineConfig, PipelineNode, Edge } from '../engine/types.js';

export class DAGParser {
  private nodes: Map<string, PipelineNode> = new Map();
  private adjacencyList: Map<string, string[]> = new Map();
  private inDegree: Map<string, number> = new Map();

  constructor(private pipeline: PipelineConfig) {
    this.buildGraph();
  }

  /**
   * 建立圖結構，初始化 Adjacency List 與 In-Degree 資料
   */
  private buildGraph(): void {
    // 註冊所有 Node
    for (const node of this.pipeline.nodes) {
      this.nodes.set(node.id, node);
      this.adjacencyList.set(node.id, []);
      this.inDegree.set(node.id, 0);
    }

    // 建立 Edges
    for (const edge of this.pipeline.edges) {
      if (!this.nodes.has(edge.source)) {
        throw new Error(`[DAGParser] Edge 來源節點不存在: ${edge.source}`);
      }
      if (!this.nodes.has(edge.target)) {
        throw new Error(`[DAGParser] Edge 目標節點不存在: ${edge.target}`);
      }

      this.adjacencyList.get(edge.source)!.push(edge.target);
      this.inDegree.set(edge.target, (this.inDegree.get(edge.target) || 0) + 1);
    }
  }

  /**
   * 執行拓撲排序 (Kahn's Algorithm)
   * @returns 依照執行先後順序排列的 Node 陣列
   * @throws 如果偵測到循環依賴 (Circular Dependency) 則拋出錯誤
   */
  public getExecutionOrder(): PipelineNode[] {
    const queue: string[] = [];
    const executionOrder: PipelineNode[] = [];
    let visitedCount = 0;

    // 將所有 in-degree 為 0 (沒有依賴任何前置節點) 的節點加入佇列
    for (const [nodeId, degree] of this.inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // BFS 遍歷圖
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      executionOrder.push(this.nodes.get(currentId)!);
      visitedCount++;

      // 解除相鄰節點的依賴
      for (const neighborId of this.adjacencyList.get(currentId)!) {
        const currentDegree = this.inDegree.get(neighborId)! - 1;
        this.inDegree.set(neighborId, currentDegree);
        
        // 如果相鄰節點的依賴都滿足了，就推入排程佇列
        if (currentDegree === 0) {
          queue.push(neighborId);
        }
      }
    }

    // 如果造訪的節點數不等於總數，表示圖中有循環 (Cycle)
    if (visitedCount !== this.nodes.size) {
      throw new Error('[DAGParser] 解析失敗: 偵測到循環依賴 (Circular Dependency)，Pipeline 結構無效！');
    }

    return executionOrder;
  }

  /**
   * 取得分層執行批次 (Parallel Execution Batches)
   * 這個方法可以回傳一個二維陣列 [ [Node A], [Node B, Node C], [Node D] ]
   * 用於實作並發控制，同一個批次內的節點可以平行執行
   */
  public getExecutionBatches(): PipelineNode[][] {
    const batches: PipelineNode[][] = [];
    // 複製 inDegree 避免破壞原始資料
    const tempInDegree = new Map(this.inDegree);
    let currentQueue: string[] = [];
    let visitedCount = 0;

    // 初始: 加入所有 in-degree 為 0 的節點
    for (const [nodeId, degree] of tempInDegree.entries()) {
      if (degree === 0) currentQueue.push(nodeId);
    }

    while (currentQueue.length > 0) {
      const nextQueue: string[] = [];
      const currentBatch: PipelineNode[] = [];

      for (const currentId of currentQueue) {
        currentBatch.push(this.nodes.get(currentId)!);
        visitedCount++;

        for (const neighborId of this.adjacencyList.get(currentId)!) {
          const currentDegree = tempInDegree.get(neighborId)! - 1;
          tempInDegree.set(neighborId, currentDegree);
          if (currentDegree === 0) {
            nextQueue.push(neighborId);
          }
        }
      }

      batches.push(currentBatch);
      currentQueue = nextQueue;
    }

    if (visitedCount !== this.nodes.size) {
      throw new Error('[DAGParser] 解析失敗: 偵測到循環依賴 (Circular Dependency)，Pipeline 結構無效！');
    }

    return batches;
  }
}
