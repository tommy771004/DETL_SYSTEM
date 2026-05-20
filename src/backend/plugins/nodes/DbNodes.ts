import { IPluginNode, PluginCategory } from '../../engine/types.js';
import { DataQueue } from '../../engine/DataQueue.js';
import { DbConnectionFactory, DbConfig, DbConnection } from '../../engine/db/DbConnectionFactory.js';

export class SourceDbNode implements IPluginNode {
  public type = 'source_db';
  public category: PluginCategory = 'reader';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[SourceDbNode] Fetching data using DB connection type: ${config.dbType}`);
    if (!outputQueue) throw new Error('[SourceDbNode] Missing output queue');

    try {
      const dbConfig: DbConfig = {
        type: config.dbType || 'postgres',
        host: config.host || 'localhost',
        port: parseInt(config.port) || 5432,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionString: config.connectionString
      };

      const conn = await DbConnectionFactory.createConnection(dbConfig);
      try {
         // Query all data for now (or streaming cursor in production logic)
         const query = config.query || `SELECT * FROM ${config.table || 'default_table'}`;
         const records = await conn.query(query);
         
         if (records && records.length > 0) {
            await outputQueue.push(records);
         }
      } finally {
         await conn.close();
      }
      
      outputQueue.end();
    } catch (err) {
      console.error(`[SourceDbNode] Error reading from DB:`, err);
      outputQueue.destroy(err as Error);
      throw err;
    }
  }
}

export class DestDbRealNode implements IPluginNode {
  public type = 'dest_db_real'; // Renamed to distinguish or we can replace dest_db
  public category: PluginCategory = 'writer';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[DestDbRealNode] Setup Database Connection Pool for type: ${config.dbType}`);
    if (!inputQueue) throw new Error('[DestDbRealNode] Missing input queue');

    const tableName = config.table || 'default_table';
    const chunkSize = parseInt(config.chunkSize) || 500;
    
    let conn: DbConnection | null = null;
    try {
      const dbConfig: DbConfig = {
        type: config.dbType || 'postgres',
        host: config.host || 'localhost',
        port: parseInt(config.port) || 5432,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionString: config.connectionString
      };

      conn = await DbConnectionFactory.createConnection(dbConfig);
      
      for await (const chunk of inputQueue.consume(chunkSize)) {
         if (chunk.length === 0) continue;
         
         // Dynamically generate insert query based on object keys.
         // This is generic and simplified. Real implementations need robust quoting and params array building.
         const keys = Object.keys(chunk[0]);
         const cols = keys.join(", ");
         
         // Assuming simple types
         for(const record of chunk) {
            const vals = keys.map(k => {
               const val = record[k];
               if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
               if (val === null || val === undefined) return 'NULL';
               return val;
            });
            const insertQuery = `INSERT INTO ${tableName} (${cols}) VALUES (${vals.join(", ")})`;
            await conn.execute(insertQuery);
         }
         console.log(`[DestDbRealNode] Completed inserting chunk of size ${chunk.length}`);
      }
      
      if (outputQueue) outputQueue.end(); 
    } catch (err) {
      if (outputQueue) outputQueue.destroy(err as Error);
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }
}
