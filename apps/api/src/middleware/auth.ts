import type { Request, Response, NextFunction } from 'express';

import type { UserRole } from '@lifebridge/shared';

import { AuthService, type RequestIdentity } from '../modules/auth/auth-service';

declare module 'express-serve-static-core' {
    interface Request {
        identity?: RequestIdentity;
    }
}

export function optionalAuth(authService: AuthService) {
    return (request: Request, _response: Response, next: NextFunction) => {
        const identity = authService.resolveIdentity(request);
        if (identity) {
            request.identity = identity;
        }
        next();
    };
}

export function requireAuth(authService: AuthService) {
    return (request: Request, response: Response, next: NextFunction) => {
        const identity = authService.resolveIdentity(request);
        if (!identity) {
            response.status(401).json({ error: 'Authentication required' });
            return;
        }
        request.identity = identity;
        next();
    };
}

export function requireRole(authService: AuthService, roles: UserRole[]) {
    return (request: Request, response: Response, next: NextFunction) => {
        const identity = authService.resolveIdentity(request);
        if (!identity) {
            response.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(identity.role)) {
            response.status(403).json({ error: `One of [${roles.join(', ')}] role required` });
            return;
        }

        request.identity = identity;
        next();
    };
}
