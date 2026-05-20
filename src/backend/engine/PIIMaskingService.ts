import crypto from 'crypto';

export interface PIIEntity {
  type: string;
  originalValue: string;
  maskedValue: string;
  startIndex: number;
  endIndex: number;
}

export interface MaskingResult {
  originalText: string;
  maskedText: string;
  entities: PIIEntity[];
  vaultId: string;
}

class PIIMaskingServiceImpl {
  // Simple in-memory Vault for De-anonymization
  private vault: Map<string, { [masked: string]: string }> = new Map();

  // Mock NER/LLM detection using Regex for demonstration
  // In production, this would call an LLM (e.g. Gemini) or a local SpaCy NER model
  public async maskText(text: string): Promise<MaskingResult> {
    const vaultId = crypto.randomUUID();
    const vaultEnv: { [masked: string]: string } = {};
    let maskedText = text;
    const entities: PIIEntity[] = [];

    // 1. Phone numbers (e.g. 555-123-4567, (123) 456-7890)
    const phoneRegex = /(?:\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
    let match;
    while ((match = phoneRegex.exec(text)) !== null) {
      const original = match[0];
      const masked = `[PHONE_${crypto.randomBytes(4).toString('hex')}]`;
      vaultEnv[masked] = original;
      entities.push({ type: 'PHONE', originalValue: original, maskedValue: masked, startIndex: match.index, endIndex: match.index + original.length });
    }

    // 2. Emails
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    while ((match = emailRegex.exec(text)) !== null) {
      const original = match[0];
      const masked = `[EMAIL_${crypto.randomBytes(4).toString('hex')}]`;
      vaultEnv[masked] = original;
      entities.push({ type: 'EMAIL', originalValue: original, maskedValue: masked, startIndex: match.index, endIndex: match.index + original.length });
    }

    // 3. Mock Names (Simple capitalization heuristics for mock)
    // "Mr. John Doe" -> "[NAME_...]"
    const nameRegex = /(Mr\.|Mrs\.|Ms\.) [A-Z][a-z]+ [A-Z][a-z]+/g;
    while ((match = nameRegex.exec(text)) !== null) {
      const original = match[0];
      const masked = `[NAME_${crypto.randomBytes(4).toString('hex')}]`;
      vaultEnv[masked] = original;
      entities.push({ type: 'NAME', originalValue: original, maskedValue: masked, startIndex: match.index, endIndex: match.index + original.length });
    }
    
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    while ((match = ssnRegex.exec(text)) !== null) {
      const original = match[0];
      const masked = `[SSN_${crypto.randomBytes(4).toString('hex')}]`;
      vaultEnv[masked] = original;
      entities.push({ type: 'SSN', originalValue: original, maskedValue: masked, startIndex: match.index, endIndex: match.index + original.length });
    }

    // Replace original text with masked values (Iterate backwards to preserve indices)
    entities.sort((a, b) => b.startIndex - a.startIndex).forEach(entity => {
      maskedText = maskedText.substring(0, entity.startIndex) + entity.maskedValue + maskedText.substring(entity.endIndex);
    });

    this.vault.set(vaultId, vaultEnv);

    return {
      originalText: text,
      maskedText,
      entities,
      vaultId
    };
  }

  public async unmaskText(vaultId: string, maskedText: string): Promise<string> {
    const vaultEnv = this.vault.get(vaultId);
    if (!vaultEnv) {
      throw new Error('Vault ID not found or expired');
    }

    let unmaskedText = maskedText;
    for (const [masked, original] of Object.entries(vaultEnv)) {
      unmaskedText = unmaskedText.replace(masked, original);
    }

    return unmaskedText;
  }

  public getVaultSize(): number {
    return this.vault.size;
  }
}

export const piiMaskingService = new PIIMaskingServiceImpl();
