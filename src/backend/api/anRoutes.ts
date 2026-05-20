import express from 'express';
import { AddressNormalizer } from '../an/AddressNormalizer.js';

const router = express.Router();

// 即時 API 校正 (單筆)
router.post('/normalize', (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
       res.status(400).json({ error: 'Address is required' });
       return;
    }
    const result = AddressNormalizer.normalize(address);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 批次大量校正 API
router.post('/normalize/batch', (req, res) => {
  try {
    const { addresses } = req.body;
    if (!Array.isArray(addresses)) {
       res.status(400).json({ error: 'Addresses must be an array of strings' });
       return;
    }
    const results = AddressNormalizer.normalizeBatch(addresses);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
