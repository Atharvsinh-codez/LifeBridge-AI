'use client';

import {
  createSessionRequestSchema,
  createSessionResponseSchema,
  historyResponseSchema,
  incidentResponseSchema,
  profileUpsertSchema,
} from '@lifebridge/shared';

import { getSupabaseBrowser } from './supabase/browser';
import { webEnv } from './env';

async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
) {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...init.headers as Record<string, string>,
  };

  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${webEnv.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createSession(input: unknown) {
  const payload = createSessionRequestSchema.parse(input);
  const data = await request('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return createSessionResponseSchema.parse(data);
}

export async function fetchProfile() {
  const data = await request<{ profile: unknown }>('/api/v1/me/profile');
  return data.profile;
}

export async function saveProfile(input: unknown) {
  const payload = profileUpsertSchema.parse(input);
  return request<{ profile: unknown }>('/api/v1/me/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchHistory() {
  const data = await request('/api/v1/me/history');
  return historyResponseSchema.parse(data);
}

export async function fetchIncident(sessionId: string) {
  const data = await request(`/api/v1/incidents/${sessionId}`);
  return incidentResponseSchema.parse(data);
}

export async function fetchPublicProfile(username: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/v1/profiles/${username}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Profile not found');
  }
  const data = await response.json();
  return data.profile;
}
