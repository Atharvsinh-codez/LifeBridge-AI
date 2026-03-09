import { Router, type Router as ExpressRouter } from 'express';

import { SessionService } from '../sessions/session-service';

export function createIncidentRouter(sessionService: SessionService): ExpressRouter {
  const router = Router();

  router.get('/:sessionId', (request, response) => {
    response.json({
      incident: sessionService.getIncident(request.params.sessionId),
    });
  });

  return router;
}
