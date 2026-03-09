'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Mic, MicOff, RadioTower, Send, Volume2 } from 'lucide-react';

import type { ServerWsEvent } from '@lifebridge/shared';
import { SectionCard, StatusBadge } from '@lifebridge/ui';

import { createSession } from '../../lib/api-client';
import { createSpeechRecognition } from '../../lib/speech';
import { useEmergencySessionStore } from '../../stores/emergency-session-store';

/* ── 30+ languages (ISO 639-1) ── */
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'hi', label: 'Hindi' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'el', label: 'Greek' },
  { code: 'he', label: 'Hebrew' },
  { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'ur', label: 'Urdu' },
  { code: 'sw', label: 'Swahili' },
];

export function EmergencyConsole() {
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [manualText, setManualText] = useState('');
  const [sourceLocale, setSourceLocale] = useState('en');
  const [targetLocale, setTargetLocale] = useState('hi');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const sessionStartedRef = useRef(false);

  const {
    session,
    participant,
    overview,
    latestAssessment,
    connectionState,
    warnings,
    bootstrap,
    syncOverview,
    setAssessment,
    addTurn,
    addWarning,
    setConnectionState,
    reset,
  } = useEmergencySessionStore();

  const turns = useMemo(() => overview?.turns ?? [], [overview]);

  /* ── Scroll transcript to bottom on new turns ── */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length]);

  /* ── Cleanup WebSocket on unmount ── */
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  /* ── Handle server events from WebSocket ── */
  const handleServerEvent = useCallback((event: ServerWsEvent) => {
    if (event.type === 'session.synced') {
      syncOverview(event.payload.overview);
      setConnectionState('connected');
      return;
    }

    if (event.type === 'turn.completed') {
      addTurn(event.payload.turn);
      setAssessment(event.payload.assessment);
      setIsTranslating(false);

      // Play Gemini TTS audio if available
      if (event.payload.turn.audioBase64 && event.payload.turn.audioMimeType) {
        const audio = new Audio(`data:${event.payload.turn.audioMimeType};base64,${event.payload.turn.audioBase64}`);
        audio.play().catch(() => {
          // TTS playback failed — silent fallback, text is still visible
        });
      }

      return;
    }

    if (event.type === 'context.updated') {
      setAssessment(event.payload.assessment);
      return;
    }

    if (event.type === 'session.warning') {
      addWarning(event.payload.message);
      return;
    }

    if (event.type === 'session.error') {
      addWarning(event.payload.message);
      setConnectionState('error');
    }
  }, [syncOverview, setConnectionState, addTurn, setAssessment, addWarning]);

  /* ── Connect WebSocket ── */
  async function connectSocket(nextWsUrl: string, nextToken: string, sessionId: string) {
    setConnectionState('connecting');
    const socket = new WebSocket(nextWsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: 'session.join',
          payload: { token: nextToken, sessionId },
        }),
      );
    };

    socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as ServerWsEvent;
      handleServerEvent(event);
    };

    socket.onclose = () => {
      setConnectionState('idle');
    };
  }

  /* ── Auto-start session on mount ── */
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    async function autoStart() {
      try {
        const created = await createSession({
          sourceLocale,
          targetLocale,
          initialCountryCode: 'US',
          initiatorName: 'Caller',
        });

        bootstrap({
          session: created.session,
          participant: created.participant,
          token: created.token,
          wsUrl: created.wsUrl,
        });
        await connectSocket(created.wsUrl, created.token, created.session.id);
      } catch (error) {
        addWarning(error instanceof Error ? error.message : 'Unable to start emergency session.');
        setConnectionState('error');
      }
    }

    void autoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Send a translation turn via WebSocket ── */
  async function sendTurn(text: string) {
    if (!wsRef.current || !session || !participant || wsRef.current.readyState !== WebSocket.OPEN) {
      addWarning('Session not connected. Please refresh the page.');
      return;
    }

    setIsTranslating(true);

    wsRef.current.send(
      JSON.stringify({
        type: 'speech.turn.submit',
        payload: {
          sessionId: session.id,
          participantId: participant.id,
          originalText: text,
          sourceLocale,
          targetLocale,
        },
      }),
    );
  }

  /* ── Microphone capture using browser Speech Recognition ── */
  function handleMicCapture() {
    if (isMicActive) return;

    const recognition = createSpeechRecognition(sourceLocale);
    if (!recognition) {
      addWarning('Speech recognition unavailable in this browser. Use typed input instead.');
      return;
    }

    setIsMicActive(true);
    recognition.onresult = (event) => {
      const result = event.results[0];
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript) {
        setManualText(transcript);
        void sendTurn(transcript);
      }
    };
    recognition.onerror = () => {
      addWarning('Microphone capture failed. Please try again or type your message.');
    };
    recognition.onend = () => {
      setIsMicActive(false);
    };
    recognition.start();
  }

  /* ── Handle Reset ── */
  function handleReset() {
    wsRef.current?.close();
    wsRef.current = null;
    sessionStartedRef.current = false;
    reset();
    setManualText('');
    // Re-start new session
    setTimeout(() => {
      sessionStartedRef.current = true;
      void (async () => {
        try {
          const created = await createSession({
            sourceLocale,
            targetLocale,
            initialCountryCode: 'US',
            initiatorName: 'Caller',
          });
          bootstrap({
            session: created.session,
            participant: created.participant,
            token: created.token,
            wsUrl: created.wsUrl,
          });
          await connectSocket(created.wsUrl, created.token, created.session.id);
        } catch (error) {
          addWarning(error instanceof Error ? error.message : 'Unable to restart session.');
          setConnectionState('error');
        }
      })();
    }, 200);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
      {/* ── LEFT: Main Panic Interface ── */}
      <div className="space-y-6">
        {/* Status Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge tone="critical">EMERGENCY MODE</StatusBadge>
          <StatusBadge tone={connectionState === 'connected' ? 'success' : connectionState === 'connecting' ? 'warning' : 'neutral'}>
            {connectionState === 'connected' ? 'LIVE' : connectionState === 'connecting' ? 'CONNECTING...' : connectionState === 'error' ? 'ERROR' : 'STANDBY'}
          </StatusBadge>
          {isTranslating && <StatusBadge tone="warning">TRANSLATING...</StatusBadge>}
        </div>

        {/* Language selector */}
        <SectionCard className="!p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">I SPEAK</span>
              <select
                className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono font-bold text-theme-black outline-none focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
                value={sourceLocale}
                onChange={(e) => setSourceLocale(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">TRANSLATE TO</span>
              <select
                className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono font-bold text-theme-black outline-none focus:border-theme-red focus:shadow-[4px_4px_0_var(--theme-red)]"
                value={targetLocale}
                onChange={(e) => setTargetLocale(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </label>
          </div>
        </SectionCard>

        {/* ── Panic Capture Area ── */}
        <div className="border-4 border-theme-red bg-theme-white p-6 shadow-[8px_8px_0_var(--theme-black)]">
          {/* Giant Mic Button */}
          <button
            className={`flex w-full items-center justify-center gap-4 py-8 text-center font-pixel text-xl uppercase tracking-widest transition-all ${isMicActive
                ? 'animate-pulse border-4 border-theme-black bg-theme-red text-theme-white shadow-none'
                : 'border-4 border-theme-black bg-theme-red text-theme-white shadow-[6px_6px_0_var(--theme-black)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_var(--theme-black)]'
              }`}
            onClick={handleMicCapture}
          >
            {isMicActive ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
            <span>{isMicActive ? 'LISTENING...' : 'PRESS TO SPEAK'}</span>
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-[2px] flex-1 bg-theme-black/20" />
            <span className="font-pixel text-[10px] uppercase tracking-widest text-theme-black/50">OR TYPE</span>
            <div className="h-[2px] flex-1 bg-theme-black/20" />
          </div>

          {/* Text input + Send */}
          <div className="flex gap-4">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="TYPE YOUR EMERGENCY MESSAGE..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!manualText.trim()) return;
                  void sendTurn(manualText.trim());
                  setManualText('');
                }
              }}
              className="min-h-24 flex-1 border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-lg font-bold text-theme-black outline-none placeholder:text-theme-black/20 focus:border-theme-red"
            />
            <button
              className="flex items-center justify-center border-4 border-theme-black bg-theme-black px-6 font-pixel text-sm uppercase text-theme-white shadow-[4px_4px_0_var(--theme-red)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--theme-red)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              onClick={() => {
                if (!manualText.trim()) return;
                void sendTurn(manualText.trim());
                setManualText('');
              }}
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Reset button */}
        <button
          className="w-full border-2 border-theme-black bg-theme-white py-3 font-pixel text-[10px] uppercase tracking-widest text-theme-black transition-all hover:bg-theme-black hover:text-theme-white"
          onClick={handleReset}
        >
          CLEAR &amp; NEW SESSION
        </button>

        {/* ── Transcript Feed ── */}
        <SectionCard className="!p-6">
          <p className="border-b-2 border-theme-black pb-3 font-pixel text-[10px] uppercase tracking-widest text-theme-red">
            TRANSLATION FEED
          </p>
          <div ref={scrollRef} className="mt-4 max-h-96 space-y-4 overflow-y-auto">
            {turns.length === 0 ? (
              <p className="py-8 text-center font-mono text-sm text-theme-black/40 uppercase">
                Speak or type to begin translation...
              </p>
            ) : (
              turns.map((turn) => (
                <div key={turn.id} className="border-2 border-theme-black bg-theme-white p-5 shadow-[3px_3px_0_var(--theme-black)]">
                  <div className="flex flex-wrap items-center gap-3 pb-3">
                    <StatusBadge tone={turn.severitySnapshot === 'critical' ? 'critical' : 'warning'}>
                      {turn.emergencyTypeSnapshot}
                    </StatusBadge>
                    <StatusBadge tone="neutral">{turn.detectedLanguage} → {turn.targetLanguage}</StatusBadge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-black/50">ORIGINAL</p>
                      <p className="mt-1 font-mono text-base font-semibold text-theme-black">{turn.originalText}</p>
                    </div>
                    <div>
                      <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-red">
                        TRANSLATED
                        {turn.audioBase64 && <Volume2 className="ml-2 inline h-3 w-3" />}
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold text-theme-red">{turn.translatedText}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── RIGHT: Context Intelligence ── */}
      <div className="space-y-6">
        <SectionCard className="space-y-6">
          <div className="flex items-center gap-4 border-b-2 border-theme-black pb-4">
            <RadioTower className="h-6 w-6 text-theme-black" />
            <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black">AI ASSESSMENT</p>
          </div>
          {latestAssessment ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone={latestAssessment.severity === 'critical' ? 'critical' : 'warning'}>
                  {latestAssessment.emergencyType}
                </StatusBadge>
                <StatusBadge tone="success">
                  CONFIDENCE {Math.round(latestAssessment.confidence * 100)}%
                </StatusBadge>
              </div>
              <div className="border-l-4 border-theme-black bg-theme-black/5 p-4">
                <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-black/50">SUMMARY</p>
                <p className="mt-2 font-mono text-sm font-bold text-theme-black">{latestAssessment.responderSummary}</p>
              </div>
              <div className="border-l-4 border-theme-red bg-theme-red/10 p-4">
                <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-red">SUGGESTED ACTION</p>
                <p className="mt-2 font-mono text-sm font-bold uppercase text-theme-red">{latestAssessment.suggestedAction}</p>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center font-mono text-sm text-theme-black/40 uppercase">
              AI analysis will appear after your first message
            </p>
          )}
        </SectionCard>

        {/* Warnings */}
        {warnings.length > 0 && (
          <SectionCard className="space-y-4 !border-theme-red">
            <div className="flex items-center gap-3 border-b-2 border-theme-red pb-3">
              <AlertTriangle className="h-5 w-5 text-theme-red" />
              <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-red">WARNINGS</p>
            </div>
            {warnings.map((warning, i) => (
              <div key={`${warning}-${i}`} className="border-2 border-theme-red bg-theme-red px-4 py-3 font-mono text-sm font-bold text-theme-white shadow-[3px_3px_0_var(--theme-black)]">
                {warning}
              </div>
            ))}
          </SectionCard>
        )}
      </div>
    </div>
  );
}
