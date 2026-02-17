import type { RiskScore } from '@openclaw/shared';

export interface RiskFactors {
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  payload?: any;
  userId?: string;
  apiKey?: string;
}

const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?)/i,
  /system\s*prompt/i,
  /you\s+are\s+(now\s+)?(a\s+)?(different|new)/i,
  /forget\s+(everything|all|what)\s+(you|I)\s+(know|said)/i,
  /<script[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /\bunion\s+select\b/i,
  /--;\s*$/m,
];

const BLOCKED_IPS = new Set([
  '192.0.2.0', // TEST-NET-1
  '198.51.100.0', // TEST-NET-2
  '203.0.113.0', // TEST-NET-3
]);

export class RiskEngine {
  assess(factors: RiskFactors): RiskScore {
    const factorsList: string[] = [];
    let score = 0;

    if (factors.ip && BLOCKED_IPS.has(factors.ip)) {
      score += 50;
      factorsList.push('Blocked IP range');
    }

    if (factors.payload) {
      const payloadStr = JSON.stringify(factors.payload);
      
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(payloadStr)) {
          score += 30;
          factorsList.push(`Suspicious pattern detected: ${pattern.source}`);
        }
      }

      if (payloadStr.length > 10000) {
        score += 10;
        factorsList.push('Payload size exceeds limit');
      }
    }

    if (factors.endpoint?.includes('..') || factors.endpoint?.includes('//')) {
      score += 20;
      factorsList.push('Path traversal attempt');
    }

    const shouldBlock = score >= 70;

    return {
      score: Math.min(score, 100),
      factors: factorsList,
      shouldBlock,
    };
  }

  async logRiskEvent(userId: string | undefined, riskScore: number, details: any): Promise<void> {
    console.log('[RiskEngine] Event logged:', { userId, riskScore, details, timestamp: new Date() });
  }

  getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 20) return 'low';
    if (score < 50) return 'medium';
    if (score < 70) return 'high';
    return 'critical';
  }
}

export const riskEngine = new RiskEngine();
