import { Router } from 'express';
import { mdmService } from '../engine/MDMService.js';
import { AuditLogService } from '../iam/AuditLogService.js';

const router = Router();

router.get('/suggestions', (req, res) => {
  try {
    const suggestions = mdmService.getPendingSuggestions();
    res.json(suggestions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/resolve', (req, res) => {
  const { suggestionId, action, customGoldenConfig } = req.body;
  
  try {
    const result = mdmService.resolveSuggestion(suggestionId, action, customGoldenConfig);
    
    // Log the MDM action to IAM Audit Logs
    AuditLogService.log({
        userId: 'data_steward_1', // Assuming authenticated user role
        action: `mdm_suggestion_${action.toLowerCase()}`,
        resource: suggestionId,
        details: `Resolved suggestion with action: ${action}`,
        success: true,
        ipAddress: req.ip
    });

    res.json(result);
  } catch (err: any) {
    AuditLogService.log({
        userId: 'data_steward_1',
        action: `mdm_suggestion_${action?.toLowerCase() || 'unknown'}`,
        resource: suggestionId || 'unknown',
        details: `Failed to resolve suggestion: ${err.message}`,
        success: false,
        ipAddress: req.ip
    });
    res.status(500).json({ error: err.message });
  }
});

router.post('/recalculate', (req, res) => {
    try {
        mdmService.runMatchEngine();
        res.json({ success: true });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
