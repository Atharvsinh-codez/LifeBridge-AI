import { IncomingMessage } from 'node:http';

import type { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';

import { clientWsEventSchema, ServerWsEvent } from '@lifebridge/shared';

import { AuthService } from '../modules/auth/auth-service';
import { SessionService } from '../modules/sessions/session-service';

interface SessionSocket extends WebSocket {
  metadata?: {
    sessionId: string;
    participantId: string;
  };
}

export function registerSocketHub(
  wss: WebSocketServer,
  authService: AuthService,
  sessionService: SessionService,
) {
  const sessionConnections = new Map<string, Set<SessionSocket>>();

  function send(socket: SessionSocket, event: ServerWsEvent) {
    socket.send(JSON.stringify(event));
  }

  function broadcast(sessionId: string, event: ServerWsEvent) {
    const sockets = sessionConnections.get(sessionId);
    if (!sockets) {
      return;
    }

    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        send(socket, event);
      }
    }
  }

  function attach(socket: SessionSocket, sessionId: string) {
    const existing = sessionConnections.get(sessionId) ?? new Set<SessionSocket>();
    existing.add(socket);
    sessionConnections.set(sessionId, existing);
  }

  function detach(socket: SessionSocket) {
    const sessionId = socket.metadata?.sessionId;
    if (!sessionId) {
      return;
    }

    const existing = sessionConnections.get(sessionId);
    if (!existing) {
      return;
    }

    existing.delete(socket);
    if (existing.size === 0) {
      sessionConnections.delete(sessionId);
    }
  }

  wss.on('connection', (socket: SessionSocket, _request: IncomingMessage) => {
    socket.on('message', async (raw) => {
      try {
        const event = clientWsEventSchema.parse(JSON.parse(raw.toString()));

        if (event.type === 'session.join') {
          const claims = authService.verifyGuestToken(event.payload.token);
          if (claims.sessionId !== event.payload.sessionId) {
            send(socket, {
              type: 'session.error',
              payload: {
                sessionId: event.payload.sessionId,
                code: 'TOKEN_SESSION_MISMATCH',
                message: 'The session token does not match the requested session.',
              },
            });
            return;
          }

          socket.metadata = {
            sessionId: claims.sessionId,
            participantId: claims.participantId,
          };
          attach(socket, claims.sessionId);

          const overview = sessionService.getOverview(claims.sessionId);
          if (overview) {
            send(socket, {
              type: 'session.synced',
              payload: {
                overview,
              },
            });
          }

          return;
        }

        if (event.type === 'speech.turn.submit') {
          broadcast(event.payload.sessionId, {
            type: 'turn.processing',
            payload: {
              sessionId: event.payload.sessionId,
              participantId: event.payload.participantId,
              originalText: event.payload.originalText,
            },
          });

          const processed = await sessionService.processTurn(event.payload);
          if (!processed) {
            send(socket, {
              type: 'session.error',
              payload: {
                sessionId: event.payload.sessionId,
                code: 'SESSION_NOT_FOUND',
                message: 'Unable to process speech turn for a missing session.',
              },
            });
            return;
          }

          broadcast(event.payload.sessionId, {
            type: 'turn.completed',
            payload: {
              turn: processed.turn,
              assessment: processed.assessment,
            },
          });
          broadcast(event.payload.sessionId, {
            type: 'context.updated',
            payload: {
              sessionId: event.payload.sessionId,
              assessment: processed.assessment,
            },
          });

          if (!processed.turn.audioBase64) {
            broadcast(event.payload.sessionId, {
              type: 'session.warning',
              payload: {
                sessionId: event.payload.sessionId,
                message: 'Gemini TTS did not return audio. Check API server logs for details.',
              },
            });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown realtime error';
        send(socket, {
          type: 'session.error',
          payload: {
            code: 'WS_EVENT_INVALID',
            message,
          },
        });
      }
    });

    socket.on('close', () => {
      detach(socket);
    });
  });
}

