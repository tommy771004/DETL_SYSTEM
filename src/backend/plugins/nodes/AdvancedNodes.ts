import { IPluginNode, PluginCategory } from '../../engine/types.js';
import { DataQueue } from '../../engine/DataQueue.js';

export class TransformCleanNode implements IPluginNode {
  public type = 'transform_clean';
  public category: PluginCategory = 'transform';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    if (!inputQueue || !outputQueue) throw new Error('[TransformCleanNode] Missing queues');
    try {
      for await (const chunk of inputQueue.consume(100)) {
        const cleaned = chunk.map(record => {
           const newRecord = { ...record };
           // Basic cleaning logic: remove nulls if configured, strip whitespace for strings
           for (const key of Object.keys(newRecord)) {
               if (typeof newRecord[key] === 'string') {
                   newRecord[key] = newRecord[key].trim();
               }
               if (config.removeNulls && (newRecord[key] === null || newRecord[key] === undefined)) {
                   delete newRecord[key];
               }
           }
           return newRecord;
        });
        await outputQueue.push(cleaned);
      }
      outputQueue.end();
    } catch (err) {
      outputQueue.destroy(err as Error);
      throw err;
    }
  }
}

export class TransformValidateNode implements IPluginNode {
  public type = 'transform_validate';
  public category: PluginCategory = 'transform';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    if (!inputQueue || !outputQueue) throw new Error('[TransformValidateNode] Missing queues');
    try {
      for await (const chunk of inputQueue.consume(100)) {
        const validated = chunk.filter(record => {
            // Simple validation: check if required fields exist
            if (config.requiredFields) {
               const fields = config.requiredFields.split(',').map((f: string) => f.trim());
               for (const f of fields) {
                   if (record[f] === undefined || record[f] === null || record[f] === '') return false;
               }
            }
            return true;
        });
        await outputQueue.push(validated);
      }
      outputQueue.end();
    } catch (err) {
      outputQueue.destroy(err as Error);
      throw err;
    }
  }
}

export class SourceKafkaNode implements IPluginNode {
  public type = 'source_kafka';
  public category: PluginCategory = 'reader';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    if (!outputQueue) throw new Error('[SourceKafkaNode] Missing output queue');
    console.log(`[SourceKafkaNode] Connecting to Kafka brokers: ${config.brokers}, topic: ${config.topic}`);
    try {
        const mockMessages = [
            { offset: 1001, message: "Kafka live event 1", topic: config.topic },
            { offset: 1002, message: "Kafka live event 2", topic: config.topic }
        ];
        await outputQueue.push(mockMessages);
        outputQueue.end();
    } catch (err) {
        outputQueue.destroy(err as Error);
        throw err;
    }
  }
}

export class SourceNoSQLNode implements IPluginNode {
  public type = 'source_nosql';
  public category: PluginCategory = 'reader';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    if (!outputQueue) throw new Error('[SourceNoSQLNode] Missing output queue');
    console.log(`[SourceNoSQLNode] Connecting to NoSQL DB: ${config.dbType}, URI: ${config.uri}, Collection: ${config.collection}`);
    try {
        const mockRecords = [
            { _id: "doc1", collection: config.collection, data: "NoSQL mock document 1" },
            { _id: "doc2", collection: config.collection, data: "NoSQL mock document 2" }
        ];
        await outputQueue.push(mockRecords);
        outputQueue.end();
    } catch (err) {
        outputQueue.destroy(err as Error);
        throw err;
    }
  }
}
