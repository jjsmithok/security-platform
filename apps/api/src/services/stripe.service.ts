import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import type { SubscriptionPlan, StripeCheckoutSession } from '@openclaw/shared';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
});

const PRICE_IDS: Record<SubscriptionPlan, string> = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic',
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
  free: 'free',
};

export class StripeService {
  async createCustomer(userId: string, email: string, name?: string): Promise<string> {
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  async createCheckoutSession(
    userId: string,
    plan: SubscriptionPlan,
    successUrl: string,
    cancelUrl: string
  ): Promise<StripeCheckoutSession> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await this.createCustomer(userId, user.email, user.name || undefined);
    }

    const priceId = PRICE_IDS[plan];
    if (priceId === 'free') {
      throw new Error('Cannot create checkout for free plan');
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, plan },
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutComplete(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdate(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const subscriptionId = session.subscription as string;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionId,
        subscriptionStatus: 'active',
      },
    });
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const status = subscription.status === 'active' ? 'active' : 'inactive';

    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: { subscriptionStatus: status },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: { 
        subscriptionStatus: 'canceled',
        subscriptionId: null,
      },
    });
  }

  async getSubscriptionStatus(customerId: string): Promise<string> {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    return subscriptions.data.length > 0 ? 'active' : 'inactive';
  }
}

export const stripeService = new StripeService();
