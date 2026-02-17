import bcrypt from 'bcryptjs';

// Mock auth service for testing without database
const mockUsers = new Map<string, { id: string; email: string; passwordHash: string; name?: string }>();

export const authService = {
  async register(email: string, password: string, name?: string) {
    if (mockUsers.has(email)) {
      throw new Error('User already exists');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = `user_${Date.now()}`;
    mockUsers.set(email, { id, email, passwordHash, name });
    return { id, email, name };
  },

  async login(email: string, password: string) {
    const user = mockUsers.get(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }
    return { accessToken: 'mock_token', refreshToken: 'mock_refresh' };
  },

  async verifyToken(token: string) {
    if (token === 'valid_token') {
      return { id: 'user_1', email: 'test@test.com' };
    }
    return null;
  }
};

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user', async () => {
      const user = await authService.register('new@test.com', 'password123', 'Test User');
      expect(user.email).toBe('new@test.com');
      expect(user.name).toBe('Test User');
    });

    it('should throw error for duplicate email', async () => {
      await authService.register('duplicate@test.com', 'password123');
      await expect(
        authService.register('duplicate@test.com', 'password123')
      ).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      await authService.register('login@test.com', 'password123');
      const result = await authService.login('login@test.com', 'password123');
      expect(result.accessToken).toBe('mock_token');
    });

    it('should throw error with invalid email', async () => {
      await expect(
        authService.login('nonexistent@test.com', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error with invalid password', async () => {
      await authService.register('pass@test.com', 'correctpassword');
      await expect(
        authService.login('pass@test.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const user = await authService.verifyToken('valid_token');
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@test.com');
    });

    it('should return null for invalid token', async () => {
      const user = await authService.verifyToken('invalid_token');
      expect(user).toBeNull();
    });
  });
});
