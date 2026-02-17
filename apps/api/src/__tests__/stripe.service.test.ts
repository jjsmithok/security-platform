// Mock Stripe service for testing

interface CheckoutSession {
  sessionId: string;
  url: string;
  customerId?: string;
  status?: string;
}

const customers = new Map<string, { id: string; email: string; userId: string }>();
const subscriptions = new Map<string, { id: string; customerId: string; status: string }>();

export const stripeService = {
  async createCustomer(userId: string, email: string): Promise<string> {
    const customerId = `cus_${Date.now()}`;
    customers.set(customerId, { id: customerId, email, userId });
    return customerId;
  },

  async createCheckoutSession(
    userId: string,
    plan: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    const customer = Array.from(customers.values()).find(c => c.userId === userId);
    if (!customer) {
      throw new Error('No customer found');
    }

    const sessionId = `cs_${Date.now()}`;
    return {
      sessionId,
      url: `${successUrl}?session_id=${sessionId}`,
      customerId: customer.id,
    };
  },

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    return `${returnUrl}?portal=1`;
  },

  async handleWebhook(eventType: string, data: any): Promise<void> {
    if (eventType === 'checkout.session.completed') {
      const subscriptionId = `sub_${Date.now()}`;
      subscriptions.set(subscriptionId, {
        id: subscriptionId,
        customerId: data.customer,
        status: 'active',
      });
    }
  },

  async getSubscriptionStatus(customerId: string): Promise<string> {
    const sub = Array.from(subscriptions.values()).find(s => s.customerId === customerId);
    return sub?.status || 'inactive';
  },
};

describe('StripeService', () => {
  describe('createCustomer', () => {
    it('should create a customer', async () => {
      const customerId = await stripeService.createCustomer('user_123', 'test@test.com');
      expect(customerId).toMatch(/^cus_/);
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for existing customer', async () => {
      await stripeService.createCustomer('user_123', 'test@test.com');
      const session = await stripeService.createCheckoutSession(
        'user_123',
        'basic',
        'http://localhost:3000/success',
        'http://localhost:3000/cancel'
      );
      expect(session.sessionId).toMatch(/^cs_/);
      expect(session.url).toContain('session_id');
    });

    it('should throw error for non-existent customer', async () => {
      await expect(
        stripeService.createCheckoutSession('nonexistent', 'basic', 'http://localhost:3000/success', 'http://localhost:3000/cancel')
      ).rejects.toThrow('No customer found');
    });
  });

  describe('createPortalSession', () => {
    it('should create portal session', async () => {
      const url = await stripeService.createPortalSession('cus_123', 'http://localhost:3000/return');
      expect(url).toContain('portal=1');
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return active for active subscription', async () => {
      const customerId = await stripeService.createCustomer('user_sub', 'sub@test.com');
      await stripeService.handleWebhook('checkout.session.completed', { customer: customerId });
      
      const status = await stripeService.getSubscriptionStatus(customerId);
      expect(status).toBe('active');
    });

    it('should return inactive for no subscription', async () => {
      const customerId = await stripeService.createCustomer('user_nosub', 'nosub@test.com');
      const status = await stripeService.getSubscriptionStatus(customerId);
      expect(status).toBe('inactive');
    });
  });
});
