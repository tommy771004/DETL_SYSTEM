import { IPluginNode, PluginCategory } from '../../engine/types.js';
import { DataQueue } from '../../engine/DataQueue.js';

export class ZeroLandingMaskingNode implements IPluginNode {
  public type = 'transform_zero_landing_masking';
  public category: PluginCategory = 'transformer';

  public async execute(config: Record<string, any>, inputQueue: DataQueue | null, outputQueue: DataQueue | null, variables: Record<string, any>): Promise<void> {
    console.log(`[ZeroLandingMaskingNode] Executing in-memory masking...`);
    
    if (!inputQueue) throw new Error('[ZeroLandingMaskingNode] Missing input queue');
    if (!outputQueue) throw new Error('[ZeroLandingMaskingNode] Missing output queue');

    try {
      for await (const chunk of inputQueue.consume(500)) {
        const maskedChunk = chunk.map((record: any) => this.processRecord({ ...record }, config.rules));
        await outputQueue.push(maskedChunk);
      }
      outputQueue.end();
      console.log(`[ZeroLandingMaskingNode] Execution complete.`);
    } catch (err) {
      console.error(`[ZeroLandingMaskingNode] Error during execution:`, err);
      outputQueue.destroy(err as Error);
      throw err;
    }
  }

  private processRecord(record: any, rules: any): any {
    for (const key of Object.keys(record)) {
        const val = record[key];
        if (typeof val !== 'string') continue;

        // Auto-detect & Mask TW ID Card
        if (this.isTaiwanID(val)) {
            record[key] = this.generateFakeValidTaiwanID(val[1]); // pass gender digit to keep gender identical if possible
        } 
        // Auto-detect & Mask Email
        else if (this.isEmail(val)) {
            record[key] = this.maskEmail(val);
        }
        // General Masking based on rules if provided
        else if (rules && rules[key]) {
             if (rules[key] === 'mask_all') {
                  record[key] = '***';
             }
        }
    }
    return record;
  }

  private isTaiwanID(id: string): boolean {
    const idRegex = /^[A-Z][1289]\d{8}$/;
    if (!idRegex.test(id)) return false;
    
    // Checksum verification
    const cityCodes: { [key: string]: number } = {
        A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18, K: 19, L: 20, 
        M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33
    };
    
    const letter = id[0];
    const n = cityCodes[letter];
    const n1 = Math.floor(n / 10);
    const n2 = n % 10;
    
    const digits = id.slice(1).split('').map(Number);
    const sum = n1 * 1 + n2 * 9 + digits[0] * 8 + digits[1] * 7 + digits[2] * 6 + digits[3] * 5 + 
                digits[4] * 4 + digits[5] * 3 + digits[6] * 2 + digits[7] * 1 + digits[8] * 1;

    return sum % 10 === 0;
  }

  private generateFakeValidTaiwanID(genderChar: string = '1'): string {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    
    const cityCodes: { [key: string]: number } = {
        A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18, K: 19, L: 20, 
        M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33
    };
    
    const n = cityCodes[randomLetter];
    const n1 = Math.floor(n / 10);
    const n2 = n % 10;
    
    const d1 = (genderChar === '1' || genderChar === '2') ? parseInt(genderChar, 10) : (Math.random() > 0.5 ? 1 : 2);
    
    let digits = [d1];
    for(let i=0; i<7; i++) {
        digits.push(Math.floor(Math.random() * 10));
    }
    
    let partialSum = n1 * 1 + n2 * 9 + digits[0] * 8 + digits[1] * 7 + digits[2] * 6 + 
                   digits[3] * 5 + digits[4] * 4 + digits[5] * 3 + digits[6] * 2 + digits[7] * 1;
                   
    let d9 = (10 - (partialSum % 10)) % 10;
    digits.push(d9);
    
    return randomLetter + digits.join('');
  }

  private isEmail(email: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private maskEmail(email: string): string {
      const parts = email.split('@');
      if (parts.length !== 2) return email;
      const [local, domain] = parts;
      if (local.length <= 2) {
          return `${local[0]}***@${domain}`;
      }
      return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  }
}
