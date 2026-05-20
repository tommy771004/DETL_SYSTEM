/**
 * @file hierarchyRoutes.ts
 * @description JCS 作業階層 API —— Business Entity / Category / Job / Step 完整 CRUD。
 * Mount path: /api/jcs/hierarchy
 */

import express from 'express';
import { hierarchyStore, NodeType } from '../engine/HierarchyStore.js';

const router = express.Router();

// ─── Hierarchy CRUD ────────────────────────────────────────────────────────────

/** GET /api/jcs/hierarchy  → 完整樹狀結構 */
router.get('/', (_req, res) => {
  res.json(hierarchyStore.getTree());
});

/** GET /api/jcs/hierarchy/:id  → 單一節點 */
router.get('/:id', (req, res) => {
  const node = hierarchyStore.getNode(req.params.id);
  if (!node) return res.status(404).json({ error: 'Not found' });
  res.json(node);
});

/** POST /api/jcs/hierarchy  → 建立節點 */
router.post('/', (req, res) => {
  const { parentId, type, name } = req.body;
  if (!type || !name) return res.status(400).json({ error: 'type and name required' });
  const node = hierarchyStore.createNode({ parentId, type: type as NodeType, name });
  res.status(201).json(node);
});

/** PUT /api/jcs/hierarchy/:id  → 更新屬性（name/agentId/frequencyId/description...） */
router.put('/:id', (req, res) => {
  const updated = hierarchyStore.updateNode(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

/** PATCH /api/jcs/hierarchy/:id  → 部分更新（前端 rename 快速路徑） */
router.patch('/:id', (req, res) => {
  const updated = hierarchyStore.updateNode(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

/** DELETE /api/jcs/hierarchy/:id  → 刪除節點（含子節點） */
router.delete('/:id', (req, res) => {
  const ok = hierarchyStore.deleteNode(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

/** POST /api/jcs/hierarchy/:id/toggle  → 切換 active 狀態 */
router.post('/:id/toggle', (req, res) => {
  const updated = hierarchyStore.toggleActive(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

/** POST /api/jcs/hierarchy/:id/checkout  → 簽出編輯鎖 */
router.post('/:id/checkout', (req, res) => {
  const userId = (req as any).user?.id || req.body.userId || 'admin';
  const node = hierarchyStore.checkout(req.params.id, userId);
  if (!node) return res.status(409).json({ error: 'Already checked out or not found' });
  res.json(node);
});

/** POST /api/jcs/hierarchy/:id/checkin  → 簽入提交並記錄版本 */
router.post('/:id/checkin', (req, res) => {
  const userId = (req as any).user?.id || req.body.userId || 'admin';
  const comment = req.body.comment || '';
  const node = hierarchyStore.checkin(req.params.id, userId, comment);
  if (!node) return res.status(409).json({ error: 'Not checked out by this user or not found' });
  res.json(node);
});

/** GET /api/jcs/hierarchy/:id/versions  → 版本歷史 */
router.get('/:id/versions', (req, res) => {
  res.json(hierarchyStore.getVersionHistory(req.params.id));
});

// ─── Step CRUD ────────────────────────────────────────────────────────────────

/** GET /api/jcs/hierarchy/:jobId/steps  → 取得 Job 的所有 Steps */
router.get('/:jobId/steps', (req, res) => {
  const job = hierarchyStore.getNode(req.params.jobId);
  if (!job || job.type !== 'job') return res.status(404).json({ error: 'Job not found' });
  res.json(hierarchyStore.getSteps(req.params.jobId));
});

/** GET /api/jcs/hierarchy/:jobId/steps/:stepId  → 取得單一 Step */
router.get('/:jobId/steps/:stepId', (req, res) => {
  const step = hierarchyStore.getStep(req.params.stepId);
  if (!step || step.jobId !== req.params.jobId) return res.status(404).json({ error: 'Step not found' });
  res.json(step);
});

/** POST /api/jcs/hierarchy/:jobId/steps  → 新增 Step */
router.post('/:jobId/steps', (req, res) => {
  const job = hierarchyStore.getNode(req.params.jobId);
  if (!job || job.type !== 'job') return res.status(404).json({ error: 'Job not found' });
  const step = hierarchyStore.createStep(req.params.jobId, req.body);
  res.status(201).json(step);
});

/** PUT /api/jcs/hierarchy/:jobId/steps/:stepId  → 更新 Step */
router.put('/:jobId/steps/:stepId', (req, res) => {
  const step = hierarchyStore.updateStep(req.params.stepId, req.body);
  if (!step) return res.status(404).json({ error: 'Step not found' });
  res.json(step);
});

/** DELETE /api/jcs/hierarchy/:jobId/steps/:stepId  → 刪除 Step */
router.delete('/:jobId/steps/:stepId', (req, res) => {
  const ok = hierarchyStore.deleteStep(req.params.stepId);
  if (!ok) return res.status(404).json({ error: 'Step not found' });
  res.json({ success: true });
});

/** PUT /api/jcs/hierarchy/:jobId/steps/reorder  → 重新排序 Steps */
router.put('/:jobId/steps/reorder', (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds array required' });
  const steps = hierarchyStore.reorderSteps(req.params.jobId, orderedIds);
  res.json(steps);
});

export default router;
