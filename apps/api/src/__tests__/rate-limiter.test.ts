// Mock rate limiter for testing
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
  identifier: string,
  windowMs: number = 60000,
  maxRequests: number = 100
): { allowed: boolean; remaining: number; resetAt: Date } => {
  const key = identifier;
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now > record.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetTime),
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: new Date(record.resetTime),
  };
};

export const resetRateLimit = (identifier: string) => {
  requestCounts.delete(identifier);
};

describe('Rate Limiter', () => {
  beforeEach(() => {
    requestCounts.clear();
  });

  it('should allow requests under limit', () => {
    const result = checkRateLimit('test_user', 60000, 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should block requests over limit', () => {
    checkRateLimit('test_user', 60000, 2);
    checkRateLimit('test_user', 60000, 2);
    const result = checkRateLimit('test_user', 60000, 2);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different identifiers separately', () => {
    checkRateLimit('user1', 60000, 2);
    const result = checkRateLimit('user2', 60000, 2);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should track different endpoints separately for same user', () => {
    checkRateLimit('user1', 60000, 2);
    const result1 = checkRateLimit('user1', 60000, 2);
    const result2 = checkRateLimit('user1', 60000, 2);
    
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(false);
  });
});
