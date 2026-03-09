import { z } from 'zod';

import {
  emergencyServiceTypes,
  emergencyTypes,
  incidentStatuses,
  participantRoles,
  sessionStatuses,
  severityLevels,
  userRoles,
} from '../types/domain';

export const emergencyTypeSchema = z.enum(emergencyTypes);
export const severityLevelSchema = z.enum(severityLevels);
export const sessionStatusSchema = z.enum(sessionStatuses);
export const participantRoleSchema = z.enum(participantRoles);
export const userRoleSchema = z.enum(userRoles);
export const incidentStatusSchema = z.enum(incidentStatuses);
export const emergencyServiceTypeSchema = z.enum(emergencyServiceTypes);

export const emergencyContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
});

export const emergencyProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  username: z.string().nullable().optional(),
  legalName: z.string().min(1),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  spokenLanguages: z.array(z.string()).optional(),
  bloodType: z.string().nullable(),
  allergies: z.array(z.string()),
  medications: z.array(z.string()),
  chronicConditions: z.array(z.string()),
  insuranceProvider: z.string().nullable().optional(),
  insuranceId: z.string().nullable().optional(),
  emergencyContacts: z.array(emergencyContactSchema),
  notes: z.string().nullable(),
  updatedAt: z.string(),
});

export const emergencySessionSchema = z.object({
  id: z.string().uuid(),
  publicSessionCode: z.string().min(6),
  initiatorUserId: z.string().uuid().nullable(),
  status: sessionStatusSchema,
  sourceLocale: z.string().min(2),
  targetLocale: z.string().min(2),
  detectedEmergencyType: emergencyTypeSchema,
  severity: severityLevelSchema,
  countryCode: z.string().length(2).nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  suggestedPrimaryNumber: z.string().nullable(),
  startedAt: z.string(),
  lastActivityAt: z.string(),
  endedAt: z.string().nullable(),
});

export const sessionParticipantSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  participantRole: participantRoleSchema,
  displayName: z.string().min(1),
  preferredLocale: z.string().min(2),
  joinedAt: z.string(),
  leftAt: z.string().nullable(),
});

export const contextAssessmentSchema = z.object({
  emergencyType: emergencyTypeSchema,
  severity: severityLevelSchema,
  confidence: z.number().min(0).max(1),
  suggestedAction: z.string().min(1),
  medicalContext: z.array(z.string()),
  responderSummary: z.string().min(1),
  matchedSignals: z.array(z.string()),
});

export const conversationTurnSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  turnIndex: z.number().int().nonnegative(),
  originalText: z.string().min(1),
  normalizedText: z.string().min(1),
  translatedText: z.string().min(1),
  detectedLanguage: z.string().min(2),
  targetLanguage: z.string().min(2),
  emergencyTypeSnapshot: emergencyTypeSchema,
  severitySnapshot: severityLevelSchema,
  translationLatencyMs: z.number().nonnegative(),
  ttsLatencyMs: z.number().nonnegative(),
  createdAt: z.string(),
  audioBase64: z.string().nullable().optional(),
  audioMimeType: z.string().nullable().optional(),
});

export const incidentReportSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  summaryText: z.string().min(1),
  emergencyType: emergencyTypeSchema,
  severity: severityLevelSchema,
  confidence: z.number().min(0).max(1),
  recommendedAction: z.string().min(1),
  medicalContext: z.array(z.string()),
  responderNotes: z.string().nullable(),
  status: incidentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const countryEmergencyNumberSchema = z.object({
  id: z.string().uuid(),
  countryCode: z.string().length(2),
  serviceType: emergencyServiceTypeSchema,
  phoneNumber: z.string().min(1),
  label: z.string().min(1),
  isPrimary: z.boolean(),
});

export const guestSessionTokenClaimsSchema = z.object({
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  role: participantRoleSchema,
  preferredLocale: z.string().min(2),
});

export const sessionOverviewSchema = z.object({
  session: emergencySessionSchema,
  participants: z.array(sessionParticipantSchema),
  latestIncident: incidentReportSchema.nullable(),
  turns: z.array(conversationTurnSchema),
});

