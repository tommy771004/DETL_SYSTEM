/**
 * @file ConnectionStore.ts
 * @description 連線資源管理 Store（對應  Admin UI 的 Connection 管理功能）
 * 支援多種連線類型：JDBC / Oracle / FTP / API / NoSQL / Kafka
 */
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

export type ConnectionType = 'JDBC' | 'Oracle' | 'Oracle_TNS' | 'Oracle_JDBC' | 'FTP' | 'API' | 'NoSQL' | 'Kafka' | 'CSV';

export interface ConnectionConfig {
  id: string;
  name: string;
  type: ConnectionType;
  description?: string;
  // JDBC / Oracle
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  schema?: string;
  // Oracle TNS
  tnsServiceName?: string;
  // Oracle JDBC
  jdbcUrl?: string;
  // FTP
  ftpPath?: string;
  // API
  baseUrl?: string;
  authToken?: string;
  // NoSQL / Kafka
  connectionUri?: string;
  // CSV
  filePath?: string;
  // Status
  status: 'connected' | 'error' | 'untested';
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

class ConnectionStoreImpl {
  private db: Database.Database;

  constructor() {
    this.db = new Database(path.join(process.cwd(), 'dsystem.sqlite'));
    this.initDb();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        description TEXT,
        host TEXT,
        port INTEGER,
        db_name TEXT,
        username TEXT,
        password_enc TEXT,
        schema_name TEXT,
        tns_service_name TEXT,
        jdbc_url TEXT,
        ftp_path TEXT,
        base_url TEXT,
        auth_token_enc TEXT,
        connection_uri_enc TEXT,
        file_path TEXT,
        status TEXT NOT NULL DEFAULT 'untested',
        last_tested_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    const count = this.db.prepare('SELECT COUNT(*) as count FROM connections').get() as { count: number };
    if (count.count === 0) {
      this.seedDefaults();
    }
  }

  private encryptSensitive(value: string): string {
    // 使用簡易 AES 加密（生產環境應使用 KMS / Vault）
    const key = process.env.CONN_SECRET || 'dsystem_default_key_32byte_padded';
    const keyBuf = Buffer.from(key.padEnd(32).slice(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decryptSensitive(encrypted: string): string {
    try {
      const key = process.env.CONN_SECRET || 'dsystem_default_key_32byte_padded';
      const keyBuf = Buffer.from(key.padEnd(32).slice(0, 32));
      const [ivHex, encHex] = encrypted.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const enc = Buffer.from(encHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
      return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    } catch {
      return '***';
    }
  }

  private seedDefaults() {
    const now = new Date().toISOString();
    const defaults: Omit<ConnectionConfig, 'id'>[] = [
      {
        name: 'Prod_PostgreSQL',
        type: 'JDBC',
        description: '生產環境 PostgreSQL 資料庫',
        host: 'pg-prod.internal',
        port: 5432,
        database: 'etl_db',
        username: 'etl_user',
        password: 'prod_pass',
        schema: 'public',
        status: 'connected',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Local_Redis',
        type: 'NoSQL',
        description: 'Redis 快取與任務佇列',
        connectionUri: 'redis://127.0.0.1:6379',
        status: 'connected',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Legacy_Oracle',
        type: 'Oracle',
        description: '舊系統 Oracle 資料庫',
        host: '192.168.1.10',
        port: 1521,
        database: 'payroll',
        username: 'oracle_etl',
        password: 'legacy_pass',
        schema: 'payroll',
        status: 'error',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'FTP_Inbox',
        type: 'FTP',
        description: 'FTP 落地檔案監控目錄',
        host: 'ftp.internal',
        port: 21,
        username: 'ftp_user',
        password: 'ftp_pass',
        ftpPath: '/data/inbox',
        status: 'untested',
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const c of defaults) {
      this.create(c);
    }
  }

  private rowToConfig(row: any): ConnectionConfig {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      host: row.host,
      port: row.port,
      database: row.db_name,
      username: row.username,
      password: row.password_enc ? '***' : undefined, // 敏感資訊不回傳明文
      schema: row.schema_name,
      tnsServiceName: row.tns_service_name,
      jdbcUrl: row.jdbc_url,
      ftpPath: row.ftp_path,
      baseUrl: row.base_url,
      authToken: row.auth_token_enc ? '***' : undefined,
      connectionUri: row.connection_uri_enc ? '***' : undefined,
      filePath: row.file_path,
      status: row.status,
      lastTestedAt: row.last_tested_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public getAll(): ConnectionConfig[] {
    const rows = this.db.prepare('SELECT * FROM connections ORDER BY name ASC').all();
    return rows.map(r => this.rowToConfig(r));
  }

  public getById(id: string): ConnectionConfig | null {
    const row = this.db.prepare('SELECT * FROM connections WHERE id = ?').get(id);
    return row ? this.rowToConfig(row as any) : null;
  }

  public create(config: Omit<ConnectionConfig, 'id'>): ConnectionConfig {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO connections (
        id, name, type, description, host, port, db_name, username, password_enc,
        schema_name, tns_service_name, jdbc_url, ftp_path, base_url,
        auth_token_enc, connection_uri_enc, file_path,
        status, last_tested_at, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, config.name, config.type, config.description || '',
      config.host || '', config.port || null, config.database || '',
      config.username || '',
      config.password ? this.encryptSensitive(config.password) : '',
      config.schema || '', config.tnsServiceName || '',
      config.jdbcUrl || '', config.ftpPath || '', config.baseUrl || '',
      config.authToken ? this.encryptSensitive(config.authToken) : '',
      config.connectionUri ? this.encryptSensitive(config.connectionUri) : '',
      config.filePath || '',
      config.status || 'untested', config.lastTestedAt || null,
      config.createdAt || now, config.updatedAt || now
    );

    return this.getById(id)!;
  }

  public update(id: string, updates: Partial<ConnectionConfig>): ConnectionConfig | null {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT * FROM connections WHERE id = ?').get(id);
    if (!existing) return null;

    this.db.prepare(`
      UPDATE connections SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        description = COALESCE(?, description),
        host = COALESCE(?, host),
        port = COALESCE(?, port),
        db_name = COALESCE(?, db_name),
        username = COALESCE(?, username),
        password_enc = COALESCE(?, password_enc),
        schema_name = COALESCE(?, schema_name),
        tns_service_name = COALESCE(?, tns_service_name),
        jdbc_url = COALESCE(?, jdbc_url),
        ftp_path = COALESCE(?, ftp_path),
        base_url = COALESCE(?, base_url),
        auth_token_enc = COALESCE(?, auth_token_enc),
        connection_uri_enc = COALESCE(?, connection_uri_enc),
        file_path = COALESCE(?, file_path),
        status = COALESCE(?, status),
        last_tested_at = COALESCE(?, last_tested_at),
        updated_at = ?
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.type ?? null,
      updates.description ?? null,
      updates.host ?? null,
      updates.port ?? null,
      updates.database ?? null,
      updates.username ?? null,
      updates.password ? this.encryptSensitive(updates.password) : null,
      updates.schema ?? null,
      updates.tnsServiceName ?? null,
      updates.jdbcUrl ?? null,
      updates.ftpPath ?? null,
      updates.baseUrl ?? null,
      updates.authToken ? this.encryptSensitive(updates.authToken) : null,
      updates.connectionUri ? this.encryptSensitive(updates.connectionUri) : null,
      updates.filePath ?? null,
      updates.status ?? null,
      updates.lastTestedAt ?? null,
      now,
      id
    );

    return this.getById(id);
  }

  public testConnection(id: string): { success: boolean; message: string } {
    const now = new Date().toISOString();
    // 實際生產應做真正的連線測試
    // 此處模擬：Oracle 連線返回失敗，其他成功
    const row = this.db.prepare('SELECT type FROM connections WHERE id = ?').get(id) as { type: string } | undefined;
    if (!row) return { success: false, message: 'Connection not found' };

    const success = row.type !== 'Oracle'; // 模擬 Oracle 測試失敗
    const status = success ? 'connected' : 'error';

    this.db.prepare('UPDATE connections SET status = ?, last_tested_at = ?, updated_at = ? WHERE id = ?')
      .run(status, now, now, id);

    return {
      success,
      message: success ? 'Connection test successful.' : 'Connection refused. Check host and credentials.'
    };
  }

  public delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM connections WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

export const connectionStore = new ConnectionStoreImpl();
