export interface User {
  id: string;
  email: string;
  name?: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  lastUsed?: Date;
  expiresAt?: Date;
  createdAt: Date;
  userId: string;
}

export interface Session {
  id: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  userId: string;
}

export interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ip?: string;
  userAgent?: string;
  riskScore?: number;
  createdAt: Date;
  userId?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RiskScore {
  score: number;
  factors: string[];
  shouldBlock: boolean;
}

export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
}

export type SubscriptionPlan = 'basic' | 'pro' | 'free';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
