import { z } from 'zod';

export const webEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

export const apiEnvSchema = z.object({
  API_PORT: z.coerce.number().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  GUEST_SESSION_JWT_SECRET: z.string().min(16),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  LINGO_API_KEY: z.string().optional(),
  LINGO_ENGINE_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_API_KEYS: z.string().optional(),
  GEMINI_CONTEXT_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_TTS_MODEL: z.string().default('gemini-2.5-flash-preview-tts'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  R2_VOICE_PREFIX: z.string().default('LifeBridgeAI/voice-tts'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function parseWebEnv(input: Record<string, string | undefined>): WebEnv {
  return webEnvSchema.parse(input);
}

export function parseApiEnv(input: Record<string, string | undefined>): ApiEnv {
  return apiEnvSchema.parse({
    ...input,
    // Fall back to NEXT_PUBLIC_ vars so you only need to set Supabase once in .env
    SUPABASE_URL: input.SUPABASE_URL || input.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: input.SUPABASE_ANON_KEY || input.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
