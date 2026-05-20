import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import sql from 'mssql';
import oracledb from 'oracledb';
// @ts-ignore
import Sybase from 'sybase';

export interface DbConfig {
  type: 'mysql' | 'postgres' | 'mssql' | 'oracle' | 'sybase';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string;
}

export interface DbConnection {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  close(): Promise<void>;
}

export class DbConnectionFactory {
  static async createConnection(config: DbConfig): Promise<DbConnection> {
    switch (config.type) {
      case 'mysql':
        return await this.createMysqlConnection(config);
      case 'postgres':
        return await this.createPgConnection(config);
      case 'mssql':
        return await this.createMssqlConnection(config);
      case 'oracle':
        return await this.createOracleConnection(config);
      case 'sybase':
        return await this.createSybaseConnection(config);
      default:
        throw new Error(`[DbConnectionFactory] Unsupported database type: ${config.type}`);
    }
  }

  private static async createOracleConnection(config: DbConfig): Promise<DbConnection> {
    let connectString = config.connectionString;
    if (!connectString) {
      connectString = `${config.host}:${config.port}/${config.database}`;
    }

    const connection = await oracledb.getConnection({
      user: config.user,
      password: config.password,
      connectString: connectString
    });

    return {
      query: async (sqlQuery: string, params: any[] = []) => {
        const result = await connection.execute(sqlQuery, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return (result.rows as any[]) || [];
      },
      execute: async (sqlQuery: string, params: any[] = []) => {
        await connection.execute(sqlQuery, params, { autoCommit: true });
      },
      close: async () => {
        await connection.close();
      }
    };
  }

  private static createSybaseConnection(config: DbConfig): Promise<DbConnection> {
    return new Promise((resolve, reject) => {
      // Setup the sybase client
      const db = new Sybase(config.host, config.port, config.database, config.user, config.password);
      db.connect((err: any) => {
        if (err) return reject(err);
        
        resolve({
          query: (sqlQuery: string, params: any[] = []) => {
            return new Promise((res, rej) => {
              // Note: The sybase module might not natively support parameter arrays in this wrapper.
              db.query(sqlQuery, (qErr: any, data: any) => {
                if (qErr) rej(qErr);
                else res(data || []);
              });
            });
          },
          execute: (sqlQuery: string, params: any[] = []) => {
            return new Promise((res, rej) => {
              db.query(sqlQuery, (qErr: any) => {
                if (qErr) rej(qErr);
                else res();
              });
            });
          },
          close: async () => {
            db.disconnect();
          }
        });
      });
    });
  }

  private static async createMysqlConnection(config: DbConfig): Promise<DbConnection> {
    const connection = await mysql.createConnection(config.connectionString || {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });

    return {
      query: async (sqlQuery: string, params: any[] = []) => {
        const [rows] = await connection.query(sqlQuery, params);
        return rows as any[];
      },
      execute: async (sqlQuery: string, params: any[] = []) => {
        await connection.execute(sqlQuery, params);
      },
      close: async () => {
        await connection.end();
      }
    };
  }

  private static async createPgConnection(config: DbConfig): Promise<DbConnection> {
    const client = new PgClient(config.connectionString ? { connectionString: config.connectionString } : {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });

    await client.connect();

    return {
      query: async (sqlQuery: string, params: any[] = []) => {
        const result = await client.query(sqlQuery, params);
        return result.rows;
      },
      execute: async (sqlQuery: string, params: any[] = []) => {
        await client.query(sqlQuery, params);
      },
      close: async () => {
        await client.end();
      }
    };
  }

  private static async createMssqlConnection(config: DbConfig): Promise<DbConnection> {
    const pool = await sql.connect(config.connectionString || {
      server: config.host as string,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      options: {
        encrypt: true, // For Azure mostly
        trustServerCertificate: true // Useful for local dev
      }
    });

    return {
      query: async (sqlQuery: string, params: any[] = []) => {
        const request = pool.request();
        if (params && params.length > 0) {
           // Basic positional mapping not natively supported like pg/mysql, this is a simplified stub
           // In reality you would bind typed inputs.
        }
        const result = await request.query(sqlQuery);
        return result.recordset;
      },
      execute: async (sqlQuery: string, params: any[] = []) => {
        const request = pool.request();
        await request.query(sqlQuery);
      },
      close: async () => {
        await pool.close();
      }
    };
  }
}
