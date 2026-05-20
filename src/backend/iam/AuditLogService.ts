import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

export interface AuditParams {
  userId: string;
  action: string;
  resource: string;
  details: string;
  success: boolean;
  ipAddress?: string;
  deviceId?: string;
}

export interface AuditRecord {
  id: number;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details: string;
  success: number;
  ipAddress: string;
  deviceId: string;
  hash: string;
}

class AuditLogServiceImpl {
  private db: Database.Database;

  constructor() {
    this.db = new Database(path.join(process.cwd(), 'audit.sqlite'));
    this.initDb();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        userId TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        details TEXT,
        success INTEGER NOT NULL,
        ipAddress TEXT,
        deviceId TEXT,
        hash TEXT NOT NULL
      )
    `);

    const count = this.db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };
    if (count.count === 0) {
      this.seedMockData();
    }
  }

  private seedMockData() {
    this.log({ userId: 'admin_sys', action: 'system_start', resource: 'system', details: 'IAM service initialized', success: true, ipAddress: '127.0.0.1' });
    this.log({ userId: 'etl_local_dev', action: 'pipeline_create', resource: 'dnd_pipe_173000', details: 'Created daily ingestion pipeline', success: true, deviceId: 'DEV_MAC_3391' });
    this.log({ userId: 'etl_local_dev', action: 'access_denied_device', resource: 'system', details: 'Unauthorized device attempt', success: false, deviceId: 'UNKNOWN_DEVICE_99' });
    this.log({ userId: 'audit_ext', action: 'export_report', resource: 'audit_logs', details: 'Exported quarterly compliance report', success: true, ipAddress: '192.168.1.55' });
  }

  private computeHash(record: any, previousHash: string): string {
    const dataStr = `${record.timestamp}|${record.userId}|${record.action}|${record.resource}|${record.success}|${previousHash}`;
    return crypto.createHash('sha256').update(dataStr).digest('hex');
  }

  public log(params: AuditParams) {
    const timestamp = new Date().toISOString();
    
    // Get last hash for the chain
    const lastLog = this.db.prepare('SELECT hash FROM audit_logs ORDER BY id DESC LIMIT 1').get() as { hash: string } | undefined;
    const previousHash = lastLog ? lastLog.hash : '0000000000000000000000000000000000000000000000000000000000000000';

    const rawRecord = {
      timestamp,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      success: params.success ? 1 : 0
    };

    const hash = this.computeHash(rawRecord, previousHash);

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (timestamp, userId, action, resource, details, success, ipAddress, deviceId, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      timestamp,
      params.userId,
      params.action,
      params.resource,
      params.details,
      params.success ? 1 : 0,
      params.ipAddress || '',
      params.deviceId || '',
      hash
    );
  }

  public getLogs(limit: number = 100, offset: number = 0, filter?: { action?: string, userId?: string }): AuditRecord[] {
    let query = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filter?.action) {
      conditions.push('action = ?');
      params.push(filter.action);
    }
    if (filter?.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(query).all(...params) as AuditRecord[];
  }
  
  public verifyChain(): boolean {
    const logs = this.db.prepare('SELECT * FROM audit_logs ORDER BY id ASC').all() as AuditRecord[];
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const log of logs) {
        const expectedHash = this.computeHash({
            timestamp: log.timestamp,
            userId: log.userId,
            action: log.action,
            resource: log.resource,
            success: log.success
        }, previousHash);
        
        if (log.hash !== expectedHash) {
            return false;
        }
        previousHash = log.hash;
    }
    return true;
  }
}

export const AuditLogService = new AuditLogServiceImpl();
