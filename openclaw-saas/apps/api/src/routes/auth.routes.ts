import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await authService.register(data.email, data.password, data.name);
    
    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const tokens = await authService.login(data.email, data.password);
    
    res.json({
      message: 'Login successful',
      ...tokens,
    });
  } catch (error: any) {
    if (error.message === 'Invalid credentials') {
      res.status(401).json({ error: error.message });
      return;
    }
    next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (token) {
      await authService.logout(token);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const tokens = await authService.refreshSession(refreshToken);
    res.json(tokens);
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
