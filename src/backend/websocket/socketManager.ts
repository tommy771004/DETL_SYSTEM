/**
 * @file socketManager.ts
 * @description WebSocket 伺服器初始化，管理客戶端對 jobId room 的訂閱，並提供廣播方法給其他系統呼叫。
 */
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

class SocketManager {
  private io?: SocketIOServer;

  /**
   * 初始化 WebSocket Server
   */
  public init(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*', // 實務上請限制特定網域
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`[Socket.io] Client connected: ${socket.id}`);

      // 客戶端可以透過傳送 subscribe 訊息訂閱特定的 jobId
      socket.on('subscribe', (jobId: string) => {
        socket.join(jobId);
        console.log(`[Socket.io] Client ${socket.id} subscribed to job: ${jobId}`);
      });

      socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
      });
    });

    console.log('[Socket.io] WebSocket server initialized.');
  }

  /**
   * 廣播訊息給特定的 Job Room
   */
  public broadcastToJob(jobId: string, eventName: string, payload: any) {
    if (this.io) {
      this.io.to(jobId).emit(eventName, payload);
    }
  }
}

export const socketManager = new SocketManager();
