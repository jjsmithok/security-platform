import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface SessionData {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export class SessionManager {
  async create(userId: string, expiresInMs: number = 7 * 24 * 60 * 60 * 1000): Promise<SessionData> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresInMs);

    const session = await prisma.session.create({
      data: {
        token,
        expiresAt,
        userId,
      },
    });

    return {
      id: session.id,
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async verify(token: string): Promise<SessionData | null> {
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return {
      id: session.id,
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async invalidate(token: string): Promise<void> {
    await prisma.session.deleteMany({ where: { token } });
  }

  async invalidateAll(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map(s => ({
      id: s.id,
      token: s.token,
      userId: s.userId,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));
  }

  async cleanup(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}

export const sessionManager = new SessionManager();
