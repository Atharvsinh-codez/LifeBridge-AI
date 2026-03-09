'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, FileText, Shield } from 'lucide-react';

import type { SessionOverview } from '@lifebridge/shared';

import { fetchHistory } from '../../lib/api-client';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-theme-red text-theme-white',
  high: 'bg-theme-red/80 text-theme-white',
  medium: 'bg-yellow-500 text-theme-black',
  low: 'bg-green-600 text-theme-white',
};

const TYPE_ICONS: Record<string, string> = {
  medical: '🏥',
  police: '🚔',
  fire: '🔥',
  disaster: '⚠️',
  unknown: '📋',
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function SessionCard({ overview }: { overview: SessionOverview }) {
  const [expanded, setExpanded] = useState(false);
  const s = overview.session;
  const turns = overview.turns ?? [];
  const incident = overview.latestIncident;

  return (
    <div className="border-2 border-theme-black bg-theme-white shadow-[6px_6px_0_var(--theme-black)] transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-theme-black/10 p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TYPE_ICONS[s.detectedEmergencyType] ?? '📋'}</span>
          <div>
            <p className="font-pixel text-sm uppercase tracking-widest text-theme-black">
              {s.detectedEmergencyType.toUpperCase()} EMERGENCY
            </p>
            <p className="mt-1 font-mono text-xs text-theme-black/50">
              <Clock className="mr-1 inline h-3 w-3" />
              {formatDate(s.startedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 font-pixel text-[10px] uppercase tracking-widest ${SEVERITY_COLORS[s.severity] ?? 'bg-gray-200 text-theme-black'}`}>
            <Shield className="mr-1 h-3 w-3" />
            {s.severity}
          </span>
          <span className="inline-flex items-center bg-theme-black px-3 py-1 font-mono text-[10px] text-theme-white">
            {s.status.toUpperCase()}
          </span>
          <span className="bg-theme-black/10 px-3 py-1 font-mono text-[10px] text-theme-black">
            #{s.publicSessionCode}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-px border-b-2 border-theme-black/10 bg-theme-black/5 md:grid-cols-4">
        <div className="bg-theme-white p-4">
          <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-black/40">LANGUAGES</p>
          <p className="mt-1 font-mono text-sm font-bold text-theme-black">
            {s.sourceLocale.toUpperCase()} → {s.targetLocale.toUpperCase()}
          </p>
        </div>
        <div className="bg-theme-white p-4">
          <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-black/40">TURNS</p>
          <p className="mt-1 font-mono text-sm font-bold text-theme-black">{turns.length}</p>
        </div>
        <div className="bg-theme-white p-4">
          <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-black/40">DURATION</p>
          <p className="mt-1 font-mono text-sm font-bold text-theme-black">
            {s.endedAt
              ? `${Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)}m`
              : 'ACTIVE'}
          </p>
        </div>
        <div className="bg-theme-white p-4">
          <p className="font-pixel text-[9px] uppercase tracking-widest text-theme-black/40">AI CONFIDENCE</p>
          <p className="mt-1 font-mono text-sm font-bold text-theme-red">
            {incident ? `${Math.round(incident.confidence * 100)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Incident summary */}
      {incident && (
        <div className="border-b-2 border-theme-black/10 bg-theme-red/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-theme-red" />
            <div>
              <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-red">AI INCIDENT ASSESSMENT</p>
              <p className="mt-2 font-mono text-sm leading-relaxed text-theme-black">{incident.summaryText}</p>
              {incident.recommendedAction && (
                <p className="mt-2 font-mono text-xs text-theme-black/70">
                  <strong>RECOMMENDED:</strong> {incident.recommendedAction}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expandable conversation */}
      <div className="p-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between font-pixel text-[10px] uppercase tracking-widest text-theme-black hover:text-theme-red"
        >
          <span className="flex items-center gap-2">
            <FileText className="h-3 w-3" />
            CONVERSATION TRANSCRIPT ({turns.length} turns)
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && turns.length > 0 && (
          <div className="mt-4 space-y-3 border-t-2 border-theme-black/10 pt-4">
            {turns.map((turn, i) => (
              <div
                key={turn.id}
                className="flex gap-4 border-l-4 border-theme-black/20 py-2 pl-4"
              >
                <span className="shrink-0 font-mono text-[10px] font-bold text-theme-black/30">
                  #{i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm text-theme-black">
                    <span className="mr-2 inline-block bg-theme-black/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                      {turn.detectedLanguage}
                    </span>
                    &ldquo;{turn.originalText}&rdquo;
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-theme-red">
                    <span className="mr-2 inline-block bg-theme-red/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-theme-red">
                      {turn.targetLanguage}
                    </span>
                    &ldquo;{turn.translatedText}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {expanded && turns.length === 0 && (
          <p className="mt-4 font-mono text-xs text-theme-black/40">No conversation recorded.</p>
        )}
      </div>
    </div>
  );
}

export function HistoryFeed() {
  const [sessions, setSessions] = useState<SessionOverview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await fetchHistory();
        setSessions(data.sessions);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load history.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="animate-pulse font-pixel text-theme-red">LOADING HISTORY...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-theme-red bg-theme-red/5 p-6">
        <p className="font-mono text-sm font-semibold text-theme-red">[ERROR] {error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="border-2 border-theme-black bg-theme-white p-12 text-center shadow-[6px_6px_0_var(--theme-black)]">
        <p className="font-pixel text-lg text-theme-black/30">NO SESSIONS YET</p>
        <p className="mt-2 font-mono text-sm text-theme-black/50">
          Your emergency session history will appear here after using the console.
        </p>
      </div>
    );
  }

  // Group sessions by date
  const groupedByDate: Record<string, SessionOverview[]> = {};
  for (const s of sessions) {
    const dateKey = new Date(s.session.startedAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(s);
  }

  return (
    <div className="space-y-10">
      {Object.entries(groupedByDate).map(([date, dateSessions]) => (
        <div key={date}>
          <div className="mb-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-theme-black/15" />
            <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black/40">{date}</p>
            <div className="h-px flex-1 bg-theme-black/15" />
          </div>
          <div className="space-y-6">
            {dateSessions.map((overview) => (
              <SessionCard key={overview.session.id} overview={overview} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
