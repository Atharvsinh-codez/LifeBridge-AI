'use client';

import { create } from 'zustand';

import {
  ContextAssessment,
  ConversationTurn,
  EmergencySession,
  SessionOverview,
  SessionParticipant,
} from '@lifebridge/shared';

interface EmergencySessionState {
  session: EmergencySession | null;
  participant: SessionParticipant | null;
  token: string | null;
  wsUrl: string | null;
  overview: SessionOverview | null;
  latestAssessment: ContextAssessment | null;
  connectionState: 'idle' | 'connecting' | 'connected' | 'error';
  warnings: string[];
  setConnectionState(state: EmergencySessionState['connectionState']): void;
  bootstrap(payload: {
    session: EmergencySession;
    participant: SessionParticipant;
    token: string;
    wsUrl: string;
  }): void;
  syncOverview(overview: SessionOverview): void;
  setAssessment(assessment: ContextAssessment): void;
  addTurn(turn: ConversationTurn): void;
  addWarning(warning: string): void;
  reset(): void;
}

export const useEmergencySessionStore = create<EmergencySessionState>((set) => ({
  session: null,
  participant: null,
  token: null,
  wsUrl: null,
  overview: null,
  latestAssessment: null,
  connectionState: 'idle',
  warnings: [],
  setConnectionState: (connectionState) => set({ connectionState }),
  bootstrap: ({ session, participant, token, wsUrl }) =>
    set({
      session,
      participant,
      token,
      wsUrl,
      connectionState: 'connecting',
      warnings: [],
    }),
  syncOverview: (overview) =>
    set({
      overview,
      session: overview.session,
    }),
  setAssessment: (latestAssessment) =>
    set({
      latestAssessment,
    }),
  addTurn: (turn) =>
    set((state) => ({
      overview: state.overview
        ? {
          ...state.overview,
          turns: [...state.overview.turns, turn],
        }
        : state.overview,
    })),
  addWarning: (warning) =>
    set((state) => ({
      warnings: [...state.warnings, warning],
    })),
  reset: () =>
    set({
      session: null,
      participant: null,
      token: null,
      wsUrl: null,
      overview: null,
      latestAssessment: null,
      connectionState: 'idle',
      warnings: [],
    }),
}));
