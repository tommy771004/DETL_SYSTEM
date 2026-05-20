/**
 * @file server.ts
 * @description The main entry point for the AI-ETL Backend Express Server.
 * 負責初始化 Express、掛載路由、設定 BullMQ 及啟動 Web Server，並提供前端靜態資源服務。
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http'; // 引入 http 模組
import pipelineRoutes from './src/backend/api/pipelineRoutes.js';
import metamanRoutes from './src/backend/api/metamanRoutes.js';
import { socketManager } from './src/backend/websocket/socketManager.js';
import { JCSWorker } from './src/backend/jcs/JCSWorker.js';
import { QueueEvents } from './src/backend/jcs/BullMQMock.js';

import { EventDrivenFileMonitor } from './src/backend/jcs/EventDrivenFileMonitor.js';
import { pluginRegistry } from './src/backend/engine/NodeRegistry.js';
import { CustomScriptNode } from './src/backend/plugins/nodes/CustomScriptNode.js';
import { SourceApiNode, DestDbNode, TransformAINode } from './src/backend/plugins/nodes/BasicNodes.js';
import { SourceDbNode, DestDbRealNode } from './src/backend/plugins/nodes/DbNodes.js';
import { TransformCleanNode, TransformValidateNode, SourceKafkaNode, SourceNoSQLNode } from './src/backend/plugins/nodes/AdvancedNodes.js';
import { SourceCSVNode } from './src/backend/plugins/nodes/SourceCSVNode.js';
import { ZeroLandingMaskingNode } from './src/backend/plugins/nodes/ZeroLandingMaskingNode.js';
import { AddressNormalizationNode, AddressGeocodingNode } from './src/backend/plugins/nodes/AddressNormalizationNode.js';
import { Orchestrator } from './src/backend/engine/Orchestrator.js';

import anRoutes from './src/backend/api/anRoutes.js';
import iamRoutes from './src/backend/api/iamRoutes.js';
import auditRoutes from './src/backend/api/auditRoutes.js';
import mdmRoutes from './src/backend/api/mdmRoutes.js';
import streamRoutes from './src/backend/api/streamRoutes.js';
import unstructuredRoutes from './src/backend/api/unstructuredRoutes.js';
import dpRoutes from './src/backend/api/dpRoutes.js';

import { createServer as createViteServer } from 'vite';

async function startServer() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  console.log('Starting AI-ETL Backend server initialize sequence...');
  const app = express();
  const httpServer = createServer(app);
  console.log('HTTP Server and Express app created.');

  // 初始化 WebSocket
  try {
    socketManager.init(httpServer);
    console.log('WebSocket manager initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize WebSocket manager:', err);
  }

  // 啟動 JCS 事件驅動檔案監聽器 (監聽專案根目錄底下的 ftp_inbox 資料夾)
  console.log('Preparing to start file monitor...');
  const ftpInboxPath = path.join(__dirname, 'ftp_inbox');
  try {
    new EventDrivenFileMonitor(ftpInboxPath).start();
    console.log('Event-driven file monitor started successfully.');
  } catch (err) {
    console.error('Failed to start file monitor:', err);
  }

  // 初始化單個 JCS Worker 作為範例展示
  console.log('Preparing to start JCS Worker...');
  const redisConfig = { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 };
  const myWorkerId = `worker-node-${Math.random().toString(36).substring(7)}`;
  try {
    new JCSWorker(redisConfig, myWorkerId);
    console.log('JCS Worker started successfully.');
  } catch (err) {
    console.error('Failed to start JCS Worker:', err);
  }

  // JCS 與 WebSocket 橋接
  console.log('Establishing Queue events bridge...');
  try {
    const queueEvents = new QueueEvents('jcs-jobs', { connection: redisConfig });
    queueEvents.on('progress', ({ jobId, data }) => {
      socketManager.broadcastToJob(jobId, 'node-progress', data);
    });
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      socketManager.broadcastToJob(jobId, 'pipeline-completed', { status: 'success', result: returnvalue });
    });
    queueEvents.on('failed', ({ jobId, failedReason }) => {
      socketManager.broadcastToJob(jobId, 'pipeline-failed', { status: 'error', message: failedReason });
    });
    console.log('Queue events bridge established.');
  } catch (err) {
    console.error('Failed to establish Queue events bridge:', err);
  }

  app.use(cors());
  app.use(express.json());

  // API 路由: 動態 Webhook 與排程觸發
  app.use('/api', pipelineRoutes);
  app.use('/api/metaman', metamanRoutes);
  app.use('/api/an', anRoutes);
  app.use('/api/iam', iamRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/mdm', mdmRoutes);
  app.use('/api/stream', streamRoutes);
  app.use('/api/unstructured', unstructuredRoutes);
  app.use('/api/dp', dpRoutes);

  // 健康檢查
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // 系統啟動時: 動態註冊所有外掛節點
  // 這裡展示手動註冊，但實務上推薦呼叫 pluginRegistry.scanAndRegister()
  pluginRegistry.registerNode(new SourceApiNode());
  pluginRegistry.registerNode(new TransformAINode());
  pluginRegistry.registerNode(new CustomScriptNode());
  pluginRegistry.registerNode(new DestDbNode());
  pluginRegistry.registerNode(new SourceCSVNode());
  pluginRegistry.registerNode(new SourceDbNode());
  pluginRegistry.registerNode(new DestDbRealNode());
  pluginRegistry.registerNode(new TransformCleanNode());
  pluginRegistry.registerNode(new TransformValidateNode());
  pluginRegistry.registerNode(new SourceKafkaNode());
  pluginRegistry.registerNode(new SourceNoSQLNode());
  pluginRegistry.registerNode(new ZeroLandingMaskingNode());
  pluginRegistry.registerNode(new AddressNormalizationNode());
  pluginRegistry.registerNode(new AddressGeocodingNode());

  // 測試預覽用的開發輔助路由
  app.post('/api/pipeline/test-run', async (req, res) => {
    try {
      const { config } = req.body;
      const orchestrator = new Orchestrator(config, true); // sandbox mode
      const result = await orchestrator.executePipeline({ EXECUTION_DATE: new Date().toISOString() });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // 靜態檔案服務 (前端 React build)
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AI-ETL Backend is running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical Failed to start server:", err);
  process.exit(1);
});
