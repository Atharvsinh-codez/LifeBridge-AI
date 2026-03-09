import { randomUUID } from 'node:crypto';

import {
  ContextAssessment,
  ConversationTurn,
  EmergencyProfile,
  EmergencySession,
  IncidentReport,
  SessionOverview,
  SessionParticipant,
  SeverityLevel,
} from '@lifebridge/shared';
import { routeEmergencyNumbers } from '@lifebridge/emergency-knowledge';

function nowIso() {
  return new Date().toISOString();
}

function createPublicSessionCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function maxSeverity(left: SeverityLevel, right: SeverityLevel): SeverityLevel {
  const severityRank: Record<SeverityLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return severityRank[left] >= severityRank[right] ? left : right;
}

export interface CreateSessionInput {
  sourceLocale: string;
  targetLocale: string;
  initialCountryCode?: string;
  initiatorName: string;
  initiatorUserId?: string | null;
  preferredLocale?: string;
}

export interface AppendTurnInput {
  sessionId: string;
  participantId: string;
  originalText: string;
  normalizedText: string;
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  assessment: ContextAssessment;
  translationLatencyMs: number;
  ttsLatencyMs: number;
  audioBase64?: string | null;
  audioMimeType?: string | null;
}

export class MemoryStore {
  private readonly sessions = new Map<string, EmergencySession>();
  private readonly participants = new Map<string, SessionParticipant[]>();
  private readonly turns = new Map<string, ConversationTurn[]>();
  private readonly incidents = new Map<string, IncidentReport>();
  private readonly profiles = new Map<string, EmergencyProfile>();
  private readonly assessments = new Map<string, ContextAssessment>();

  createSession(input: CreateSessionInput) {
    const timestamp = nowIso();
    const sessionId = randomUUID();
    const participantId = randomUUID();
    const countryCode = input.initialCountryCode?.toUpperCase() ?? null;
    const routedNumbers = routeEmergencyNumbers(countryCode, 'unknown');

    const session: EmergencySession = {
      id: sessionId,
      publicSessionCode: createPublicSessionCode(),
      initiatorUserId: input.initiatorUserId ?? null,
      status: 'created',
      sourceLocale: input.sourceLocale,
      targetLocale: input.targetLocale,
      detectedEmergencyType: 'unknown',
      severity: 'low',
      countryCode,
      geoLat: null,
      geoLng: null,
      suggestedPrimaryNumber: routedNumbers[0]?.phoneNumber ?? null,
      startedAt: timestamp,
      lastActivityAt: timestamp,
      endedAt: null,
    };

    const participant: SessionParticipant = {
      id: participantId,
      sessionId,
      userId: input.initiatorUserId ?? null,
      participantRole: input.initiatorUserId ? 'patient' : 'guest',
      displayName: input.initiatorName,
      preferredLocale: input.preferredLocale ?? input.targetLocale,
      joinedAt: timestamp,
      leftAt: null,
    };

    this.sessions.set(sessionId, session);
    this.participants.set(sessionId, [participant]);
    this.turns.set(sessionId, []);

    return {
      session,
      participant,
      routedNumbers,
    };
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  getParticipants(sessionId: string) {
    return this.participants.get(sessionId) ?? [];
  }

  getTurns(sessionId: string) {
    return this.turns.get(sessionId) ?? [];
  }

  getAssessment(sessionId: string) {
    return this.assessments.get(sessionId) ?? null;
  }

  getOverview(sessionId: string): SessionOverview | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      session,
      participants: this.getParticipants(sessionId),
      latestIncident: this.incidents.get(sessionId) ?? null,
      turns: this.getTurns(sessionId),
    };
  }

  updateSessionLocation(sessionId: string, payload: { countryCode?: string; geoLat?: number | null; geoLng?: number | null }) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.countryCode = payload.countryCode?.toUpperCase() ?? session.countryCode;
    session.geoLat = payload.geoLat ?? session.geoLat;
    session.geoLng = payload.geoLng ?? session.geoLng;
    const routedNumbers = routeEmergencyNumbers(session.countryCode, session.detectedEmergencyType);
    session.suggestedPrimaryNumber = routedNumbers[0]?.phoneNumber ?? session.suggestedPrimaryNumber;
    session.lastActivityAt = nowIso();
    this.sessions.set(sessionId, session);

    return {
      session,
      routedNumbers,
    };
  }

  closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const endedAt = nowIso();
    session.status = 'completed';
    session.endedAt = endedAt;
    session.lastActivityAt = endedAt;
    this.sessions.set(sessionId, session);
    return session;
  }

  appendTurn(input: AppendTurnInput) {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      return null;
    }

    const turn: ConversationTurn = {
      id: randomUUID(),
      sessionId: input.sessionId,
      participantId: input.participantId,
      turnIndex: this.getTurns(input.sessionId).length + 1,
      originalText: input.originalText,
      normalizedText: input.normalizedText,
      translatedText: input.translatedText,
      detectedLanguage: input.detectedLanguage,
      targetLanguage: input.targetLanguage,
      emergencyTypeSnapshot: input.assessment.emergencyType,
      severitySnapshot: input.assessment.severity,
      translationLatencyMs: input.translationLatencyMs,
      ttsLatencyMs: input.ttsLatencyMs,
      createdAt: nowIso(),
      audioBase64: input.audioBase64 ?? null,
      audioMimeType: input.audioMimeType ?? null,
    };

    const updatedTurns = [...this.getTurns(input.sessionId), turn];
    this.turns.set(input.sessionId, updatedTurns);

    session.status = 'active';
    session.detectedEmergencyType = input.assessment.emergencyType;
    session.severity = maxSeverity(session.severity, input.assessment.severity);
    session.lastActivityAt = turn.createdAt;
    session.suggestedPrimaryNumber =
      routeEmergencyNumbers(session.countryCode, input.assessment.emergencyType)[0]?.phoneNumber ??
      session.suggestedPrimaryNumber;
    this.sessions.set(input.sessionId, session);
    this.assessments.set(input.sessionId, input.assessment);

    const existingIncident = this.incidents.get(input.sessionId);
    const incident: IncidentReport = existingIncident
      ? {
        ...existingIncident,
        summaryText: input.assessment.responderSummary,
        emergencyType: input.assessment.emergencyType,
        severity: maxSeverity(existingIncident.severity, input.assessment.severity),
        confidence: input.assessment.confidence,
        recommendedAction: input.assessment.suggestedAction,
        medicalContext: input.assessment.medicalContext,
        updatedAt: nowIso(),
      }
      : {
        id: randomUUID(),
        sessionId: input.sessionId,
        summaryText: input.assessment.responderSummary,
        emergencyType: input.assessment.emergencyType,
        severity: input.assessment.severity,
        confidence: input.assessment.confidence,
        recommendedAction: input.assessment.suggestedAction,
        medicalContext: input.assessment.medicalContext,
        responderNotes: null,
        status: 'open',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

    this.incidents.set(input.sessionId, incident);

    return {
      turn,
      incident,
      session,
    };
  }

  getIncident(sessionId: string) {
    return this.incidents.get(sessionId) ?? null;
  }

  getProfile(userId: string) {
    return this.profiles.get(userId) ?? null;
  }

  getProfileByUsername(username: string) {
    for (const profile of this.profiles.values()) {
      if (profile.username === username) {
        return profile;
      }
    }
    return null;
  }

  upsertProfile(
    userId: string,
    payload: Omit<EmergencyProfile, 'id' | 'userId' | 'updatedAt'>,
  ): EmergencyProfile {
    const current = this.profiles.get(userId);
    const profile: EmergencyProfile = {
      id: current?.id ?? randomUUID(),
      userId,
      updatedAt: nowIso(),
      ...payload,
    };

    this.profiles.set(userId, profile);
    return profile;
  }

  getHistoryForUser(userId: string) {
    return [...this.sessions.values()]
      .filter((session) => session.initiatorUserId === userId)
      .map((session) => this.getOverview(session.id))
      .filter((overview): overview is SessionOverview => overview !== null);
  }

  getAdminOverview() {
    const sessions = [...this.sessions.values()];
    const turns = [...this.turns.values()].flat();
    const incidents = [...this.incidents.values()];

    return {
      activeSessions: sessions.filter((session) => session.status === 'active').length,
      openIncidents: incidents.filter((incident) => incident.status === 'open').length,
      criticalIncidents: incidents.filter((incident) => incident.severity === 'critical').length,
      avgTranslationLatencyMs:
        turns.length > 0
          ? turns.reduce((total, turn) => total + turn.translationLatencyMs, 0) / turns.length
          : 0,
      avgTtsLatencyMs:
        turns.length > 0
          ? turns.reduce((total, turn) => total + turn.ttsLatencyMs, 0) / turns.length
          : 0,
    };
  }

  listAdminSessions() {
    return [...this.sessions.values()]
      .map((session) => this.getOverview(session.id))
      .filter((overview): overview is SessionOverview => overview !== null)
      .map((overview) => ({
        overview,
        latestAssessment: this.assessments.get(overview.session.id) ?? null,
      }));
  }
}
