import { IPluginNode, PluginCategory } from '../../engine/types.js';
import { DataQueue } from '../../engine/DataQueue.js';
import { AddressNormalizer } from '../../an/AddressNormalizer.js';

export class AddressNormalizationNode implements IPluginNode {
  public type = 'transform_address_normalization';
  public category: PluginCategory = 'transformer';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[AddressNormalizationNode] Executing batch address normalization...`);
    
    if (!inputQueue) throw new Error('[AddressNormalizationNode] Missing input queue');
    if (!outputQueue) throw new Error('[AddressNormalizationNode] Missing output queue');

    const targetField = config.targetField || 'address';
    const outputField = config.outputField || 'normalized_address';

    try {
      for await (const chunk of inputQueue.consume(500)) {
        const normalizedChunk = chunk.map((record: any) => {
          if (record && record[targetField] && typeof record[targetField] === 'string') {
            const normResult = AddressNormalizer.normalize(record[targetField]);
            return {
              ...record,
              [outputField]: normResult.normalized,
              [`${outputField}_city`]: normResult.city,
              [`${outputField}_district`]: normResult.district,
              [`${outputField}_street`]: normResult.street,
              [`${outputField}_confidence`]: normResult.confidenceScore
            };
          }
          return record;
        });

        await outputQueue.push(normalizedChunk);
      }

      outputQueue.end();
      console.log(`[AddressNormalizationNode] Execution complete.`);
    } catch (err) {
      console.error(`[AddressNormalizationNode] Error during execution:`, err);
      outputQueue.destroy(err as Error);
      throw err;
    }
  }
}

export class AddressGeocodingNode implements IPluginNode {
  public type = 'transform_address_geocoding';
  public category: PluginCategory = 'transformer';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[AddressGeocodingNode] Executing batch address geocoding...`);
    
    if (!inputQueue) throw new Error('[AddressGeocodingNode] Missing input queue');
    if (!outputQueue) throw new Error('[AddressGeocodingNode] Missing output queue');

    const targetField = config.targetField || 'address';
    const outputField = config.outputField || 'coordinates';

    try {
      for await (const chunk of inputQueue.consume(100)) {
        // Promise.all to handle await inside map
        const processedChunk = await Promise.all(chunk.map(async (record: any) => {
          if (record && record[targetField] && typeof record[targetField] === 'string') {
            try {
              const coords = await AddressNormalizer.geocode(record[targetField]);
              if (coords) {
                return {
                  ...record,
                  [`${outputField}_lat`]: coords.lat,
                  [`${outputField}_lng`]: coords.lng,
                };
              }
            } catch (geocodeErr: any) {
              console.warn(`[AddressGeocodingNode] Failed to geocode address: ${record[targetField]}`, geocodeErr);
              return {
                ...record,
                [`${outputField}_error`]: geocodeErr instanceof Error ? geocodeErr.message : String(geocodeErr)
              };
            }
          }
          return record;
        }));

        await outputQueue.push(processedChunk);
      }

      outputQueue.end();
      console.log(`[AddressGeocodingNode] Execution complete.`);
    } catch (err) {
      console.error(`[AddressGeocodingNode] Error during execution:`, err);
      outputQueue.destroy(err as Error);
      throw err;
    }
  }
}
