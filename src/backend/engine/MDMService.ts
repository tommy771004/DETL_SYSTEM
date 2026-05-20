import crypto from 'crypto';

export interface MDMRecord {
  id: string;
  source: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isGolden: boolean;
}

export interface MatchSuggestion {
  suggestionId: string;
  recordA: MDMRecord;
  recordB: MDMRecord;
  confidenceScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proposedGoldenRecord: Omit<MDMRecord, 'id' | 'source' | 'isGolden'>;
  matchReasons: string[];
}

// Mock ML-based Matcher (Simulating embeddings & string distance)
class MLMatcher {
  // Levenshtein distance
  static levenshteinDistance(s1: string, s2: string): number {
    const l1 = s1.length;
    const l2 = s2.length;
    const dp = Array.from(Array(l1 + 1), () => new Array(l2 + 1).fill(0));

    for (let i = 0; i <= l1; i++) dp[i][0] = i;
    for (let j = 0; i <= l2; i++) dp[0][i] = i;

    for (let i = 1; i <= l1; i++) {
      for (let j = 1; j <= l2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }
    return dp[l1][l2];
  }

  static stringSimilarity(s1: string, s2: string): number {
    if (!s1 && !s2) return 1;
    if (!s1 || !s2) return 0;
    const s1L = s1.toLowerCase();
    const s2L = s2.toLowerCase();
    if (s1L === s2L) return 1;
    
    // Quick heuristic: substring containment
    if (s1L.includes(s2L) || s2L.includes(s1L)) return 0.8;

    const maxLength = Math.max(s1.length, s2.length);
    let distance = 0;
    try {
        distance = this.levenshteinDistance(s1L, s2L);
    } catch(e) {
        // Fallback for large strings to avoid OOM
        distance = maxLength; 
    }
    return 1 - (distance / maxLength);
  }

  static calculateMatch(r1: MDMRecord, r2: MDMRecord): { score: number, reasons: string[], golden: any } {
    let rawScore = 0;
    let totalWeight = 0;
    const reasons: string[] = [];
    
    // Weights
    const weights = { name: 40, email: 30, phone: 20, address: 10 };

    const nameSim = this.stringSimilarity(r1.name, r2.name);
    rawScore += nameSim * weights.name;
    totalWeight += weights.name;
    if (nameSim > 0.8) reasons.push("High Name Similarity");

    const emailSim = this.stringSimilarity(r1.email, r2.email);
    rawScore += emailSim * weights.email;
    totalWeight += weights.email;
    if (emailSim > 0.9) reasons.push("Exact or near-exact Email match");
    else {
        // Domain match check
        const d1 = r1.email.split('@')[1];
        const d2 = r2.email.split('@')[1];
        if (d1 && d2 && d1.toLowerCase() === d2.toLowerCase()) {
            rawScore += 0.5 * weights.email; // Partial credit for domain
            reasons.push("Email domain matches");
        }
    }

    const phoneSim = this.stringSimilarity(r1.phone.replace(/\\D/g,''), r2.phone.replace(/\\D/g,''));
    rawScore += phoneSim * weights.phone;
    totalWeight += weights.phone;
    if (phoneSim > 0.85) reasons.push("Phone numbers match strongly");

    const addrSim = this.stringSimilarity(r1.address, r2.address);
    rawScore += addrSim * weights.address;
    totalWeight += weights.address;
    if (addrSim > 0.7) reasons.push("Addresses are similar");

    const finalScore = rawScore / totalWeight;

    // AI Proposed Golden Record (Favoring longer or more complete fields)
    const golden = {
      name: r1.name.length > r2.name.length ? r1.name : r2.name,
      email: r1.email.includes(r2.email) ? r1.email : r2.email,
      phone: r1.phone.length >= r2.phone.length ? r1.phone : r2.phone,
      address: r1.address.length > r2.address.length ? r1.address : r2.address
    };

    return { score: finalScore, reasons, golden };
  }
}

class MDMServiceImpl {
  private records: MDMRecord[] = [];
  private suggestions: MatchSuggestion[] = [];

  constructor() {
    this.seedData();
    this.runMatchEngine();
  }

  private seedData() {
    this.records = [
      { id: 'REC001', source: 'Salesforce', name: 'Acme Corp', email: 'contact@acme.com', phone: '555-0199', address: '123 Main St, NY', isGolden: false },
      { id: 'REC002', source: 'SAP ERP', name: 'Acme Corporation Inc.', email: 'info@acme.com', phone: '(555) 0199', address: '123 Main Street, Suite 100, New York', isGolden: false },
      { id: 'REC003', source: 'Zendesk', name: 'Global Tech', email: 'support@globaltech.net', phone: '800-444-5555', address: '4500 Tech Blvd', isGolden: false },
      { id: 'REC004', source: 'Stripe', name: 'GlobalTech LLC', email: 'billing@globaltech.net', phone: '800-444-5555', address: '4500 Technology Boulevard, CA', isGolden: false },
      { id: 'REC005', source: 'Salesforce', name: 'Smith & Co', email: 'hello@smithco.com', phone: '123-456-7890', address: '99 Road', isGolden: false }
    ];
  }

  // Orchestrate the ML matching process
  public runMatchEngine() {
    this.suggestions = [];
    for (let i = 0; i < this.records.length; i++) {
      for (let j = i + 1; j < this.records.length; j++) {
        const r1 = this.records[i];
        const r2 = this.records[j];
        if (r1.isGolden || r2.isGolden) continue;

        const match = MLMatcher.calculateMatch(r1, r2);
        
        // Threshold for human review
        if (match.score > 0.65) {
          this.suggestions.push({
            suggestionId: crypto.randomBytes(8).toString('hex'),
            recordA: r1,
            recordB: r2,
            confidenceScore: Math.round(match.score * 100),
            status: 'PENDING',
            proposedGoldenRecord: match.golden,
            matchReasons: match.reasons
          });
        }
      }
    }
  }

  public getPendingSuggestions(): MatchSuggestion[] {
    return this.suggestions.filter(s => s.status === 'PENDING').sort((a,b) => b.confidenceScore - a.confidenceScore);
  }

  public resolveSuggestion(suggestionId: string, action: 'APPROVE' | 'REJECT', customGoldenConfig?: any) {
    const suggestion = this.suggestions.find(s => s.suggestionId === suggestionId);
    if (!suggestion) throw new Error("Suggestion not found");

    if (action === 'REJECT') {
      suggestion.status = 'REJECTED';
      return { success: true };
    }

    if (action === 'APPROVE') {
      suggestion.status = 'APPROVED';
      // Create new Golden Record
      const goldenRecord: MDMRecord = {
        id: `GLD_${crypto.randomBytes(4).toString('hex')}`,
        source: 'MDM_System',
        isGolden: true,
        name: customGoldenConfig?.name || suggestion.proposedGoldenRecord.name,
        email: customGoldenConfig?.email || suggestion.proposedGoldenRecord.email,
        phone: customGoldenConfig?.phone || suggestion.proposedGoldenRecord.phone,
        address: customGoldenConfig?.address || suggestion.proposedGoldenRecord.address,
      };

      this.records.push(goldenRecord);
      
      // Optionally remove or mark old records as 'merged' 
      // For simplicity, we just mark them as golden handled (so they don't get rematched immediately)
      const rA = this.records.find(r => r.id === suggestion.recordA.id);
      const rB = this.records.find(r => r.id === suggestion.recordB.id);
      if (rA) rA.isGolden = true;
      if (rB) rB.isGolden = true;

      return { success: true, goldenRecord };
    }
  }
}

export const mdmService = new MDMServiceImpl();
