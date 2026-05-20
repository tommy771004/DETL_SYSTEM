import { Router } from 'express';
import { streamEngine } from '../engine/StreamEngine.js';

const router = Router();

router.get('/active', (req, res) => {
    res.json({ streams: streamEngine.getActiveStreams() });
});

router.post('/start', (req, res) => {
  const { topic, type } = req.body;
  if (!topic || !type) {
      return res.status(400).json({ error: 'Missing topic or type' });
  }
  streamEngine.startStream(topic, type);
  res.json({ success: true, topic });
});

router.post('/stop', (req, res) => {
  const { topic } = req.body;
  streamEngine.stopStream(topic);
  res.json({ success: true, topic });
});

export default router;
