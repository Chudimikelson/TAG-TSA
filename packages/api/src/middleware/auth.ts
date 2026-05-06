import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/jwt.service.js';
import { UserRole } from '@tagora/shared';
import { AppError } from './errorHandler.js';

// Augment Express request with the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      actor?: JwtPayload;
    }
  }
}

/**
 * Verifies the Bearer token and attaches the decoded payload to req.actor.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or malformed Authorization header'));
  }

  const token = authHeader.slice(7);
  try {
    req.actor = verifyToken(token);
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

/**
 * Role guard factory – call after requireAuth.
 * Example: requireRole('admin')
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.actor || !roles.includes(req.actor.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}
