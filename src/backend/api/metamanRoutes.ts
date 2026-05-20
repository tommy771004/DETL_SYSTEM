import express from 'express';
import { GlobalPipelineStore } from '../engine/Store.js';
import { DataLineageAnalyzer } from '../metaman/DataLineageAnalyzer.js';
import { DataProfiler } from '../metaman/DataProfiler.js';

const router = express.Router();

router.get('/lineage', (req, res) => {
  try {
    const analyzer = new DataLineageAnalyzer(GlobalPipelineStore);
    const lineage = analyzer.getGlobalLineage();
    res.json(lineage);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/impact', (req, res) => {
  try {
    const keyword = req.query.keyword as string;
    const analyzer = new DataLineageAnalyzer(GlobalPipelineStore);
    const impact = analyzer.getImpactAnalysis(keyword || '');
    res.json(impact);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/quality/profiling', async (req, res) => {
  try {
    // 實務上這裡會是排程定期跑，這邊只要 API 被呼叫就觸發掃描/回傳快取
    await DataProfiler.runAutoProfiling();
    const profiles = DataProfiler.getProfiles();
    res.json({ profiles });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
