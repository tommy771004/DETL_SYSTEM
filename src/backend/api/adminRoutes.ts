/**
 * @file adminRoutes.ts
 * @description Admin 管理 API：Connection / Agent / Scheduler / Settings
 * 掛載路徑: /api/admin
 */
import express from 'express';
import { connectionStore } from '../engine/ConnectionStore.js';
import { schedulerStore } from '../engine/SchedulerStore.js';

const router = express.Router();

// ─── Settings Store (in-memory, lightweight) ───────────────────────────────
const systemSettings = {
  platform_name: 'DSystem ETL Platform',
  default_timezone: 'Asia/Taipei',
  max_concurrent_jobs: 10,
  log_retention_days: 90,
  enable_audit_log: true,
  enable_pii_masking: true,
  notification_email: '',
  gemini_api_key_configured: !!process.env.GEMINI_API_KEY,
  redis_host: process.env.REDIS_HOST || '127.0.0.1',
  redis_port: parseInt(process.env.REDIS_PORT || '6379'),
};

// ═══════════════════════════════════════════════
// Connections
// ═══════════════════════════════════════════════

// GET /api/admin/connections
router.get('/connections', (_req, res) => {
  try {
    const connections = connectionStore.getAll();
    res.json({ connections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/connections/:id
router.get('/connections/:id', (req, res) => {
  try {
    const conn = connectionStore.getById(req.params.id);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    res.json(conn);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/connections
router.post('/connections', (req, res) => {
  try {
    const { name, type, description, host, port, database, username, password,
      schema, tnsServiceName, jdbcUrl, ftpPath, baseUrl, authToken, connectionUri, filePath } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    const conn = connectionStore.create({
      name, type, description, host, port: port ? Number(port) : undefined,
      database, username, password, schema, tnsServiceName, jdbcUrl,
      ftpPath, baseUrl, authToken, connectionUri, filePath,
      status: 'untested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json(conn);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Connection name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/connections/:id
router.put('/connections/:id', (req, res) => {
  try {
    const updated = connectionStore.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Connection not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/connections/:id/test
router.post('/connections/:id/test', (req, res) => {
  try {
    const result = connectionStore.testConnection(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/connections/:id
router.delete('/connections/:id', (req, res) => {
  try {
    const deleted = connectionStore.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Connection not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// Agents
// ═══════════════════════════════════════════════

// GET /api/admin/agents
router.get('/agents', (_req, res) => {
  try {
    const agents = schedulerStore.getAllAgents();
    res.json({ agents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/agents — 新增 Agent 節點
router.post('/agents', (req, res) => {
  try {
    const { name, host, port, concurrency, tags } = req.body;
    if (!name || !host) {
      return res.status(400).json({ error: 'name and host are required' });
    }
    const agent = schedulerStore.createAgent({
      name, host,
      port: port ?? 8088,
      status: 'offline',
      concurrency: concurrency ?? 5,
      activeJobs: 0,
      totalExecuted: 0,
      version: '5.0.1',
      tags: tags ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    res.status(201).json(agent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/agents/:id/heartbeat — Agent 心跳更新
router.post('/agents/:id/heartbeat', (req, res) => {
  try {
    const activeJobs = req.body.activeJobs ?? 0;
    schedulerStore.updateAgentHeartbeat(req.params.id, activeJobs);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/agents/:id — 更新 Agent
router.put('/agents/:id', (req, res) => {
  try {
    const updated = schedulerStore.updateAgent(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Agent not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/agents/:id — 刪除 Agent
router.delete('/agents/:id', (req, res) => {
  try {
    const deleted = schedulerStore.deleteAgent(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// Schedules
// ═══════════════════════════════════════════════

// GET /api/admin/schedules
router.get('/schedules', (_req, res) => {
  try {
    const schedules = schedulerStore.getAllSchedules();
    res.json({ schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/schedules
router.post('/schedules', (req, res) => {
  try {
    const { name, frequencyType, timesOfDay, daysOfWeek, daysOfMonth,
      cronExpression, enabled, assignedJobIds, timezone, description } = req.body;

    if (!name || !frequencyType) {
      return res.status(400).json({ error: 'name and frequencyType are required' });
    }

    const schedule = schedulerStore.createSchedule({
      name, frequencyType, timesOfDay, daysOfWeek, daysOfMonth,
      cronExpression, enabled: enabled ?? true,
      assignedJobIds: assignedJobIds ?? [],
      timezone: timezone ?? 'Asia/Taipei',
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json(schedule);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Schedule name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/schedules/:id
router.put('/schedules/:id', (req, res) => {
  try {
    const updated = schedulerStore.updateSchedule(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Schedule not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/schedules/:id/toggle
router.post('/schedules/:id/toggle', (req, res) => {
  try {
    const updated = schedulerStore.toggleSchedule(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Schedule not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/schedules/:id
router.delete('/schedules/:id', (req, res) => {
  try {
    const deleted = schedulerStore.deleteSchedule(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// System Settings
// ═══════════════════════════════════════════════

// GET /api/admin/settings
router.get('/settings', (_req, res) => {
  res.json({ settings: systemSettings });
});

// PUT /api/admin/settings
router.put('/settings', (req, res) => {
  const allowed = [
    'platform_name', 'default_timezone', 'max_concurrent_jobs',
    'log_retention_days', 'enable_audit_log', 'enable_pii_masking', 'notification_email'
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (systemSettings as any)[key] = req.body[key];
    }
  }
  res.json({ settings: systemSettings });
});

export default router;
