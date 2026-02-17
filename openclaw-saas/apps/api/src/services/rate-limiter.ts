import Redis from 'ioredis';
import type { Request, Response, NextFunction } from 'express';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'rl',
};

export function createRateLimiter(options: RateLimitOptions = defaultOptions) {
  const { windowMs, maxRequests, keyPrefix } = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identifier = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const key = `${keyPrefix}:${identifier}:${req.path}`;

    try {
      const current = await redis.get(key);
      
      if (current && parseInt(current) >= maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: await redis.ttl(key),
        });
        return;
      }

      const multi = redis.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(windowMs / 1000));
      await multi.exec();

      const remaining = current ? maxRequests - parseInt(current) - 1 : maxRequests - 1;
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
      
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next();
    }
  };
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  options: RateLimitOptions = defaultOptions
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const { windowMs, maxRequests, keyPrefix } = { ...defaultOptions, ...options };
  const key = `${keyPrefix}:${identifier}:${endpoint}`;

  try {
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= maxRequests) {
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + ttl * 1000),
      };
    }

    const multi = redis.multi();
    multi.incr(key);
    if (count === 0) {
      multi.expire(key, Math.ceil(windowMs / 1000));
    }
    await multi.exec();

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetAt: new Date(Date.now() + windowMs),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: maxRequests, resetAt: new Date(Date.now() + windowMs) };
  }
}

export const rateLimiter = createRateLimiter();
