import { socketManager } from '../websocket/socketManager.js';

class StreamEngineImpl {
  private activeStreams: Map<string, NodeJS.Timeout> = new Map();

  startStream(topic: string, type: 'sensor' | 'weblog') {
    if (this.activeStreams.has(topic)) return;

    const interval = setInterval(() => {
      let payload: any;
      if (type === 'sensor') {
        payload = {
          msgId: Math.random().toString(36).substring(7),
          topic,
          timestamp: Date.now(),
          deviceId: `sensor-${Math.floor(Math.random() * 5)}`,
          temperature: parseFloat((20 + Math.random() * 15).toFixed(2)),
          humidity: parseFloat((40 + Math.random() * 20).toFixed(2)),
        };
      } else {
        payload = {
          msgId: Math.random().toString(36).substring(7),
          topic,
          timestamp: Date.now(),
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          method: Math.random() > 0.8 ? 'POST' : 'GET',
          path: '/api/v1/data',
          latency: Math.floor(Math.random() * 200),
        };
      }

      // 1. Transform in flight (Real-time formatting)
      const transformed = {
        ...payload,
        eventTimeISO: new Date(payload.timestamp).toISOString(),
        anomalyDetected: type === 'sensor' ? payload.temperature > 32 : payload.latency > 150,
      };

      // 2. Federated analysis (Mocking join with traditional RDBMS data)
      if (type === 'sensor') {
        const mockRDBMSJoin: Record<string, string> = {
          'sensor-0': 'Factory Floor A',
          'sensor-1': 'Factory Floor B',
          'sensor-2': 'Warehouse 1',
          'sensor-3': 'HVAC Control',
          'sensor-4': 'Server Room',
        };
        transformed.rdbmsLocation = mockRDBMSJoin[payload.deviceId] || 'Unknown';
        transformed.federatedAlert = transformed.anomalyDetected && transformed.rdbmsLocation === 'Server Room' 
                                      ? 'CRITICAL_SERVER_OVERHEAT' : null;
      } else {
        transformed.rdbmsCustomer = 'Cust-' + payload.ip.split('.')[3];
      }

      // Broadcast to clients listening on this topic via web socket
      socketManager.getIO()?.emit(`kafka:${topic}`, transformed);
    }, 400); // Emits every 400ms to simulate low-latency stream

    this.activeStreams.set(topic, interval);
  }

  stopStream(topic: string) {
    if (this.activeStreams.has(topic)) {
      clearInterval(this.activeStreams.get(topic)!);
      this.activeStreams.delete(topic);
    }
  }

  getActiveStreams() {
    return Array.from(this.activeStreams.keys());
  }
}

export const streamEngine = new StreamEngineImpl();
