import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { User, AuthTokens } from '@openclaw/shared';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const SALT_ROUNDS = 10;

export class AuthService {
  async register(email: string, password: string, name?: string): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    return this.mapToUser(user);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        token: refreshToken,
        expiresAt,
        userId: user.id,
      },
    });

    return { accessToken, refreshToken };
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      return user ? this.mapToUser(user) : null;
    } catch {
      return null;
    }
  }

  async logout(token: string): Promise<void> {
    await prisma.session.deleteMany({ where: { token } });
  }

  async refreshSession(refreshToken: string): Promise<AuthTokens> {
    const session = await prisma.session.findUnique({
      where: { token: refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const newRefreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.update({
      where: { id: session.id },
      data: { token: newRefreshToken, expiresAt },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  private mapToUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      mfaEnabled: user.mfaEnabled,
      emailVerified: user.emailVerified,
      subscriptionStatus: user.subscriptionStatus || undefined,
      stripeCustomerId: user.stripeCustomerId || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
