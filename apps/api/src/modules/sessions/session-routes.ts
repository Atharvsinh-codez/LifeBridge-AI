import { Router, type Router as ExpressRouter } from 'express';

import { createSessionResponseSchema } from '@lifebridge/shared';

import { AuthService } from '../auth/auth-service';
import { SessionService } from './session-service';

export function createSessionRouter(
  sessionService: SessionService,
  authService: AuthService,
): ExpressRouter {
  const router = Router();

  router.post('/', (request, response) => {
    const identity = authService.resolveIdentity(request);
    const wsBaseUrl = `${request.protocol === 'https' ? 'wss' : 'ws'}://${request.get('host')}`;
    const created = sessionService.createSession(request.body, identity, wsBaseUrl);

    const token = authService.issueGuestToken({
      sessionId: created.session.id,
      participantId: created.participant.id,
      role: created.participant.participantRole,
      preferredLocale: created.participant.preferredLocale,
    });

    response.status(201).json({
      session: created.session,
      participant: created.participant,
      token,
      wsUrl: created.wsUrl,
    });
  });

  router.get('/:sessionId', (request, response) => {
    const overview = sessionService.getOverview(request.params.sessionId);
    if (!overview) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    response.json(overview);
  });

  router.post('/:sessionId/location', (request, response) => {
    const updated = sessionService.updateLocation(request.params.sessionId, request.body);
    if (!updated) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    response.json({
      session: updated.session,
      routedNumbers: updated.routedNumbers,
    });
  });

  router.post('/:sessionId/close', (request, response) => {
    const closed = sessionService.closeSession(request.params.sessionId);
    if (!closed.session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    response.json(closed);
  });

  return router;
}
