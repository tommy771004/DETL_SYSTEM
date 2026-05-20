/**
 * @file SchedulerStore.ts
 * @description 排程管理 Store（對應  Admin UI 的 Frequency / Scheduler 功能）
 * 支援 Daily / Weekly / Monthly 排程，以及多個執行時段配置
 */
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'cron' | 'once' | 'on_demand';

export interface ScheduleConfig {
  id: string;
  name: string;
  frequencyType: FrequencyType;
  // Daily: 執行時間列表 (e.g. ["02:00", "14:00"])
  timesOfDay?: string[];
  // Weekly: 星期幾 0=Sun, 1=Mon, ...
  daysOfWeek?: number[];
  // Monthly: 每月哪幾日
  daysOfMonth?: number[];
  // Cron expression (advanced mode)
  cronExpression?: string;
  // Enabled/disabled
  enabled: boolean;
  // 綁定的 Job IDs
  assignedJobIds: string[];
  timezone: string;
  description?: string;
  lastTriggeredAt?: string;
  nextTriggerAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'error';
  concurrency: number;
  activeJobs: number;
  totalExecuted: number;
  lastHeartbeatAt?: string;
  version: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

class SchedulerStoreImpl {
  private db: Database.Database;

  constructor() {
    this.db = new Database(path.join(process.cwd(), 'dsystem.sqlite'));
    this.initDb();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        frequency_type TEXT NOT NULL,
        times_of_day TEXT DEFAULT '[]',
        days_of_week TEXT DEFAULT '[]',
        days_of_month TEXT DEFAULT '[]',
        cron_expression TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        assigned_job_ids TEXT DEFAULT '[]',
        timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
        description TEXT,
        last_triggered_at TEXT,
        next_trigger_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 8088,
        status TEXT NOT NULL DEFAULT 'offline',
        concurrency INTEGER NOT NULL DEFAULT 5,
        active_jobs INTEGER NOT NULL DEFAULT 0,
        total_executed INTEGER NOT NULL DEFAULT 0,
        last_heartbeat_at TEXT,
        version TEXT NOT NULL DEFAULT '5.0.0',
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const schedCount = this.db.prepare('SELECT COUNT(*) as count FROM schedules').get() as { count: number };
    if (schedCount.count === 0) {
      this.seedSchedules();
    }

    const agentCount = this.db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
    if (agentCount.count === 0) {
      this.seedAgents();
    }
  }

  private seedSchedules() {
    const now = new Date().toISOString();
    const defaults: Omit<ScheduleConfig, 'id'>[] = [
      {
        name: 'Daily_ETL_02AM',
        frequencyType: 'daily',
        timesOfDay: ['02:00', '14:00'],
        enabled: true,
        assignedJobIds: [],
        timezone: 'Asia/Taipei',
        description: '每日凌晨 2 點與下午 2 點執行 ETL',
        nextTriggerAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Weekly_Finance_Report',
        frequencyType: 'weekly',
        timesOfDay: ['08:00'],
        daysOfWeek: [1], // Monday
        enabled: true,
        assignedJobIds: [],
        timezone: 'Asia/Taipei',
        description: '每週一早上 8 點產生財務報表',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Monthly_Sales_Summary',
        frequencyType: 'monthly',
        timesOfDay: ['01:00'],
        daysOfMonth: [1],
        enabled: false,
        assignedJobIds: [],
        timezone: 'Asia/Taipei',
        description: '每月 1 日凌晨 1 點彙總銷售資料',
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const s of defaults) {
      this.createSchedule(s);
    }
  }

  private seedAgents() {
    const now = new Date().toISOString();
    const agents: Omit<AgentConfig, 'id'>[] = [
      {
        name: 'LOCAL_AGENT',
        host: '127.0.0.1',
        port: 8088,
        status: 'online',
        concurrency: 5,
        activeJobs: 2,
        totalExecuted: 1847,
        lastHeartbeatAt: new Date().toISOString(),
        version: '5.0.1',
        tags: ['local', 'primary'],
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'WORKER_NODE_1',
        host: '192.168.1.101',
        port: 8088,
        status: 'online',
        concurrency: 10,
        activeJobs: 4,
        totalExecuted: 3214,
        lastHeartbeatAt: new Date(Date.now() - 30000).toISOString(),
        version: '5.0.1',
        tags: ['worker', 'high-concurrency'],
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'WORKER_NODE_2',
        host: '192.168.1.102',
        port: 8088,
        status: 'offline',
        concurrency: 5,
        activeJobs: 0,
        totalExecuted: 892,
        version: '5.0.0',
        tags: ['worker', 'backup'],
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const a of agents) {
      this.createAgent(a);
    }
  }

  // --- Schedules ---

  private rowToSchedule(row: any): ScheduleConfig {
    return {
      id: row.id,
      name: row.name,
      frequencyType: row.frequency_type,
      timesOfDay: JSON.parse(row.times_of_day || '[]'),
      daysOfWeek: JSON.parse(row.days_of_week || '[]'),
      daysOfMonth: JSON.parse(row.days_of_month || '[]'),
      cronExpression: row.cron_expression,
      enabled: Boolean(row.enabled),
      assignedJobIds: JSON.parse(row.assigned_job_ids || '[]'),
      timezone: row.timezone,
      description: row.description,
      lastTriggeredAt: row.last_triggered_at,
      nextTriggerAt: row.next_trigger_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public getAllSchedules(): ScheduleConfig[] {
    const rows = this.db.prepare('SELECT * FROM schedules ORDER BY name ASC').all();
    return rows.map(r => this.rowToSchedule(r));
  }

  public getScheduleById(id: string): ScheduleConfig | null {
    const row = this.db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
    return row ? this.rowToSchedule(row as any) : null;
  }

  public createSchedule(config: Omit<ScheduleConfig, 'id'>): ScheduleConfig {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO schedules (
        id, name, frequency_type, times_of_day, days_of_week, days_of_month,
        cron_expression, enabled, assigned_job_ids, timezone, description,
        last_triggered_at, next_trigger_at, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, config.name, config.frequencyType,
      JSON.stringify(config.timesOfDay || []),
      JSON.stringify(config.daysOfWeek || []),
      JSON.stringify(config.daysOfMonth || []),
      config.cronExpression || null,
      config.enabled ? 1 : 0,
      JSON.stringify(config.assignedJobIds || []),
      config.timezone || 'Asia/Taipei',
      config.description || '',
      config.lastTriggeredAt || null,
      config.nextTriggerAt || null,
      config.createdAt || now,
      config.updatedAt || now
    );

    return this.getScheduleById(id)!;
  }

  public updateSchedule(id: string, updates: Partial<ScheduleConfig>): ScheduleConfig | null {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE schedules SET
        name = COALESCE(?, name),
        frequency_type = COALESCE(?, frequency_type),
        times_of_day = COALESCE(?, times_of_day),
        days_of_week = COALESCE(?, days_of_week),
        days_of_month = COALESCE(?, days_of_month),
        cron_expression = COALESCE(?, cron_expression),
        enabled = COALESCE(?, enabled),
        assigned_job_ids = COALESCE(?, assigned_job_ids),
        timezone = COALESCE(?, timezone),
        description = COALESCE(?, description),
        next_trigger_at = COALESCE(?, next_trigger_at),
        updated_at = ?
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.frequencyType ?? null,
      updates.timesOfDay ? JSON.stringify(updates.timesOfDay) : null,
      updates.daysOfWeek ? JSON.stringify(updates.daysOfWeek) : null,
      updates.daysOfMonth ? JSON.stringify(updates.daysOfMonth) : null,
      updates.cronExpression ?? null,
      updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : null,
      updates.assignedJobIds ? JSON.stringify(updates.assignedJobIds) : null,
      updates.timezone ?? null,
      updates.description ?? null,
      updates.nextTriggerAt ?? null,
      now, id
    );
    return this.getScheduleById(id);
  }

  public deleteSchedule(id: string): boolean {
    const result = this.db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public toggleSchedule(id: string): ScheduleConfig | null {
    const sched = this.db.prepare('SELECT enabled FROM schedules WHERE id = ?').get(id) as any;
    if (!sched) return null;
    const now = new Date().toISOString();
    this.db.prepare('UPDATE schedules SET enabled = ?, updated_at = ? WHERE id = ?')
      .run(sched.enabled ? 0 : 1, now, id);
    return this.getScheduleById(id);
  }

  // --- Agents ---

  private rowToAgent(row: any): AgentConfig {
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      status: row.status,
      concurrency: row.concurrency,
      activeJobs: row.active_jobs,
      totalExecuted: row.total_executed,
      lastHeartbeatAt: row.last_heartbeat_at,
      version: row.version,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public getAllAgents(): AgentConfig[] {
    const rows = this.db.prepare('SELECT * FROM agents ORDER BY name ASC').all();
    return rows.map(r => this.rowToAgent(r));
  }

  public createAgent(config: Omit<AgentConfig, 'id'>): AgentConfig {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO agents (
        id, name, host, port, status, concurrency, active_jobs, total_executed,
        last_heartbeat_at, version, tags, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, config.name, config.host, config.port,
      config.status, config.concurrency, config.activeJobs, config.totalExecuted,
      config.lastHeartbeatAt || null, config.version,
      JSON.stringify(config.tags || []),
      config.createdAt || now, config.updatedAt || now
    );

    return this.getAllAgents().find(a => a.id === id)!;
  }

  public updateAgentHeartbeat(agentId: string, activeJobs: number): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE agents SET status = 'online', active_jobs = ?, last_heartbeat_at = ?, updated_at = ? WHERE id = ?
    `).run(activeJobs, now, now, agentId);
  }

  public updateAgent(id: string, patch: Partial<Pick<AgentConfig, 'name' | 'host' | 'port' | 'concurrency' | 'tags' | 'status'>>): AgentConfig | null {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
    if (patch.host !== undefined) { fields.push('host = ?'); values.push(patch.host); }
    if (patch.port !== undefined) { fields.push('port = ?'); values.push(patch.port); }
    if (patch.concurrency !== undefined) { fields.push('concurrency = ?'); values.push(patch.concurrency); }
    if (patch.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(patch.tags)); }
    if (patch.status !== undefined) { fields.push('status = ?'); values.push(patch.status); }
    if (fields.length === 0) return this.getAllAgents().find(a => a.id === id) || null;

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const result = this.db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    if (result.changes === 0) return null;
    return this.getAllAgents().find(a => a.id === id) || null;
  }

  public deleteAgent(id: string): boolean {
    const result = this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

export const schedulerStore = new SchedulerStoreImpl();
