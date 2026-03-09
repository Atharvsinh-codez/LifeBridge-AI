import type { Request, Response } from 'express';

import { AuthService, type RequestIdentity } from './auth-service';

export function requireIdentity(authService: AuthService, request: Request, response: Response): RequestIdentity | null {
  const identity = authService.resolveIdentity(request);
  if (!identity) {
    response.status(401).json({
      error: 'Authentication required',
    });
    return null;
  }

  return identity;
}

export function requireAdmin(authService: AuthService, request: Request, response: Response): RequestIdentity | null {
  const identity = requireIdentity(authService, request, response);
  if (!identity) {
    return null;
  }

  if (identity.role !== 'admin' && identity.role !== 'responder') {
    response.status(403).json({
      error: 'Admin or responder role required',
    });
    return null;
  }

  return identity;
}
