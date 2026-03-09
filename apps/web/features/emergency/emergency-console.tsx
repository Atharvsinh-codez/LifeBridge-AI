'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Mic, MicOff, RadioTower, Send, Volume2, Type, AudioLines } from 'lucide-react';

import type { ServerWsEvent } from '@lifebridge/shared';
import { SectionCard, StatusBadge } from '@lifebridge/ui';

import { createSession } from '../../lib/api-client';
import { createSpeechRecognition } from '../../lib/speech';
import { useEmergencySessionStore } from '../../stores/emergency-session-store';

/* ── Languages ── */
const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'es', label: 'Spanish' },
  { code: 'hi', label: 'Hindi' }, { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' }, { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' }, { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' }, { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' }, { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' }, { code: 'pl', label: 'Polish' },
  { code: 'tr', label: 'Turkish' }, { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' }, { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' }, { code: 'fi', label: 'Finnish' },
  { code: 'no', label: 'Norwegian' }, { code: 'el', label: 'Greek' },
  { code: 'he', label: 'Hebrew' }, { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' }, { code: 'hu', label: 'Hungarian' },
  { code: 'uk', label: 'Ukrainian' }, { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' }, { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' }, { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' }, { code: 'gu', label: 'Gujarati' },
  { code: 'ur', label: 'Urdu' }, { code: 'sw', label: 'Swahili' },
];

function speakWithBrowser(text: string, locale: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

type InputMode = 'voice' | 'text';

export function EmergencyConsole() {
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [manualText, setManualText] = useState('');
  const [sourceLocale, setSourceLocale] = useState('en');
  const [targetLocale, setTargetLocale] = useState('hi');
  const [isMicActive, setIsMicActive] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const sessionStartedRef = useRef(false);

  const {
    session, participant, overview, latestAssessment,
    connectionState, warnings, bootstrap, syncOverview,
    setAssessment, addTurn, addWarning, setConnectionState, reset,
  } = useEmergencySessionStore();

  const turns = useMemo(() => overview?.turns ?? [], [overview]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length]);

  useEffect(() => {
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, []);

  /* ── Handle server events ── */
  const handleServerEvent = useCallback((event: ServerWsEvent) => {
    if (event.type === 'session.synced') {
      syncOverview(event.payload.overview);
      setConnectionState('connected');
      return;
    }
    if (event.type === 'turn.completed') {
      addTurn(event.payload.turn);
      setAssessment(event.payload.assessment);
      setProcessingCount((c) => Math.max(0, c - 1));

      const turn = event.payload.turn as any;
      if (turn.audioUrl) {
        new Audio(turn.audioUrl).play().catch(() => speakWithBrowser(turn.translatedText, turn.targetLanguage));
      } else if (turn.audioBase64 && turn.audioMimeType) {
        new Audio(`data:${turn.audioMimeType};base64,${turn.audioBase64}`).play()
          .catch(() => speakWithBrowser(turn.translatedText, turn.targetLanguage));
      } else if (turn.translatedText) {
        speakWithBrowser(turn.translatedText, turn.targetLanguage);
      }
      return;
    }
    if (event.type === 'context.updated') { setAssessment(event.payload.assessment); return; }
    if (event.type === 'session.warning') { addWarning(event.payload.message); return; }
    if (event.type === 'session.error') { addWarning(event.payload.message); setConnectionState('error'); }
  }, [syncOverview, setConnectionState, addTurn, setAssessment, addWarning]);

  /* ── WebSocket connect ── */
  function connectSocket(nextWsUrl: string, nextToken: string, sessionId: string) {
    setConnectionState('connecting');
    const socket = new WebSocket(nextWsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'session.join', payload: { token: nextToken, sessionId } }));
    };
    socket.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as ServerWsEvent;
      handleServerEvent(event);
    };
    socket.onerror = () => {
      addWarning('WebSocket connection error. Please refresh.');
      setConnectionState('error');
    };
    socket.onclose = () => {
      setConnectionState('idle');
    };
  }

  /* ── Auto-start session ── */
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    (async () => {
      try {
        const created = await createSession({
          sourceLocale, targetLocale,
          initialCountryCode: 'US', initiatorName: 'Caller',
        });
        bootstrap({
          session: created.session as any,
          participant: created.participant as any,
          token: created.token, wsUrl: created.wsUrl,
        });
        connectSocket(created.wsUrl, created.token, created.session.id);
      } catch (error) {
        addWarning(error instanceof Error ? error.message : 'Unable to start emergency session.');
        setConnectionState('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Send turn (with proper guard) ── */
  function sendTurn(text: string) {
    if (!text.trim()) return;
    if (!wsRef.current || !session || !participant) {
      addWarning('Session not connected. Please refresh the page.');
      return;
    }
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      addWarning('Connection lost. Trying to reconnect...');
      setConnectionState('error');
      return;
    }

    setProcessingCount((c) => c + 1);
    wsRef.current.send(JSON.stringify({
      type: 'speech.turn.submit',
      payload: {
        sessionId: session.id,
        participantId: participant.id,
        originalText: text,
        sourceLocale, targetLocale,
      },
    }));
  }

  /* ── Mic capture ── */
  function handleMicCapture() {
    if (isMicActive) return;
    const recognition = createSpeechRecognition(sourceLocale);
    if (!recognition) {
      addWarning('Speech recognition unavailable in this browser.');
      return;
    }
    setIsMicActive(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setManualText(transcript);
        sendTurn(transcript);
      }
    };
    recognition.onerror = () => addWarning('Mic capture failed. Try again or type.');
    recognition.onend = () => setIsMicActive(false);
    recognition.start();
  }

  /* ── Reset ── */
  function handleReset() {
    wsRef.current?.close();
    wsRef.current = null;
    sessionStartedRef.current = false;
    setProcessingCount(0);
    reset();
    setManualText('');
    setTimeout(() => {
      sessionStartedRef.current = true;
      (async () => {
        try {
          const created = await createSession({
            sourceLocale, targetLocale,
            initialCountryCode: 'US', initiatorName: 'Caller',
          });
          bootstrap({
            session: created.session as any,
            participant: created.participant as any,
            token: created.token, wsUrl: created.wsUrl,
          });
          connectSocket(created.wsUrl, created.token, created.session.id);
        } catch (error) {
          addWarning(error instanceof Error ? error.message : 'Unable to restart session.');
          setConnectionState('error');
        }
      })();
    }, 200);
  }

  const isConnected = connectionState === 'connected';

  return (
    <div className="space-y-8">
      {/* ── Status Bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone="critical">EMERGENCY MODE</StatusBadge>
        <StatusBadge tone={isConnected ? 'success' : connectionState === 'connecting' ? 'warning' : connectionState === 'error' ? 'critical' : 'neutral'}>
          {isConnected ? '● CONNECTED' : connectionState === 'connecting' ? '◌ CONNECTING...' : connectionState === 'error' ? '✕ ERROR' : '○ STANDBY'}
        </StatusBadge>
        {processingCount > 0 && (
          <StatusBadge tone="warning">
            <span className="animate-pulse">PROCESSING {processingCount}...</span>
          </StatusBadge>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">
          {/* Language Selectors */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">I SPEAK</span>
              <select
                className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono font-bold text-theme-black outline-none focus:border-theme-red"
                value={sourceLocale} onChange={(e) => setSourceLocale(e.target.value)}
              >
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block font-pixel text-[10px] uppercase tracking-widest text-theme-black">TRANSLATE TO</span>
              <select
                className="w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono font-bold text-theme-black outline-none focus:border-theme-red"
                value={targetLocale} onChange={(e) => setTargetLocale(e.target.value)}
              >
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
          </div>

          {/* ── Mode Tabs ── */}
          <div className="flex border-2 border-theme-black">
            <button
              className={`flex flex-1 items-center justify-center gap-2 py-3 font-pixel text-[10px] uppercase tracking-widest transition-all ${inputMode === 'voice'
                  ? 'bg-theme-red text-theme-white shadow-inner'
                  : 'bg-theme-white text-theme-black hover:bg-theme-black/5'
                }`}
              onClick={() => setInputMode('voice')}
            >
              <AudioLines className="h-4 w-4" /> VOICE MODE
            </button>
            <button
              className={`flex flex-1 items-center justify-center gap-2 border-l-2 border-theme-black py-3 font-pixel text-[10px] uppercase tracking-widest transition-all ${inputMode === 'text'
                  ? 'bg-theme-red text-theme-white shadow-inner'
                  : 'bg-theme-white text-theme-black hover:bg-theme-black/5'
                }`}
              onClick={() => setInputMode('text')}
            >
              <Type className="h-4 w-4" /> TEXT MODE
            </button>
          </div>

          {/* ── Input Area ── */}
          <div className="border-4 border-theme-red bg-theme-white p-6 shadow-[8px_8px_0_var(--theme-black)]">
            {inputMode === 'voice' ? (
              /* Voice Mode */
              <div className="space-y-4">
                <button
                  className={`flex w-full items-center justify-center gap-4 py-10 font-pixel text-xl uppercase tracking-widest transition-all ${isMicActive
                      ? 'animate-pulse border-4 border-theme-black bg-theme-red text-theme-white'
                      : 'border-4 border-theme-black bg-theme-red text-theme-white shadow-[6px_6px_0_var(--theme-black)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_var(--theme-black)]'
                    }`}
                  onClick={handleMicCapture}
                  disabled={!isConnected}
                >
                  {isMicActive ? <MicOff className="h-12 w-12" /> : <Mic className="h-12 w-12" />}
                  <span>{isMicActive ? 'LISTENING...' : 'PRESS TO SPEAK'}</span>
                </button>
                {manualText && (
                  <div className="border-2 border-theme-black/20 bg-theme-black/5 p-3">
                    <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-black/40">CAPTURED</p>
                    <p className="mt-1 font-mono text-sm text-theme-black">{manualText}</p>
                  </div>
                )}
                {!isConnected && (
                  <p className="text-center font-mono text-xs text-theme-red">
                    Waiting for connection... Voice will activate once connected.
                  </p>
                )}
              </div>
            ) : (
              /* Text Mode */
              <div className="space-y-4">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="TYPE YOUR EMERGENCY MESSAGE..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!manualText.trim() || !isConnected) return;
                      sendTurn(manualText.trim());
                      setManualText('');
                    }
                  }}
                  className="min-h-28 w-full border-2 border-theme-black bg-theme-white px-4 py-3 font-mono text-lg font-bold text-theme-black outline-none placeholder:text-theme-black/20 focus:border-theme-red"
                />
                <button
                  className="flex w-full items-center justify-center gap-3 border-4 border-theme-black bg-theme-black py-3 font-pixel text-sm uppercase tracking-widest text-theme-white shadow-[4px_4px_0_var(--theme-red)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--theme-red)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!manualText.trim() || !isConnected}
                  onClick={() => {
                    if (!manualText.trim()) return;
                    sendTurn(manualText.trim());
                    setManualText('');
                  }}
                >
                  <Send className="h-5 w-5" /> TRANSLATE & SPEAK
                </button>
              </div>
            )}
          </div>

          {/* Reset */}
          <button
            className="w-full border-2 border-theme-black bg-theme-white py-3 font-pixel text-[10px] uppercase tracking-widest text-theme-black transition-all hover:bg-theme-black hover:text-theme-white"
            onClick={handleReset}
          >
            CLEAR & NEW SESSION
          </button>
        </div>

        {/* ── RIGHT COLUMN: AI + Warnings ── */}
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
              <p className="py-6 text-center font-mono text-sm uppercase text-theme-black/40">
                AI analysis will appear after your first message
              </p>
            )}
          </SectionCard>

          {warnings.length > 0 && (
            <SectionCard className="space-y-4 !border-theme-red">
              <div className="flex items-center gap-3 border-b-2 border-theme-red pb-3">
                <AlertTriangle className="h-5 w-5 text-theme-red" />
                <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-red">WARNINGS</p>
              </div>
              {warnings.slice(-5).map((warning, i) => (
                <div key={`${warning}-${i}`} className="border-2 border-theme-red bg-theme-red px-4 py-3 font-mono text-sm font-bold text-theme-white shadow-[3px_3px_0_var(--theme-black)]">
                  {warning}
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      </div>

      {/* ── TRANSLATION FEED (Full Width Below) ── */}
      <SectionCard className="!p-6">
        <p className="border-b-2 border-theme-black pb-3 font-pixel text-[10px] uppercase tracking-widest text-theme-red">
          TRANSLATION FEED — {turns.length} MESSAGES
        </p>
        <div ref={scrollRef} className="mt-4 max-h-[500px] space-y-4 overflow-y-auto">
          {turns.length === 0 ? (
            <p className="py-8 text-center font-mono text-sm uppercase text-theme-black/40">
              Speak or type to begin translation...
            </p>
          ) : (
            turns.map((turn) => {
              const turnAny = turn as any;
              return (
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
                      <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-red">TRANSLATED</p>
                      <p className="mt-1 font-mono text-lg font-bold text-theme-red">{turn.translatedText}</p>
                      <button
                        className="mt-2 flex items-center gap-2 border-2 border-theme-black bg-theme-black px-3 py-1.5 font-pixel text-[9px] uppercase tracking-widest text-theme-white shadow-[2px_2px_0_var(--theme-red)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--theme-red)]"
                        onClick={() => {
                          if (turnAny.audioUrl) {
                            new Audio(turnAny.audioUrl).play().catch(() => speakWithBrowser(turn.translatedText, turn.targetLanguage));
                          } else if (turn.audioBase64 && turn.audioMimeType) {
                            new Audio(`data:${turn.audioMimeType};base64,${turn.audioBase64}`).play().catch(() => speakWithBrowser(turn.translatedText, turn.targetLanguage));
                          } else {
                            speakWithBrowser(turn.translatedText, turn.targetLanguage);
                          }
                        }}
                      >
                        <Volume2 className="h-3 w-3" /> REPLAY
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {processingCount > 0 && (
            <div className="flex items-center gap-3 border-2 border-dashed border-theme-red/50 bg-theme-red/5 p-5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-theme-red border-t-transparent" />
              <p className="animate-pulse font-mono text-sm font-bold text-theme-red">
                Processing {processingCount} translation{processingCount > 1 ? 's' : ''}...
              </p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
