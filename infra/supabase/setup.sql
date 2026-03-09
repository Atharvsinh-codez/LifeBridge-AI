-- ==========================================================================
-- LifeBridge AI — Complete Database Setup (Updated)
-- Run this entire file in Supabase Dashboard → SQL Editor → New Query → Run
-- ==========================================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'responder', 'admin');
CREATE TYPE session_status AS ENUM ('created', 'active', 'escalated', 'completed', 'cancelled');
CREATE TYPE emergency_type AS ENUM ('medical', 'police', 'fire', 'disaster', 'unknown');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE participant_role AS ENUM ('guest', 'patient', 'companion', 'responder', 'admin');
CREATE TYPE incident_status AS ENUM ('open', 'reviewed', 'closed');
CREATE TYPE emergency_service_type AS ENUM ('ambulance', 'police', 'fire', 'unified');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  display_name text,
  primary_locale text NOT NULL DEFAULT 'en',
  home_country_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create public.users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name, primary_locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'preferred_locale', 'en')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Emergency Profiles (with shareable username + extended fields)
CREATE TABLE public.emergency_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  legal_name text NOT NULL DEFAULT '',
  date_of_birth date,
  gender text,
  nationality text,
  spoken_languages text[] NOT NULL DEFAULT '{}',
  blood_type text,
  allergies text[] NOT NULL DEFAULT '{}',
  medications text[] NOT NULL DEFAULT '{}',
  chronic_conditions text[] NOT NULL DEFAULT '{}',
  insurance_provider text,
  insurance_id text,
  emergency_contacts jsonb NOT NULL DEFAULT '[]',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_username ON public.emergency_profiles(username) WHERE username IS NOT NULL;

-- Emergency Sessions
CREATE TABLE public.emergency_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_session_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  initiator_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status session_status NOT NULL DEFAULT 'created',
  source_locale text NOT NULL DEFAULT 'en',
  target_locale text NOT NULL DEFAULT 'en',
  detected_emergency_type emergency_type NOT NULL DEFAULT 'unknown',
  severity severity_level NOT NULL DEFAULT 'low',
  country_code text,
  geo_lat double precision,
  geo_lng double precision,
  suggested_primary_number text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX idx_sessions_status ON public.emergency_sessions(status);
CREATE INDEX idx_sessions_initiator ON public.emergency_sessions(initiator_user_id);

-- Session Participants
CREATE TABLE public.session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.emergency_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  participant_role participant_role NOT NULL DEFAULT 'guest',
  display_name text NOT NULL,
  preferred_locale text NOT NULL DEFAULT 'en',
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz
);

CREATE INDEX idx_participants_session ON public.session_participants(session_id);
CREATE INDEX idx_participants_user ON public.session_participants(user_id);

-- Conversation Logs
CREATE TABLE public.conversation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.emergency_sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.session_participants(id) ON DELETE CASCADE,
  turn_index integer NOT NULL,
  original_text text NOT NULL,
  normalized_text text NOT NULL,
  translated_text text NOT NULL,
  detected_language text NOT NULL,
  target_language text NOT NULL,
  emergency_type_snapshot emergency_type NOT NULL DEFAULT 'unknown',
  severity_snapshot severity_level NOT NULL DEFAULT 'low',
  translation_latency_ms integer NOT NULL DEFAULT 0,
  tts_latency_ms integer NOT NULL DEFAULT 0,
  audio_base64 text,
  audio_mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_session ON public.conversation_logs(session_id);
CREATE INDEX idx_conversation_turn ON public.conversation_logs(session_id, turn_index);

-- Incident Reports
CREATE TABLE public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.emergency_sessions(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  emergency_type emergency_type NOT NULL DEFAULT 'unknown',
  severity severity_level NOT NULL DEFAULT 'low',
  confidence numeric NOT NULL DEFAULT 0,
  recommended_action text NOT NULL DEFAULT '',
  medical_context jsonb NOT NULL DEFAULT '[]',
  responder_notes text,
  status incident_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_session ON public.incident_reports(session_id);
CREATE INDEX idx_incidents_status ON public.incident_reports(status);

-- Country Emergency Numbers
CREATE TABLE public.country_emergency_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  service_type emergency_service_type NOT NULL,
  phone_number text NOT NULL,
  label text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_emergency_numbers_country ON public.country_emergency_numbers(country_code);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_emergency_numbers ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_admin_select" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Emergency Profiles: own read/write + public read by username
CREATE POLICY "profiles_select_own" ON public.emergency_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.emergency_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.emergency_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON public.emergency_profiles FOR DELETE USING (auth.uid() = user_id);
-- Public shareable profile: anyone can view profiles that have a username set
CREATE POLICY "profiles_public_by_username" ON public.emergency_profiles FOR SELECT USING (username IS NOT NULL);

-- Emergency Sessions
CREATE POLICY "sessions_select_own" ON public.emergency_sessions FOR SELECT USING (auth.uid() = initiator_user_id);
CREATE POLICY "sessions_insert_auth" ON public.emergency_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update_own" ON public.emergency_sessions FOR UPDATE USING (auth.uid() = initiator_user_id);
CREATE POLICY "sessions_admin_select" ON public.emergency_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'responder'))
);

-- Session Participants
CREATE POLICY "participants_select_own_session" ON public.session_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.emergency_sessions WHERE id = session_id AND initiator_user_id = auth.uid())
);
CREATE POLICY "participants_insert" ON public.session_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_admin_select" ON public.session_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'responder'))
);

-- Conversation Logs
CREATE POLICY "logs_select_own_session" ON public.conversation_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.emergency_sessions WHERE id = session_id AND initiator_user_id = auth.uid())
);
CREATE POLICY "logs_insert" ON public.conversation_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "logs_admin_select" ON public.conversation_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'responder'))
);

-- Incident Reports
CREATE POLICY "incidents_select_own_session" ON public.incident_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.emergency_sessions WHERE id = session_id AND initiator_user_id = auth.uid())
);
CREATE POLICY "incidents_insert" ON public.incident_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "incidents_update" ON public.incident_reports FOR UPDATE USING (true);
CREATE POLICY "incidents_admin_select" ON public.incident_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'responder'))
);

-- Emergency Numbers (public read)
CREATE POLICY "emergency_numbers_public_select" ON public.country_emergency_numbers FOR SELECT USING (true);

-- ============================================================
-- 4. SEED DATA — Emergency Numbers (20+ Countries)
-- ============================================================

INSERT INTO public.country_emergency_numbers (country_code, service_type, phone_number, label, is_primary) VALUES
  ('IN', 'unified', '112', 'National Emergency Response', true),
  ('IN', 'ambulance', '108', 'Ambulance Service', false),
  ('IN', 'police', '100', 'Police', false),
  ('IN', 'fire', '101', 'Fire Service', false),
  ('US', 'unified', '911', 'Emergency Services', true),
  ('GB', 'unified', '999', 'Emergency Services', true),
  ('GB', 'unified', '112', 'EU Emergency Number', false),
  ('JP', 'ambulance', '119', 'Fire and Ambulance', true),
  ('JP', 'police', '110', 'Police', true),
  ('ES', 'unified', '112', 'Emergency Services', true),
  ('DE', 'unified', '112', 'Emergency Services', true),
  ('DE', 'police', '110', 'Police', false),
  ('FR', 'unified', '112', 'Emergency Services', true),
  ('FR', 'ambulance', '15', 'SAMU (Medical)', false),
  ('FR', 'police', '17', 'Police', false),
  ('FR', 'fire', '18', 'Fire Brigade', false),
  ('AU', 'unified', '000', 'Emergency Services', true),
  ('AU', 'unified', '112', 'Mobile Emergency', false),
  ('CA', 'unified', '911', 'Emergency Services', true),
  ('CN', 'ambulance', '120', 'Ambulance', true),
  ('CN', 'police', '110', 'Police', true),
  ('CN', 'fire', '119', 'Fire', true),
  ('BR', 'ambulance', '192', 'SAMU (Ambulance)', true),
  ('BR', 'police', '190', 'Military Police', false),
  ('BR', 'fire', '193', 'Fire Brigade', false),
  ('KR', 'ambulance', '119', 'Fire and Ambulance', true),
  ('KR', 'police', '112', 'Police', true),
  ('MX', 'unified', '911', 'Emergency Services', true),
  ('RU', 'unified', '112', 'Emergency Services', true),
  ('RU', 'ambulance', '103', 'Ambulance', false),
  ('RU', 'police', '102', 'Police', false),
  ('IT', 'unified', '112', 'Emergency Services', true),
  ('IT', 'ambulance', '118', 'Ambulance', false),
  ('NL', 'unified', '112', 'Emergency Services', true),
  ('TH', 'ambulance', '1669', 'Emergency Medical', true),
  ('TH', 'police', '191', 'Police', true),
  ('TH', 'fire', '199', 'Fire', true),
  ('AE', 'unified', '999', 'Emergency Services', true),
  ('AE', 'ambulance', '998', 'Ambulance', false),
  ('SG', 'ambulance', '995', 'Ambulance and Fire', true),
  ('SG', 'police', '999', 'Police', true);

-- ============================================================
-- 5. MIGRATION — Run ONLY if you already have the old schema
-- This safely adds new columns to an existing emergency_profiles table.
-- If you ran a clean setup from scratch, skip this section.
-- ============================================================

-- ALTER TABLE public.emergency_profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
-- ALTER TABLE public.emergency_profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
-- ALTER TABLE public.emergency_profiles ADD COLUMN IF NOT EXISTS gender text;
-- ALTER TABLE public.emergency_profiles ADD COLUMN IF NOT EXISTS nationality text;
-- ALTER TABLE public.emergency_profiles ADD COLUMN IF NOT EXISTS spoken_languages text[] NOT NULL DEFAULT '{}';
-- ALTER TABLE public.emergency_profiles ADD COLUMN IF NOT EXISTS insurance_provider text;
-- ALTER TABLE public.emergency_profiles ADD COLUMN IF NOT EXISTS insurance_id text;
-- CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.emergency_profiles(username) WHERE username IS NOT NULL;
-- CREATE POLICY "profiles_public_by_username" ON public.emergency_profiles FOR SELECT USING (username IS NOT NULL);
