import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pla-ledger-dev-secret-2024';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export interface AuthRequest extends Request {
  user?: { id: string; email: string; locale: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, code: 'unauthorized', message: 'No token provided', data: null });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; locale: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, code: 'unauthorized', message: 'Invalid or expired token', data: null });
  }
}

export function optionalAuthenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; locale: string };
      req.user = payload;
    } catch {
      // ignore
    }
  }
  next();
}

export function generateToken(payload: { id: string; email: string; locale: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
