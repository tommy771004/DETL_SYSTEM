import { GlobalPipelineStore } from '../engine/Store.js';

export interface DataProfileResult {
  tableName: string;
  rowCount: number;
  healthScore: number;
  fields: {
    name: string;
    type: string;
    nullRatio: number;
    uniqueRatio: number;
    tags: string[];
  }[];
  tableTags: string[];
}

export class DataProfiler {
  // 模擬資料庫儲存的分析結果
  private static cachedProfiles: Map<string, DataProfileResult> = new Map();

  /**
   * 模擬執行定期資料剖析 (Data Profiling)
   */
  public static async runAutoProfiling() {
    console.log(`[Data Profiler] 開始執行自動化資料剖析...`);
    
    // 找出所有存在於 Pipeline 裡的 destination tables
    const targetTables = new Set<string>();
    for (const pipeline of GlobalPipelineStore) {
       for (const node of pipeline.nodes) {
          if (node.type === 'dest_db' && node.config.table) {
              targetTables.add(node.config.table);
          }
       }
    }

    this.cachedProfiles.clear();
    for (const table of Array.from(targetTables)) {
       this.cachedProfiles.set(table, this.mockProfileTable(table));
    }
    
    console.log(`[Data Profiler] 剖析完成，共掃描 ${targetTables.size} 張表。`);
  }

  public static getProfiles(): DataProfileResult[] {
    return Array.from(this.cachedProfiles.values());
  }

  private static mockProfileTable(tableName: string): DataProfileResult {
     // 模擬不同表的結構與特徵
     const isCustomer = tableName.includes('customer');
     const isSales = tableName.includes('sales');
     
     const rowCount = Math.floor(Math.random() * 10000) + 1000;
     const fields = [];
     
     if (isCustomer) {
         fields.push(this.mockField('id', 'integer', 0, 1));
         fields.push(this.mockField('email', 'string', 0.05, 0.99));
         fields.push(this.mockField('phone', 'string', 0.15, 0.95));
         fields.push(this.mockField('status', 'string', 0, 0.001));
     } else if (isSales) {
         fields.push(this.mockField('tx_id', 'string', 0, 1));
         fields.push(this.mockField('amount', 'decimal', 0, 0.8));
         fields.push(this.mockField('customer_id', 'integer', 0.01, 0.5));
         fields.push(this.mockField('created_at', 'timestamp', 0, 0.9));
     } else {
         fields.push(this.mockField('id', 'integer', 0, 1));
         fields.push(this.mockField('data_value', 'string', 0.1, 0.5));
         fields.push(this.mockField('remarks', 'string', 0.8, 0.8)); // High null ratio
     }

     // 計算 Health Score: 100 - (平均 Null 比例 * 50) - (異常特徵扣分)
     const avgNull = fields.reduce((acc, f) => acc + f.nullRatio, 0) / fields.length;
     let healthScore = Math.round(100 - (avgNull * 100));
     
     // 智慧貼標 (Table level)
     const tableTags = [];
     if (healthScore >= 95) tableTags.push('High Quality');
     if (healthScore < 70) tableTags.push('Needs Review');
     if (fields.some(f => f.tags.includes('PII'))) tableTags.push('Contains PII');
     
     return {
        tableName,
        rowCount,
        healthScore,
        fields,
        tableTags
     };
  }

  private static mockField(name: string, type: string, nullRatio: number, uniqueRatio: number) {
      const tags = [];
      // 智慧貼標規則 (Field level)
      if (['email', 'phone', 'ssn', 'address'].some(k => name.toLowerCase().includes(k))) {
          tags.push('PII');
      }
      if (uniqueRatio > 0.95 && type !== 'timestamp') {
          tags.push('High Cardinality (PK cand.)');
      }
      if (nullRatio > 0.5) {
          tags.push('Sparsity');
      }

      return { name, type, nullRatio, uniqueRatio, tags };
  }
}
