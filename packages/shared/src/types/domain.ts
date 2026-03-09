export const emergencyTypes = ['medical', 'police', 'fire', 'disaster', 'unknown'] as const;
export type EmergencyType = (typeof emergencyTypes)[number];

export const severityLevels = ['low', 'medium', 'high', 'critical'] as const;
export type SeverityLevel = (typeof severityLevels)[number];

export const sessionStatuses = [
  'created',
  'active',
  'escalated',
  'completed',
  'cancelled',
] as const;
export type SessionStatus = (typeof sessionStatuses)[number];

export const incidentStatuses = ['open', 'reviewed', 'closed'] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];

export const userRoles = ['user', 'responder', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

export const participantRoles = ['guest', 'patient', 'companion', 'responder', 'admin'] as const;
export type ParticipantRole = (typeof participantRoles)[number];

export const emergencyServiceTypes = ['ambulance', 'police', 'fire', 'unified'] as const;
export type EmergencyServiceType = (typeof emergencyServiceTypes)[number];

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface EmergencyProfile {
  id: string;
  userId: string;
  username: string | null;
  legalName: string;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  spokenLanguages: string[];
  bloodType: string | null;
  allergies: string[];
  medications: string[];
  chronicConditions: string[];
  insuranceProvider: string | null;
  insuranceId: string | null;
  emergencyContacts: EmergencyContact[];
  notes: string | null;
  updatedAt: string;
}

export interface EmergencySession {
  id: string;
  publicSessionCode: string;
  initiatorUserId: string | null;
  status: SessionStatus;
  sourceLocale: string;
  targetLocale: string;
  detectedEmergencyType: EmergencyType;
  severity: SeverityLevel;
  countryCode: string | null;
  geoLat: number | null;
  geoLng: number | null;
  suggestedPrimaryNumber: string | null;
  startedAt: string;
  lastActivityAt: string;
  endedAt: string | null;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string | null;
  participantRole: ParticipantRole;
  displayName: string;
  preferredLocale: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface ContextAssessment {
  emergencyType: EmergencyType;
  severity: SeverityLevel;
  confidence: number;
  suggestedAction: string;
  medicalContext: string[];
  responderSummary: string;
  matchedSignals: string[];
}

export interface ConversationTurn {
  id: string;
  sessionId: string;
  participantId: string;
  turnIndex: number;
  originalText: string;
  normalizedText: string;
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  emergencyTypeSnapshot: EmergencyType;
  severitySnapshot: SeverityLevel;
  translationLatencyMs: number;
  ttsLatencyMs: number;
  createdAt: string;
  audioBase64?: string | null;
  audioMimeType?: string | null;
}

export interface IncidentReport {
  id: string;
  sessionId: string;
  summaryText: string;
  emergencyType: EmergencyType;
  severity: SeverityLevel;
  confidence: number;
  recommendedAction: string;
  medicalContext: string[];
  responderNotes: string | null;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CountryEmergencyNumber {
  id: string;
  countryCode: string;
  serviceType: EmergencyServiceType;
  phoneNumber: string;
  label: string;
  isPrimary: boolean;
}

export interface GuestSessionTokenClaims {
  sessionId: string;
  participantId: string;
  role: ParticipantRole;
  preferredLocale: string;
}

export interface SessionOverview {
  session: EmergencySession;
  participants: SessionParticipant[];
  latestIncident: IncidentReport | null;
  turns: ConversationTurn[];
}

