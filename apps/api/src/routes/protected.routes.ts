import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware.js';
import { riskEngine } from '../services/risk.engine.js';
import { checkRateLimit } from '../services/rate-limiter.js';

const prisma = new PrismaClient();
export const protectedRouter = Router();

protectedRouter.post('/echo', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const identifier = req.user!.id;
    const endpoint = '/api/protected/echo';

    const rateCheck = await checkRateLimit(identifier, endpoint);
    if (!rateCheck.allowed) {
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: rateCheck.resetAt,
      });
      return;
    }

    const riskResult = riskEngine.assess({
      userId: req.user!.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      payload: req.body,
    });

    if (riskResult.shouldBlock) {
      res.status(403).json({
        error: 'Request blocked due to high risk score',
        riskScore: riskResult.score,
        factors: riskResult.factors,
      });
      return;
    }

    await prisma.apiLog.create({
      data: {
        endpoint,
        method: 'POST',
        statusCode: 200,
        ip: req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
        riskScore: riskResult.score,
        userId: req.user!.id,
      },
    });

    res.json({
      message: 'Echo successful',
      data: req.body,
      riskScore: riskResult.score,
    });
  } catch (error) {
    next(error);
  }
});

protectedRouter.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  res.json({
    status: 'operational',
    user: req.user!.email,
    tier: 'basic',
  });
});
