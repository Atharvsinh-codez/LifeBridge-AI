import { Router, type Router as ExpressRouter } from 'express';

import { AuthService } from '../auth/auth-service';
import { requireAdmin } from '../auth/guards';
import { SessionService } from '../sessions/session-service';

export function createAdminRouter(
  sessionService: SessionService,
  authService: AuthService,
): ExpressRouter {
  const router = Router();

  router.get('/overview', (request, response) => {
    const identity = requireAdmin(authService, request, response);
    if (!identity) {
      return;
    }

    response.json(sessionService.getAdminOverview());
  });

  router.get('/sessions', (request, response) => {
    const identity = requireAdmin(authService, request, response);
    if (!identity) {
      return;
    }

    response.json({
      sessions: sessionService.listAdminSessions(),
    });
  });

  return router;
}
