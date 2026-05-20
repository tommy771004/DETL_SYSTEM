/**
 * @file jcsHierarchyRoutes.ts
 * @description JCS 作業層級 API：Business Entity / Category / Job CRUD + Version Control
 * 掛載路徑: /api/jcs/hierarchy
 */
import express from 'express';
import { jobHierarchyStore } from '../engine/JobHierarchyStore.js';

const router = express.Router();

// ─── 取得整棵樹 ──────────────────────────────────────────
// GET /api/jcs/hierarchy
router.get('/', (_req, res) => {
  try {
    const tree = jobHierarchyStore.getAll();
    res.json({ tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jcs/hierarchy/:id
router.get('/:id', (req, res) => {
  try {
    const node = jobHierarchyStore.getById(req.params.id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json(node);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CRUD ────────────────────────────────────────────────
// POST /api/jcs/hierarchy
router.post('/', (req, res) => {
  try {
    const { name, type, parentId, description } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }
    if (!['entity', 'category', 'job'].includes(type)) {
      return res.status(400).json({ error: 'type must be entity, category, or job' });
    }
    const node = jobHierarchyStore.create({ name, type, parentId, description });
    res.status(201).json(node);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Node with this name already exists under the same parent' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jcs/hierarchy/:id
router.put('/:id', (req, res) => {
  try {
    const { name, description, active, agentId, frequencyId } = req.body;
    const updated = jobHierarchyStore.update(req.params.id, { name, description, active, agentId, frequencyId });
    if (!updated) return res.status(404).json({ error: 'Node not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jcs/hierarchy/:id
router.delete('/:id', (req, res) => {
  try {
    const deleted = jobHierarchyStore.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Node not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jcs/hierarchy/:id/move
router.put('/:id/move', (req, res) => {
  try {
    const { newParentId } = req.body;
    if (!newParentId) return res.status(400).json({ error: 'newParentId is required' });
    const updated = jobHierarchyStore.move(req.params.id, newParentId);
    if (!updated) return res.status(404).json({ error: 'Node not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Version Control ─────────────────────────────────────
// POST /api/jcs/hierarchy/:id/checkout
router.post('/:id/checkout', (req, res) => {
  try {
    const userId = req.body.userId || 'system';
    const result = jobHierarchyStore.checkout(req.params.id, userId);
    if (!result.success) return res.status(409).json({ error: result.message });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jcs/hierarchy/:id/checkin
router.post('/:id/checkin', (req, res) => {
  try {
    const { userId, config, comment } = req.body;
    if (!userId || !comment) {
      return res.status(400).json({ error: 'userId and comment are required' });
    }
    const result = jobHierarchyStore.checkin(req.params.id, userId, config || {}, comment);
    if (!result.success) return res.status(409).json({ error: result.message });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jcs/hierarchy/:id/release-lock
router.post('/:id/release-lock', (req, res) => {
  try {
    const userId = req.body.userId || 'system';
    const result = jobHierarchyStore.releaseLock(req.params.id, userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jcs/hierarchy/:id/versions
router.get('/:id/versions', (req, res) => {
  try {
    const versions = jobHierarchyStore.getVersionHistory(req.params.id);
    res.json({ versions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jcs/hierarchy/:id/rollback
router.post('/:id/rollback', (req, res) => {
  try {
    const { targetVersion, userId } = req.body;
    if (!targetVersion || !userId) {
      return res.status(400).json({ error: 'targetVersion and userId are required' });
    }
    const result = jobHierarchyStore.rollback(req.params.id, Number(targetVersion), userId);
    if (!result.success) return res.status(404).json({ error: result.message });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Toggle Active ────────────────────────────────────────
// POST /api/jcs/hierarchy/:id/toggle
router.post('/:id/toggle', (req, res) => {
  try {
    const updated = jobHierarchyStore.toggleActive(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Node not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Rename (PATCH) ──────────────────────────────────────
// PATCH /api/jcs/hierarchy/:id
router.patch('/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const updated = jobHierarchyStore.update(req.params.id, { name });
    if (!updated) return res.status(404).json({ error: 'Node not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Run Job ──────────────────────────────────────────────
// POST /api/jcs/hierarchy/:id/run
router.post('/:id/run', async (req, res) => {
  try {
    const node = jobHierarchyStore.getById(req.params.id);
    if (!node) return res.status(404).json({ error: 'Job not found' });
    if (node.type !== 'job') return res.status(400).json({ error: 'Only job nodes can be run' });

    // Dynamic import to avoid circular dependency with jcsController
    const { jcsController } = await import('./pipelineRoutes.js');
    const jobInfo = await jcsController.dispatchJob(req.params.id, {
      payload: { config: { nodes: [], edges: [], variables: {} }, variables: req.body.variables || {} },
      triggeredBy: req.body.userId || 'manual'
    });

    res.json({ success: true, message: `Job "${node.name}" dispatched`, jobId: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Step CRUD ───────────────────────────────────────────
// GET /api/jcs/hierarchy/:jobId/steps
router.get('/:jobId/steps', (req, res) => {
  try {
    const steps = jobHierarchyStore.getSteps(req.params.jobId);
    res.json(steps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jcs/hierarchy/:jobId/steps/:stepId
router.get('/:jobId/steps/:stepId', (req, res) => {
  try {
    const step = jobHierarchyStore.getStep(req.params.stepId);
    if (!step || step.jobId !== req.params.jobId) return res.status(404).json({ error: 'Step not found' });
    res.json(step);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jcs/hierarchy/:jobId/steps
router.post('/:jobId/steps', (req, res) => {
  try {
    const step = jobHierarchyStore.createStep(req.params.jobId, req.body);
    res.status(201).json(step);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jcs/hierarchy/:jobId/steps/:stepId
router.put('/:jobId/steps/:stepId', (req, res) => {
  try {
    const step = jobHierarchyStore.updateStep(req.params.stepId, req.body);
    if (!step) return res.status(404).json({ error: 'Step not found' });
    res.json(step);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jcs/hierarchy/:jobId/steps/:stepId
router.delete('/:jobId/steps/:stepId', (req, res) => {
  try {
    const ok = jobHierarchyStore.deleteStep(req.params.stepId);
    if (!ok) return res.status(404).json({ error: 'Step not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jcs/hierarchy/:jobId/steps/reorder
router.put('/:jobId/steps/reorder', (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds array required' });
    const steps = jobHierarchyStore.reorderSteps(req.params.jobId, orderedIds);
    res.json(steps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Variables ─────────────────────────────────────────────────────────────────
// GET /api/jcs/hierarchy/:jobId/variables
router.get('/:jobId/variables', (req, res) => {
  try {
    const vars = jobHierarchyStore.getVariables(req.params.jobId);
    res.json(vars);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jcs/hierarchy/:jobId/variables
router.put('/:jobId/variables', (req, res) => {
  try {
    const { variables } = req.body;
    if (!Array.isArray(variables)) return res.status(400).json({ error: 'variables array required' });
    const saved = jobHierarchyStore.saveVariables(req.params.jobId, variables);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
