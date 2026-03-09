import { createSessionRequestSchema, updateSessionLocationSchema } from '@lifebridge/shared';

import type { RequestIdentity } from '../auth/auth-service';
import { ContextService } from '../context/context-service';
import { TranslationService } from '../translation/translation-service';
import { VoiceService } from '../voice/voice-service';
import { MemoryStore } from './store';

export class SessionService {
  constructor(
    private readonly store: MemoryStore,
    private readonly contextService: ContextService,
    private readonly translationService: TranslationService,
    private readonly voiceService: VoiceService,
  ) { }

  createSession(input: unknown, identity: RequestIdentity | null, wsBaseUrl: string) {
    const payload = createSessionRequestSchema.parse(input);
    const created = this.store.createSession({
      ...payload,
      initiatorUserId: identity?.userId ?? null,
      preferredLocale: identity?.preferredLocale ?? payload.targetLocale,
    });

    return {
      ...created,
      wsUrl: `${wsBaseUrl}/ws`,
    };
  }

  getOverview(sessionId: string) {
    return this.store.getOverview(sessionId);
  }

  updateLocation(sessionId: string, payload: unknown) {
    const data = updateSessionLocationSchema.parse(payload);
    return this.store.updateSessionLocation(sessionId, data);
  }

  closeSession(sessionId: string) {
    const session = this.store.closeSession(sessionId);
    return {
      session,
      incident: this.store.getIncident(sessionId),
    };
  }

  getIncident(sessionId: string) {
    return this.store.getIncident(sessionId);
  }

  getProfile(userId: string) {
    return this.store.getProfile(userId);
  }

  getProfileByUsername(username: string) {
    return this.store.getProfileByUsername(username);
  }

  upsertProfile(userId: string, payload: Parameters<MemoryStore['upsertProfile']>[1]) {
    return this.store.upsertProfile(userId, payload);
  }

  getHistory(userId: string) {
    return this.store.getHistoryForUser(userId);
  }

  getAdminOverview() {
    return this.store.getAdminOverview();
  }

  listAdminSessions() {
    return this.store.listAdminSessions();
  }

  async processTurn(payload: {
    sessionId: string;
    participantId: string;
    originalText: string;
    sourceLocale?: string;
    targetLocale: string;
  }) {
    const translationStartedAt = Date.now();
    const detectedLanguage =
      payload.sourceLocale && payload.sourceLocale !== 'auto'
        ? payload.sourceLocale
        : await this.translationService.detectLocale(payload.originalText);

    const { normalizedText, assessment } = await this.contextService.analyze(payload.originalText);
    const translatedText = await this.translationService.translateText(
      normalizedText,
      detectedLanguage,
      payload.targetLocale,
    );
    const translationLatencyMs = Date.now() - translationStartedAt;

    const ttsStartedAt = Date.now();
    const audio = await this.voiceService.synthesize(translatedText, payload.targetLocale);
    const ttsLatencyMs = Date.now() - ttsStartedAt;

    const result = this.store.appendTurn({
      sessionId: payload.sessionId,
      participantId: payload.participantId,
      originalText: payload.originalText,
      normalizedText,
      translatedText,
      detectedLanguage,
      targetLanguage: payload.targetLocale,
      assessment,
      translationLatencyMs,
      ttsLatencyMs,
      audioBase64: audio.audioBase64,
      audioMimeType: audio.audioMimeType,
    });

    if (!result) {
      return null;
    }

    return {
      turn: { ...result.turn, audioUrl: audio.audioUrl },
      incident: result.incident,
      assessment,
      overview: this.store.getOverview(payload.sessionId),
    };
  }
}
