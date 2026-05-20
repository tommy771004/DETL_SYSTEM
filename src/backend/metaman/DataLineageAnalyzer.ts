import { PipelineConfig } from '../engine/types.js';

export class DataLineageAnalyzer {
  private pipelines: PipelineConfig[];

  constructor(pipelines: PipelineConfig[]) {
    this.pipelines = pipelines;
  }

  public getGlobalLineage() {
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // 為了跨 Pipeline 關聯，我們記錄已知的 table
    const tablePublishers = new Map<string, string>(); // tableName -> originNodeId
    
    for (const pipeline of this.pipelines) {
      for (const node of pipeline.nodes) {
         const globalNodeId = `${pipeline.pipelineId}::${node.id}`;
         let label = `${node.type} (${node.id})`;
         let type = 'transform';
         
         if (node.type === 'source_api' || node.type === 'source_csv') {
             label = `Source: ${node.config.endpoint || node.config.filePath || node.id}`;
             type = 'source';
         } else if (node.type === 'dest_db') {
             label = `Target: ${node.config.table || 'Unknown Table'}`;
             type = 'destination';
             if (node.config.table) {
                tablePublishers.set(node.config.table, globalNodeId);
             }
         }

         nodes.push({ id: globalNodeId, label, type, pipeline: pipeline.pipelineId });
      }

      for (const edge of pipeline.edges) {
         edges.push({
             source: `${pipeline.pipelineId}::${edge.source}`,
             target: `${pipeline.pipelineId}::${edge.target}`
         });
      }
    }

    // 建立跨 Pipeline 的血緣連結 (如果一個節點讀取了某個 table，建立依賴連結)
    for (const pipeline of this.pipelines) {
       for (const node of pipeline.nodes) {
          if (node.type === 'source_api' && node.config.endpoint?.startsWith('db://')) {
             const tableName = node.config.endpoint.replace('db://', '');
             const publisherNodeId = tablePublishers.get(tableName);
             if (publisherNodeId) {
                const globalReaderId = `${pipeline.pipelineId}::${node.id}`;
                edges.push({
                   source: publisherNodeId,
                   target: globalReaderId,
                   isCrossPipeline: true
                });
             }
          }
       }
    }

    return { nodes, edges };
  }

  public getImpactAnalysis(keyword: string) {
     const lineage = this.getGlobalLineage();
     if (!keyword) return { nodes: [], edges: [] };

     const startNodeIds = new Set<string>();
     for (const n of lineage.nodes) {
        if (n.label.toLowerCase().includes(keyword.toLowerCase()) || n.id.toLowerCase().includes(keyword.toLowerCase())) {
            startNodeIds.add(n.id);
        }
     }

     const visited = new Set<string>();
     const impactedEdges: any[] = [];
     const queue = Array.from(startNodeIds);

     while (queue.length > 0) {
         const current = queue.shift()!;
         if (!visited.has(current)) {
             visited.add(current);
             
             // find downstream
             const downstreamEdges = lineage.edges.filter(e => e.source === current);
             for (const e of downstreamEdges) {
                 impactedEdges.push(e);
                 if (!visited.has(e.target)) {
                     queue.push(e.target);
                 }
             }
         }
     }

     const impactedNodes = lineage.nodes.filter(n => visited.has(n.id));

     return {
         nodes: impactedNodes,
         edges: Array.from(new Set(impactedEdges))
     };
  }
}
