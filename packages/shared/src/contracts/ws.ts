import { z } from 'zod';

import {
  contextAssessmentSchema,
  conversationTurnSchema,
  countryEmergencyNumberSchema,
  sessionOverviewSchema,
} from './schemas';

export const sessionJoinEventSchema = z.object({
  type: z.literal('session.join'),
  payload: z.object({
    token: z.string().min(1),
    sessionId: z.string().uuid(),
  }),
});

export const speechTurnSubmitEventSchema = z.object({
  type: z.literal('speech.turn.submit'),
  payload: z.object({
    sessionId: z.string().uuid(),
    participantId: z.string().uuid(),
    originalText: z.string().min(1),
    sourceLocale: z.string().min(2).optional(),
    targetLocale: z.string().min(2),
    clientTurnId: z.string().optional(),
  }),
});

export const sessionLocaleSetEventSchema = z.object({
  type: z.literal('session.locale.set'),
  payload: z.object({
    sessionId: z.string().uuid(),
    locale: z.string().min(2),
  }),
});

export const sessionHeartbeatEventSchema = z.object({
  type: z.literal('session.heartbeat'),
  payload: z.object({
    sessionId: z.string().uuid(),
    timestamp: z.string(),
  }),
});

export const clientWsEventSchema = z.discriminatedUnion('type', [
  sessionJoinEventSchema,
  speechTurnSubmitEventSchema,
  sessionLocaleSetEventSchema,
  sessionHeartbeatEventSchema,
]);

export const sessionSyncedEventSchema = z.object({
  type: z.literal('session.synced'),
  payload: z.object({
    overview: sessionOverviewSchema,
  }),
});

export const turnProcessingEventSchema = z.object({
  type: z.literal('turn.processing'),
  payload: z.object({
    sessionId: z.string().uuid(),
    participantId: z.string().uuid(),
    originalText: z.string().min(1),
  }),
});

export const turnCompletedEventSchema = z.object({
  type: z.literal('turn.completed'),
  payload: z.object({
    turn: conversationTurnSchema,
    assessment: contextAssessmentSchema,
  }),
});

export const contextUpdatedEventSchema = z.object({
  type: z.literal('context.updated'),
  payload: z.object({
    sessionId: z.string().uuid(),
    assessment: contextAssessmentSchema,
  }),
});

export const sessionNumberRoutedEventSchema = z.object({
  type: z.literal('session.number_routed'),
  payload: z.object({
    sessionId: z.string().uuid(),
    numbers: z.array(countryEmergencyNumberSchema),
  }),
});

export const sessionWarningEventSchema = z.object({
  type: z.literal('session.warning'),
  payload: z.object({
    sessionId: z.string().uuid(),
    message: z.string().min(1),
  }),
});

export const sessionErrorEventSchema = z.object({
  type: z.literal('session.error'),
  payload: z.object({
    sessionId: z.string().uuid().optional(),
    message: z.string().min(1),
    code: z.string().min(1),
  }),
});

export const serverWsEventSchema = z.discriminatedUnion('type', [
  sessionSyncedEventSchema,
  turnProcessingEventSchema,
  turnCompletedEventSchema,
  contextUpdatedEventSchema,
  sessionNumberRoutedEventSchema,
  sessionWarningEventSchema,
  sessionErrorEventSchema,
]);

export type ClientWsEvent = z.infer<typeof clientWsEventSchema>;
export type ServerWsEvent = z.infer<typeof serverWsEventSchema>;

