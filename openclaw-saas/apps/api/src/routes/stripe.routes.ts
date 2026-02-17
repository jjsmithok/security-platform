import { Router } from 'express';
import { z } from 'zod';
import { stripeService } from '../services/stripe.service.js';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware.js';

export const stripeRouter = Router();

const checkoutSchema = z.object({
  plan: z.enum(['basic', 'pro']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

stripeRouter.post('/checkout', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = checkoutSchema.parse(req.body);
    
    const session = await stripeService.createCheckoutSession(
      req.user!.id,
      data.plan,
      data.successUrl,
      data.cancelUrl
    );

    res.json(session);
  } catch (error: any) {
    if (error.message === 'Cannot create checkout for free plan') {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

stripeRouter.post('/portal', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { returnUrl } = req.body;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: 'No active subscription' });
      return;
    }

    const url = await stripeService.createPortalSession(
      user.stripeCustomerId,
      returnUrl || 'http://localhost:3000/dashboard'
    );

    res.json({ url });
  } catch (error) {
    next(error);
  }
});

stripeRouter.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe signature' });
      return;
    }

    await stripeService.handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
