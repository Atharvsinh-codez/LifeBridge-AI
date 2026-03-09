import { Router, type Router as ExpressRouter } from 'express';

import { routeEmergencyNumbers } from '@lifebridge/emergency-knowledge';

export function createEmergencyNumberRouter(): ExpressRouter {
  const router = Router();

  router.get('/', (request, response) => {
    const countryCode = String(request.query.country ?? 'US').toUpperCase();
    const emergencyType = String(request.query.type ?? 'unknown') as Parameters<typeof routeEmergencyNumbers>[1];

    response.json({
      countryCode,
      numbers: routeEmergencyNumbers(countryCode, emergencyType),
    });
  });

  return router;
}
