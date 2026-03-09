import { Router, type Router as ExpressRouter } from 'express';

import { profileUpsertSchema } from '@lifebridge/shared';

import { AuthService } from '../auth/auth-service';
import { requireIdentity } from '../auth/guards';
import { SessionService } from '../sessions/session-service';

export function createProfileRouter(
  sessionService: SessionService,
  authService: AuthService,
): ExpressRouter {
  const router = Router();

  router.get('/profile', (request, response) => {
    const identity = requireIdentity(authService, request, response);
    if (!identity) {
      return;
    }

    response.json({
      profile: sessionService.getProfile(identity.userId),
    });
  });

  router.put('/profile', (request, response) => {
    const identity = requireIdentity(authService, request, response);
    if (!identity) {
      return;
    }

    const payload = profileUpsertSchema.parse(request.body);
    const profile = sessionService.upsertProfile(identity.userId, payload);
    response.json({
      profile,
    });
  });

  router.get('/history', (request, response) => {
    const identity = requireIdentity(authService, request, response);
    if (!identity) {
      return;
    }

    response.json({
      sessions: sessionService.getHistory(identity.userId),
    });
  });

  return router;
}
