import { Router } from 'express';
import { piiMaskingService } from '../engine/PIIMaskingService.js';
import { AuditLogService } from '../iam/AuditLogService.js';

const router = Router();

router.post('/mask', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  try {
    const result = await piiMaskingService.maskText(text);
    
    // Log the masking action
    AuditLogService.log({
      userId: 'system_dp',
      action: 'pii_masking',
      resource: `Vault:${result.vaultId}`,
      details: `Masked ${result.entities.length} PII entities`,
      success: true
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/unmask', async (req, res) => {
  const { vaultId, maskedText, reason, userId } = req.body;
  
  if (!vaultId || !maskedText || !reason || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const unmaskedText = await piiMaskingService.unmaskText(vaultId, maskedText);

    // High severity audit log for unmasking
    AuditLogService.log({
      userId: userId,
      action: 'pii_unmasking',
      resource: `Vault:${vaultId}`,
      details: `De-anonymized text. Reason: ${reason}`,
      success: true
    });

    res.json({ success: true, unmaskedText });
  } catch (err: any) {
    AuditLogService.log({
      userId: userId,
      action: 'pii_unmasking_failed',
      resource: `Vault:${vaultId}`,
      details: `Failed to de-anonymize: ${err.message}. Reason: ${reason}`,
      success: false
    });
    res.status(403).json({ error: err.message });
  }
});

router.get('/vault/stats', (req, res) => {
    res.json({ size: piiMaskingService.getVaultSize() });
});

export default router;
