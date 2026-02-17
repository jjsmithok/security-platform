import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();
export const userRouter = Router();

userRouter.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        mfaEnabled: true,
        emailVerified: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

userRouter.get('/keys', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        lastUsed: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    res.json(keys);
  } catch (error) {
    next(error);
  }
});

userRouter.post('/keys', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Key name is required' });
      return;
    }

    const key = `oc_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        name,
        userId: req.user!.id,
      },
    });

    res.status(201).json({
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
    });
  } catch (error) {
    next(error);
  }
});

userRouter.delete('/keys/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.apiKey.deleteMany({
      where: { id, userId: req.user!.id },
    });

    res.json({ message: 'API key deleted' });
  } catch (error) {
    next(error);
  }
});

userRouter.get('/usage', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.apiLog.findMany({
      where: {
        userId: req.user!.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRequests = logs.length;
    const uniqueEndpoints = [...new Set(logs.map(l => l.endpoint))];

    res.json({
      totalRequests,
      uniqueEndpoints: uniqueEndpoints.length,
      logs: logs.slice(0, 100),
    });
  } catch (error) {
    next(error);
  }
});
