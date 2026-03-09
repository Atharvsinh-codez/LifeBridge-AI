import { createServer } from 'node:http';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { WebSocketServer } from 'ws';

import { env } from './config/env';
import { getSupabaseAdmin } from './config/supabase';
import { AuthService } from './modules/auth/auth-service';
import { ContextService } from './modules/context/context-service';
import { createEmergencyNumberRouter } from './modules/emergency-numbers/emergency-number-routes';
import { createIncidentRouter } from './modules/incidents/incident-routes';
import { createProfileRouter } from './modules/profiles/profile-routes';
import { SessionService } from './modules/sessions/session-service';
import { createSessionRouter } from './modules/sessions/session-routes';
import { MemoryStore } from './modules/sessions/store';
import { TranslationService } from './modules/translation/translation-service';
import { VoiceService } from './modules/voice/voice-service';
import { R2StorageService } from './modules/voice/r2-storage';
import { registerSocketHub } from './ws/socket-hub';

const logger = pino({
  level: env.LOG_LEVEL,
});

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(',').map((value) => value.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(
  pinoHttp({
    logger,
  }),
);

const supabaseAdmin = getSupabaseAdmin();
if (!supabaseAdmin) {
  logger.warn('Supabase is not configured — running with in-memory store only');
}

const store = new MemoryStore();
const authService = new AuthService(env.GUEST_SESSION_JWT_SECRET, env.SUPABASE_JWT_SECRET);
const translationService = new TranslationService(env.LINGO_API_KEY, env.LINGO_ENGINE_ID);
const contextService = new ContextService(env.GEMINI_API_KEY, env.GEMINI_CONTEXT_MODEL);
const r2Storage = new R2StorageService({
  accountId: env.R2_ACCOUNT_ID,
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  bucketName: env.R2_BUCKET_NAME,
  publicUrl: env.R2_PUBLIC_URL,
  voicePrefix: env.R2_VOICE_PREFIX,
});
const voiceService = new VoiceService(env.GEMINI_API_KEY, env.GEMINI_TTS_MODEL, r2Storage);
const sessionService = new SessionService(store, contextService, translationService, voiceService);

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'lifebridge-api',
    supabase: supabaseAdmin ? 'connected' : 'not configured',
  });
});

app.use('/api/v1/sessions', createSessionRouter(sessionService, authService));
app.use('/api/v1/emergency-numbers', createEmergencyNumberRouter());
app.use('/api/v1/me', createProfileRouter(sessionService, authService));
app.use('/api/v1/incidents', createIncidentRouter(sessionService));

// Public profile lookup by username (no auth required)
app.get('/api/v1/profiles/:username', (request, response) => {
  const { username } = request.params;
  const profile = sessionService.getProfileByUsername(username);
  if (!profile) {
    response.status(404).json({ error: 'Profile not found' });
    return;
  }
  // Return a sanitized copy — strip internal userId
  const { userId, ...publicProfile } = profile;
  response.json({ profile: publicProfile });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown server error';
  logger.error({ error }, 'Unhandled API error');
  response.status(500).json({
    error: message,
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
registerSocketHub(wss, authService, sessionService);

server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/ws') {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (websocket) => {
    wss.emit('connection', websocket, request);
  });
});

server.listen(env.API_PORT, env.API_HOST, () => {
  logger.info(
    {
      host: env.API_HOST,
      port: env.API_PORT,
    },
    'LifeBridge API listening',
  );
});
