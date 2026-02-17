// Mock session manager for testing
interface SessionData {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const sessions = new Map<string, SessionData>();

export const sessionManager = {
  create(userId: string, expiresInMs: number = 7 * 24 * 60 * 60 * 1000): SessionData {
    const token = `token_${Math.random().toString(36).substring(2)}`;
    const expiresAt = new Date(Date.now() + expiresInMs);
    const session: SessionData = {
      id: `session_${Date.now()}`,
      token,
      userId,
      expiresAt,
      createdAt: new Date(),
    };
    sessions.set(token, session);
    return session;
  },

  verify(token: string): SessionData | null {
    const session = sessions.get(token);
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    return session;
  },

  invalidate(token: string): void {
    sessions.delete(token);
  },

  invalidateAll(userId: string): void {
    for (const [token, session] of sessions.entries()) {
      if (session.userId === userId) {
        sessions.delete(token);
      }
    }
  },

  getUserSessions(userId: string): SessionData[] {
    const userSessions: SessionData[] = [];
    for (const session of sessions.values()) {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    }
    return userSessions;
  },
};

describe('SessionManager', () => {
  beforeEach(() => {
    sessions.clear();
  });

  describe('create', () => {
    it('should create a new session', () => {
      const session = sessionManager.create('user_123');
      expect(session.token).toBeDefined();
      expect(session.userId).toBe('user_123');
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should use custom expiration', () => {
      const session = sessionManager.create('user_123', 1000);
      expect(session.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 2000);
    });
  });

  describe('verify', () => {
    it('should verify valid session', () => {
      const session = sessionManager.create('user_123');
      const verified = sessionManager.verify(session.token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe('user_123');
    });

    it('should return null for invalid token', () => {
      const verified = sessionManager.verify('invalid_token');
      expect(verified).toBeNull();
    });

    it('should return null for expired session', () => {
      const session = sessionManager.create('user_123', -1000);
      const verified = sessionManager.verify(session.token);
      expect(verified).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should invalidate a session', () => {
      const session = sessionManager.create('user_123');
      sessionManager.invalidate(session.token);
      const verified = sessionManager.verify(session.token);
      expect(verified).toBeNull();
    });
  });

  describe('invalidateAll', () => {
    it('should invalidate all sessions for a user', () => {
      sessionManager.create('user_123');
      sessionManager.create('user_123');
      sessionManager.create('user_456');
      
      sessionManager.invalidateAll('user_123');
      
      const user123Sessions = sessionManager.getUserSessions('user_123');
      const user456Sessions = sessionManager.getUserSessions('user_456');
      
      expect(user123Sessions.length).toBe(0);
      expect(user456Sessions.length).toBe(1);
    });
  });
});
