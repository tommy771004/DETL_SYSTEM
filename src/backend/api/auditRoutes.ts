import { Router } from 'express';
import { AuditLogService } from '../iam/AuditLogService.js';

const router = Router();

router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const action = req.query.action as string;
  const userId = req.query.userId as string;

  try {
    const logs = AuditLogService.getLogs(limit, offset, { action, userId });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/log-event', (req, res) => {
    try {
        AuditLogService.log(req.body);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/verify', (req, res) => {
  try {
    const isValid = AuditLogService.verifyChain();
    res.json({ valid: isValid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', (req, res) => {
    try {
        const logs = AuditLogService.getLogs(10000, 0); // up to 10k for export
        const csvRows = [
            ['ID', 'Timestamp', 'User ID', 'Action', 'Resource', 'Details', 'Success', 'IP Address', 'Device ID', 'Hash'].join(','),
            ...logs.map(log => [
                log.id,
                log.timestamp,
                log.userId,
                log.action,
                log.resource,
                `"${log.details.replace(/"/g, '""')}"`,
                log.success,
                log.ipAddress,
                log.deviceId,
                log.hash
            ].join(','))
        ];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
        res.send(csvRows.join('\\n'));
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
