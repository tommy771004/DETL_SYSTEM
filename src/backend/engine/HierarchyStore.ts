/**
 * @file HierarchyStore.ts
 * @description 記憶體式 Job 階層 Store（Entity → Category → Job → Step）。
 * 對應  5 的 JCS 作業管理架構。
 * 生產環境請替換為資料庫持久化實作。
 */

import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NodeType = 'entity' | 'category' | 'job';

export interface HierarchyNode {
  id: string;
  name: string;
  type: NodeType;
  active?: boolean;
  checkedOutBy?: string;         // 目前鎖定編輯的使用者
  checkedOutAt?: string;
  parentId?: string;
  description?: string;
  agentId?: string;              // Job 指定的 Agent
  frequencyId?: string;          // Job 指定的排程頻率
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JobStep {
  id: string;
  jobId: string;
  name: string;
  type: 'data_management' | 'external_command' | 'sql_executor';
  order: number;
  config: {
    // Data Management
    reader?: PluginConfig;
    transformer?: PluginConfig;
    writer?: PluginConfig;
    // External Command
    command?: string;
    embeddedScript?: string;
    // SQL Executor
    connectionId?: string;
    runMode?: 'before' | 'after' | 'within';
    sqlStatement?: string;
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PluginConfig {
  pluginType: string;           // e.g. 'jdbc_reader_generic', 'csv_file_reader', 'transformer_default', 'jdbc_writer_generic'
  connectionId?: string;
  database?: string;
  tableName?: string;
  filePath?: string;
  fileName?: string;
  delimiter?: string;
  encoding?: string;
  columns?: ColumnDef[];
  transformRules?: TransformRule[];
  sqlStatement?: string;
  extraProps?: Record<string, any>;
}

export interface ColumnDef {
  name: string;
  type: string;
  length?: number;
  nullable?: boolean;
}

export interface TransformRule {
  targetColumn: string;
  rule: string;
  description?: string;
}

export interface VersionHistory {
  version: number;
  nodeId: string;
  snapshot: HierarchyNode;
  comment: string;
  committedBy: string;
  committedAt: string;
}

// ─── Initial Seed Data ────────────────────────────────────────────────────────

const now = new Date().toISOString();

const seedNodes: HierarchyNode[] = [
  { id: 'e001', name: 'Corp_ETL', type: 'entity', createdAt: now, updatedAt: now },
  { id: 'c001', name: 'ETL_Jobs', type: 'category', parentId: 'e001', active: true, createdAt: now, updatedAt: now },
  { id: 'c002', name: 'Reporting', type: 'category', parentId: 'e001', active: false, createdAt: now, updatedAt: now },
  { id: 'j001', name: 'nation_etl_job', type: 'job', parentId: 'c001', active: true, agentId: 'LOCAL_AGENT', frequencyId: 'daily_01', createdAt: now, updatedAt: now },
  { id: 'j002', name: 'customer_csv_load', type: 'job', parentId: 'c001', active: true, agentId: 'LOCAL_AGENT', createdAt: now, updatedAt: now },
  { id: 'j003', name: 'sales_report', type: 'job', parentId: 'c002', active: false, agentId: 'LOCAL_AGENT', createdAt: now, updatedAt: now },
  { id: 'e002', name: 'Finance_ETL', type: 'entity', createdAt: now, updatedAt: now },
  { id: 'c003', name: 'GL_Jobs', type: 'category', parentId: 'e002', active: true, createdAt: now, updatedAt: now },
  { id: 'j004', name: 'gl_daily_close', type: 'job', parentId: 'c003', active: true, agentId: 'LOCAL_AGENT', frequencyId: 'daily_01', createdAt: now, updatedAt: now },
];

const seedSteps: JobStep[] = [
  {
    id: 's001', jobId: 'j001', name: 'LOAD_NATION', type: 'data_management', order: 1, enabled: true,
    config: {
      reader: { pluginType: 'jdbc_reader_generic', connectionId: 'conn_01', database: 'tp', tableName: 'nation', columns: [{ name: 'n_nationkey', type: 'INT' }, { name: 'n_name', type: 'VARCHAR', length: 25 }] },
      writer: { pluginType: 'jdbc_writer_generic', connectionId: 'conn_02', database: 'training', tableName: 'nation', extraProps: { create_table: true, drop_table: true } }
    },
    createdAt: now, updatedAt: now
  },
  {
    id: 's002', jobId: 'j002', name: 'LOAD_CUSTOMER', type: 'data_management', order: 1, enabled: true,
    config: {
      reader: { pluginType: 'csv_file_reader', filePath: '/data/input', fileName: 'customer.csv', delimiter: ',', columns: [{ name: 'cust_id', type: 'VARCHAR', length: 20 }, { name: 'cust_name', type: 'VARCHAR', length: 100 }, { name: 'email', type: 'VARCHAR', length: 200 }] },
      writer: { pluginType: 'jdbc_writer_generic', connectionId: 'conn_02', database: 'training', tableName: 'customer_csv', extraProps: { create_table: true, drop_table: true } }
    },
    createdAt: now, updatedAt: now
  },
  {
    id: 's003', jobId: 'j001', name: 'CHECK_COUNT', type: 'sql_executor', order: 2, enabled: true,
    config: { connectionId: 'conn_02', runMode: 'after', sqlStatement: 'SELECT COUNT(*) FROM training.nation;' },
    createdAt: now, updatedAt: now
  },
];

// ─── In-Memory Store ──────────────────────────────────────────────────────────

export class HierarchyStore {
  private nodes: Map<string, HierarchyNode> = new Map();
  private steps: Map<string, JobStep> = new Map();
  private versions: VersionHistory[] = [];

  constructor() {
    seedNodes.forEach(n => this.nodes.set(n.id, n));
    seedSteps.forEach(s => this.steps.set(s.id, s));
  }

  // ── Hierarchy CRUD ──

  /** 回傳完整巢狀樹狀結構 */
  getTree(): any[] {
    const entities = [...this.nodes.values()].filter(n => n.type === 'entity');
    const buildChildren = (parentId: string): any[] => {
      const children = [...this.nodes.values()].filter(n => n.parentId === parentId);
      return children.map(c => ({ ...c, children: c.type !== 'job' ? buildChildren(c.id) : undefined }));
    };
    return entities.map(e => ({ ...e, children: buildChildren(e.id) }));
  }

  getNode(id: string): HierarchyNode | undefined {
    return this.nodes.get(id);
  }

  createNode(data: { parentId?: string; type: NodeType; name: string }): HierarchyNode {
    const node: HierarchyNode = {
      id: `${data.type[0]}${crypto.randomBytes(4).toString('hex')}`,
      name: data.name,
      type: data.type,
      parentId: data.parentId,
      active: data.type === 'category' ? true : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.nodes.set(node.id, node);
    return node;
  }

  updateNode(id: string, patch: Partial<HierarchyNode>): HierarchyNode | null {
    const node = this.nodes.get(id);
    if (!node) return null;
    const updated = { ...node, ...patch, updatedAt: new Date().toISOString() };
    this.nodes.set(id, updated);
    return updated;
  }

  deleteNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;
    // 遞迴刪除所有子節點
    const deleteRecursive = (nid: string) => {
      [...this.nodes.values()].filter(n => n.parentId === nid).forEach(c => deleteRecursive(c.id));
      this.nodes.delete(nid);
      // 同時刪除其 steps
      [...this.steps.values()].filter(s => s.jobId === nid).forEach(s => this.steps.delete(s.id));
    };
    deleteRecursive(id);
    return true;
  }

  toggleActive(id: string): HierarchyNode | null {
    const node = this.nodes.get(id);
    if (!node) return null;
    return this.updateNode(id, { active: !node.active });
  }

  checkout(id: string, userId: string): HierarchyNode | null {
    const node = this.nodes.get(id);
    if (!node || node.checkedOutBy) return null;
    return this.updateNode(id, { checkedOutBy: userId, checkedOutAt: new Date().toISOString() });
  }

  checkin(id: string, userId: string, comment = ''): HierarchyNode | null {
    const node = this.nodes.get(id);
    if (!node || node.checkedOutBy !== userId) return null;
    // 儲存版本歷史
    const versionCount = this.versions.filter(v => v.nodeId === id).length;
    this.versions.push({
      version: versionCount + 1, nodeId: id,
      snapshot: { ...node },
      comment, committedBy: userId,
      committedAt: new Date().toISOString()
    });
    return this.updateNode(id, { checkedOutBy: undefined, checkedOutAt: undefined });
  }

  getVersionHistory(id: string): VersionHistory[] {
    return this.versions.filter(v => v.nodeId === id).sort((a, b) => b.version - a.version);
  }

  // ── Step CRUD ──

  getSteps(jobId: string): JobStep[] {
    return [...this.steps.values()].filter(s => s.jobId === jobId).sort((a, b) => a.order - b.order);
  }

  getStep(stepId: string): JobStep | undefined {
    return this.steps.get(stepId);
  }

  createStep(jobId: string, data: Partial<JobStep>): JobStep {
    const existing = this.getSteps(jobId);
    const step: JobStep = {
      id: `s${crypto.randomBytes(4).toString('hex')}`,
      jobId,
      name: data.name || 'New Step',
      type: data.type || 'data_management',
      order: data.order ?? (existing.length + 1),
      config: data.config || {},
      enabled: data.enabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.steps.set(step.id, step);
    return step;
  }

  updateStep(stepId: string, patch: Partial<JobStep>): JobStep | null {
    const step = this.steps.get(stepId);
    if (!step) return null;
    const updated = { ...step, ...patch, updatedAt: new Date().toISOString() };
    this.steps.set(stepId, updated);
    return updated;
  }

  deleteStep(stepId: string): boolean {
    return this.steps.delete(stepId);
  }

  reorderSteps(jobId: string, orderedIds: string[]): JobStep[] {
    orderedIds.forEach((id, idx) => {
      const s = this.steps.get(id);
      if (s && s.jobId === jobId) this.steps.set(id, { ...s, order: idx + 1, updatedAt: new Date().toISOString() });
    });
    return this.getSteps(jobId);
  }
}

// Singleton export
export const hierarchyStore = new HierarchyStore();
