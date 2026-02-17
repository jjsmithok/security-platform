import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  
  try {
    const user = await authService.verifyToken(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
