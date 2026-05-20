import { Router } from 'express';
import { UnstructuredDataExtractor } from '../engine/UnstructuredExtractor.js';
import { MongoDBConnector, HDFSConnector } from '../connectors/Implementations.js';

const router = Router();

router.post('/extract/pdf', (req, res) => {
    // Expect base64 buffer or we use stub
    try {
        const dummyBuffer = Buffer.from('dummy pdf binary data');
        const result = UnstructuredDataExtractor.extractFromPDF(dummyBuffer);
        res.json({ success: true, ...result });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/extract/log', (req, res) => {
    const { logData } = req.body;
    try {
        if (!logData) {
            return res.status(400).json({ error: 'Missing logData' });
        }
        const result = UnstructuredDataExtractor.parseLogFile(logData);
        res.json({ success: true, count: result.length, data: result });
    } catch(err: any) {
         res.status(500).json({ error: err.message });
    }
});

router.post('/extract/web', async (req, res) => {
    const { url } = req.body;
    try {
        if (!url) {
            return res.status(400).json({ error: 'Missing url' });
        }
        const result = await UnstructuredDataExtractor.extractFromWeb(url);
        res.json({ success: true, ...result });
    } catch(err: any) {
         res.status(500).json({ error: err.message });
    }
});

router.post('/connect/nosql', async (req, res) => {
    const { host, port } = req.body;
    try {
        const conn = new MongoDBConnector();
        await conn.connect({ host: host || 'localhost', port: port || 27017 });
        const metadata = conn.getMetadata();
        res.json({ success: true, message: `Connected to NoSQL DB`, metadata });
    } catch(err: any) {
         res.status(500).json({ error: err.message });
    }
});

router.post('/connect/hdfs', async (req, res) => {
    const { host, port } = req.body;
    try {
        const conn = new HDFSConnector();
        await conn.connect({ host: host || 'hadoop-namenode', port: port || 9000 });
        const metadata = conn.getMetadata();
        res.json({ success: true, message: `Connected to HDFS NameNode`, metadata });
    } catch(err: any) {
         res.status(500).json({ error: err.message });
    }
});

export default router;
