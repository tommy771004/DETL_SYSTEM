/**
 * @file JobHierarchyStore.ts
 * @description 作業層級結構 Store（對應  JCS 的 Business Entity → Category → Job 結構）
 * 支援 Version Control（Check In / Check Out）
 */
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

export type NodeHierarchyType = 'entity' | 'category' | 'job';

export interface JobHierarchyNode {
  id: string;
  name: string;
  type: NodeHierarchyType;
  parentId: string | null;
  description?: string;
  active: boolean;
  agentId?: string;
  frequencyId?: string;
  // Version control fields (for jobs)
  checkoutBy?: string | null;
  checkoutAt?: string | null;
  currentVersion?: number;
  createdAt: string;
  updatedAt: string;
  children?: JobHierarchyNode[];
}

export interface JobVersion {
  id: string;
  jobId: string;
  version: number;
  config: string; // JSON serialized pipeline config
  comment: string;
  checkInBy: string;
  checkInAt: string;
}

export interface JobStep {
  id: string;
  jobId: string;
  name: string;
  type: 'data_management' | 'external_command' | 'sql_executor';
  order: number;
  config: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

class JobHierarchyStoreImpl {
  private db: Database.Database;

  constructor() {
    this.db = new Database(path.join(process.cwd(), 'dsystem.sqlite'));
    this.initDb();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS job_hierarchy (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('entity','category','job')),
        parent_id TEXT REFERENCES job_hierarchy(id) ON DELETE CASCADE,
        description TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        agent_id TEXT,
        frequency_id TEXT,
        checkout_by TEXT,
        checkout_at TEXT,
        current_version INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(name, parent_id)
      );

      CREATE TABLE IF NOT EXISTS job_versions (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES job_hierarchy(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        config TEXT NOT NULL DEFAULT '{}',
        comment TEXT,
        checkin_by TEXT NOT NULL,
        checkin_at TEXT NOT NULL,
        UNIQUE(job_id, version)
      );

      CREATE TABLE IF NOT EXISTS job_steps (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES job_hierarchy(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('data_management','external_command','sql_executor')),
        step_order INTEGER NOT NULL DEFAULT 1,
        config TEXT NOT NULL DEFAULT '{}',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS job_variables (
        job_id TEXT NOT NULL REFERENCES job_hierarchy(id) ON DELETE CASCADE,
        variables TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL,
        PRIMARY KEY (job_id)
      );
    `);

    const count = this.db.prepare('SELECT COUNT(*) as count FROM job_hierarchy WHERE type = ?').get('entity') as { count: number };
    if (count.count === 0) {
      this.seedDefaults();
    }
  }

  private seedDefaults() {
    const now = new Date().toISOString();

    const entity1Id = crypto.randomUUID();
    const cat1Id = crypto.randomUUID();
    const cat2Id = crypto.randomUUID();
    const job1Id = crypto.randomUUID();
    const job2Id = crypto.randomUUID();
    const job3Id = crypto.randomUUID();

    // Entity
    this.db.prepare(`INSERT INTO job_hierarchy (id,name,type,parent_id,description,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(entity1Id, 'Corp_ETL', 'entity', null, '企業 ETL 作業主體', 1, now, now);

    // Categories
    this.db.prepare(`INSERT INTO job_hierarchy (id,name,type,parent_id,description,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(cat1Id, 'ETL_Jobs', 'category', entity1Id, 'ETL 數據處理作業分類', 1, now, now);
    this.db.prepare(`INSERT INTO job_hierarchy (id,name,type,parent_id,description,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(cat2Id, 'Reporting', 'category', entity1Id, '報表產製作業分類', 0, now, now);

    // Jobs
    this.db.prepare(`INSERT INTO job_hierarchy (id,name,type,parent_id,description,active,current_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(job1Id, 'nation_job', 'job', cat1Id, '國際資料整合作業', 1, 1, now, now);
    this.db.prepare(`INSERT INTO job_hierarchy (id,name,type,parent_id,description,active,current_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(job2Id, 'sales_daily_job', 'job', cat1Id, '每日銷售資料同步', 1, 2, now, now);
    this.db.prepare(`INSERT INTO job_hierarchy (id,name,type,parent_id,description,active,current_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(job3Id, 'finance_report', 'job', cat2Id, '財務月報產製', 0, 1, now, now);

    // Seed some versions for job2
    const v1Id = crypto.randomUUID();
    const v2Id = crypto.randomUUID();
    this.db.prepare(`INSERT INTO job_versions (id,job_id,version,config,comment,checkin_by,checkin_at) VALUES (?,?,?,?,?,?,?)`)
      .run(v1Id, job2Id, 1, '{}', 'Initial version', 'admin_sys', now);
    this.db.prepare(`INSERT INTO job_versions (id,job_id,version,config,comment,checkin_by,checkin_at) VALUES (?,?,?,?,?,?,?)`)
      .run(v2Id, job2Id, 2, '{}', 'Added error handling step', 'etl_local_dev', now);
  }

  private rowToNode(row: any): JobHierarchyNode {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      parentId: row.parent_id,
      description: row.description,
      active: Boolean(row.active),
      agentId: row.agent_id,
      frequencyId: row.frequency_id,
      checkoutBy: row.checkout_by,
      checkoutAt: row.checkout_at,
      currentVersion: row.current_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public getAll(): JobHierarchyNode[] {
    const rows = this.db.prepare('SELECT * FROM job_hierarchy ORDER BY type ASC, name ASC').all();
    const nodes = rows.map(r => this.rowToNode(r));

    // Build tree structure
    const map = new Map<string, JobHierarchyNode>();
    const roots: JobHierarchyNode[] = [];

    for (const node of nodes) {
      node.children = [];
      map.set(node.id, node);
    }

    for (const node of nodes) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children!.push(node);
      } else if (!node.parentId) {
        roots.push(node);
      }
    }

    return roots;
  }

  public getById(id: string): JobHierarchyNode | null {
    const row = this.db.prepare('SELECT * FROM job_hierarchy WHERE id = ?').get(id);
    return row ? this.rowToNode(row as any) : null;
  }

  public create(data: { name: string; type: NodeHierarchyType; parentId?: string; description?: string }): JobHierarchyNode {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO job_hierarchy (id, name, type, parent_id, description, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, data.name, data.type, data.parentId || null, data.description || '', now, now);

    return this.getById(id)!;
  }

  public update(id: string, updates: { name?: string; description?: string; active?: boolean; agentId?: string; frequencyId?: string }): JobHierarchyNode | null {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE job_hierarchy SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        active = COALESCE(?, active),
        agent_id = COALESCE(?, agent_id),
        frequency_id = COALESCE(?, frequency_id),
        updated_at = ?
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.description ?? null,
      updates.active !== undefined ? (updates.active ? 1 : 0) : null,
      updates.agentId ?? null,
      updates.frequencyId ?? null,
      now, id
    );
    return this.getById(id);
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM job_hierarchy WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public move(id: string, newParentId: string): JobHierarchyNode | null {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE job_hierarchy SET parent_id = ?, updated_at = ? WHERE id = ?')
      .run(newParentId, now, id);
    return this.getById(id);
  }

  public toggleActive(id: string): JobHierarchyNode | null {
    const node = this.getById(id);
    if (!node) return null;
    const now = new Date().toISOString();
    const newActive = node.active ? 0 : 1;
    this.db.prepare('UPDATE job_hierarchy SET active = ?, updated_at = ? WHERE id = ?').run(newActive, now, id);
    return this.getById(id);
  }

  // --- Version Control ---

  public checkout(jobId: string, userId: string): { success: boolean; message: string } {
    const job = this.db.prepare('SELECT * FROM job_hierarchy WHERE id = ? AND type = ?').get(jobId, 'job') as any;
    if (!job) return { success: false, message: 'Job not found.' };
    if (job.checkout_by) {
      return { success: false, message: `Job is checked out by ${job.checkout_by}.` };
    }
    const now = new Date().toISOString();
    this.db.prepare('UPDATE job_hierarchy SET checkout_by = ?, checkout_at = ?, updated_at = ? WHERE id = ?')
      .run(userId, now, now, jobId);
    return { success: true, message: `Job checked out by ${userId}.` };
  }

  public checkin(jobId: string, userId: string, config: any, comment: string): { success: boolean; message: string; version?: number } {
    const job = this.db.prepare('SELECT * FROM job_hierarchy WHERE id = ? AND type = ?').get(jobId, 'job') as any;
    if (!job) return { success: false, message: 'Job not found.' };
    if (job.checkout_by !== userId) {
      return { success: false, message: `Only the checkout user (${job.checkout_by}) can check in.` };
    }

    const newVersion = (job.current_version || 0) + 1;
    const vId = crypto.randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO job_versions (id, job_id, version, config, comment, checkin_by, checkin_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(vId, jobId, newVersion, JSON.stringify(config), comment, userId, now);

    this.db.prepare(`
      UPDATE job_hierarchy SET checkout_by = NULL, checkout_at = NULL, current_version = ?, updated_at = ? WHERE id = ?
    `).run(newVersion, now, jobId);

    return { success: true, message: `Checked in as v${newVersion}.`, version: newVersion };
  }

  public releaseLock(jobId: string, userId: string): { success: boolean; message: string } {
    const job = this.db.prepare('SELECT * FROM job_hierarchy WHERE id = ?').get(jobId) as any;
    if (!job) return { success: false, message: 'Job not found.' };

    const now = new Date().toISOString();
    this.db.prepare('UPDATE job_hierarchy SET checkout_by = NULL, checkout_at = NULL, updated_at = ? WHERE id = ?')
      .run(now, jobId);
    return { success: true, message: 'Lock released.' };
  }

  public getVersionHistory(jobId: string): JobVersion[] {
    const rows = this.db.prepare('SELECT * FROM job_versions WHERE job_id = ? ORDER BY version DESC').all(jobId);
    return rows.map((r: any) => ({
      id: r.id,
      jobId: r.job_id,
      version: r.version,
      config: r.config,
      comment: r.comment,
      checkInBy: r.checkin_by,
      checkInAt: r.checkin_at
    }));
  }

  public rollback(jobId: string, targetVersion: number, userId: string): { success: boolean; message: string } {
    const vRow = this.db.prepare('SELECT * FROM job_versions WHERE job_id = ? AND version = ?').get(jobId, targetVersion) as any;
    if (!vRow) return { success: false, message: `Version ${targetVersion} not found.` };

    // Create new version with old config
    const job = this.db.prepare('SELECT current_version FROM job_hierarchy WHERE id = ?').get(jobId) as any;
    const newVersion = job.current_version + 1;
    const vId = crypto.randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO job_versions (id, job_id, version, config, comment, checkin_by, checkin_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(vId, jobId, newVersion, vRow.config, `Rollback to v${targetVersion}`, userId, now);

    this.db.prepare('UPDATE job_hierarchy SET current_version = ?, checkout_by = NULL, checkout_at = NULL, updated_at = ? WHERE id = ?')
      .run(newVersion, now, jobId);

    return { success: true, message: `Rolled back to v${targetVersion} as new v${newVersion}.` };
  }

  // ─── Step CRUD ───────────────────────────────────────────────────────────────

  private rowToStep(row: any): JobStep {
    return {
      id: row.id,
      jobId: row.job_id,
      name: row.name,
      type: row.type,
      order: row.step_order,
      config: JSON.parse(row.config || '{}'),
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public getSteps(jobId: string): JobStep[] {
    const rows = this.db.prepare('SELECT * FROM job_steps WHERE job_id = ? ORDER BY step_order ASC').all(jobId);
    return rows.map(r => this.rowToStep(r));
  }

  public getStep(stepId: string): JobStep | undefined {
    const row = this.db.prepare('SELECT * FROM job_steps WHERE id = ?').get(stepId);
    return row ? this.rowToStep(row as any) : undefined;
  }

  public createStep(jobId: string, data: Partial<JobStep>): JobStep {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const maxOrder = this.db.prepare('SELECT MAX(step_order) as m FROM job_steps WHERE job_id = ?').get(jobId) as any;
    const order = data.order ?? ((maxOrder?.m ?? 0) + 1);

    this.db.prepare(`
      INSERT INTO job_steps (id, job_id, name, type, step_order, config, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, jobId,
      data.name || 'New Step',
      data.type || 'data_management',
      order,
      JSON.stringify(data.config || {}),
      data.enabled !== false ? 1 : 0,
      now, now
    );
    return this.getStep(id)!;
  }

  public updateStep(stepId: string, data: Partial<JobStep>): JobStep | null {
    const now = new Date().toISOString();
    const existing = this.getStep(stepId);
    if (!existing) return null;

    this.db.prepare(`
      UPDATE job_steps SET
        name = ?,
        type = ?,
        step_order = ?,
        config = ?,
        enabled = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      data.name ?? existing.name,
      data.type ?? existing.type,
      data.order ?? existing.order,
      JSON.stringify(data.config ?? existing.config),
      (data.enabled !== undefined ? data.enabled : existing.enabled) ? 1 : 0,
      now, stepId
    );
    return this.getStep(stepId)!;
  }

  public deleteStep(stepId: string): boolean {
    const result = this.db.prepare('DELETE FROM job_steps WHERE id = ?').run(stepId);
    return result.changes > 0;
  }

  public reorderSteps(jobId: string, orderedIds: string[]): JobStep[] {
    const now = new Date().toISOString();
    const update = this.db.prepare('UPDATE job_steps SET step_order = ?, updated_at = ? WHERE id = ? AND job_id = ?');
    const reorderAll = this.db.transaction((ids: string[]) => {
      ids.forEach((id, idx) => update.run(idx + 1, now, id, jobId));
    });
    reorderAll(orderedIds);
    return this.getSteps(jobId);
  }

  // ── Variables ─────────────────────────────────────────────────────────────
  public getVariables(jobId: string): object[] {
    const row = this.db.prepare('SELECT variables FROM job_variables WHERE job_id = ?').get(jobId) as any;
    if (!row) return [];
    try { return JSON.parse(row.variables); } catch { return []; }
  }

  public saveVariables(jobId: string, variables: object[]): object[] {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO job_variables (job_id, variables, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET variables = excluded.variables, updated_at = excluded.updated_at
    `).run(jobId, JSON.stringify(variables), now);
    return variables;
  }
}

export const jobHierarchyStore = new JobHierarchyStoreImpl();
