import { z } from 'zod';

import {
  contextAssessmentSchema,
  countryEmergencyNumberSchema,
  emergencyProfileSchema,
  emergencySessionSchema,
  incidentReportSchema,
  sessionOverviewSchema,
  sessionParticipantSchema,
} from './schemas';

export const createSessionRequestSchema = z.object({
  sourceLocale: z.string().min(2).default('auto'),
  targetLocale: z.string().min(2).default('en'),
  initialCountryCode: z.string().length(2).optional(),
  initiatorName: z.string().min(1).default('Guest'),
});

export const createSessionResponseSchema = z.object({
  session: emergencySessionSchema,
  participant: sessionParticipantSchema,
  token: z.string().min(1),
  wsUrl: z.string().url(),
  routedNumbers: z.array(countryEmergencyNumberSchema),
});

export const updateSessionLocationSchema = z.object({
  countryCode: z.string().length(2).optional(),
  geoLat: z.number().min(-90).max(90).nullable().optional(),
  geoLng: z.number().min(-180).max(180).nullable().optional(),
});

export const closeSessionRequestSchema = z.object({
  finalNotes: z.string().optional(),
});

export const emergencyNumbersResponseSchema = z.object({
  countryCode: z.string().length(2),
  numbers: z.array(countryEmergencyNumberSchema),
});

export const profileUpsertSchema = emergencyProfileSchema.omit({
  id: true,
  userId: true,
  updatedAt: true,
});

export const historyResponseSchema = z.object({
  sessions: z.array(sessionOverviewSchema),
});

export const incidentResponseSchema = z.object({
  incident: incidentReportSchema.nullable(),
});

export const adminOverviewResponseSchema = z.object({
  activeSessions: z.number().int().nonnegative(),
  openIncidents: z.number().int().nonnegative(),
  criticalIncidents: z.number().int().nonnegative(),
  avgTranslationLatencyMs: z.number().nonnegative(),
  avgTtsLatencyMs: z.number().nonnegative(),
});

export const adminSessionsResponseSchema = z.object({
  sessions: z.array(
    z.object({
      overview: sessionOverviewSchema,
      latestAssessment: contextAssessmentSchema.nullable(),
    }),
  ),
});

