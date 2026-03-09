'use client';

import { useEffect, useState } from 'react';

import { SectionCard, StatusBadge } from '@lifebridge/ui';
import type { SessionOverview } from '@lifebridge/shared';

import { fetchHistory } from '../../lib/api-client';

export function HistoryFeed() {
  const [sessions, setSessions] = useState<SessionOverview[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await fetchHistory();
        setSessions(data.sessions);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load history.');
      }
    }

    void loadHistory();
  }, []);

  if (error) {
    return <SectionCard className="font-mono text-sm font-semibold text-theme-red">[ERROR] {error}</SectionCard>;
  }

  if (sessions.length === 0) {
    return (
      <SectionCard>
        <p className="font-mono text-sm font-semibold text-theme-black/50">NO SESSION HISTORY FOUND.</p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      {sessions.map((overview) => (
        <SectionCard key={overview.session.id} className="space-y-6 border-b-8 border-r-8 !p-8">
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge tone={overview.session.severity === 'critical' ? 'critical' : 'warning'}>
              {overview.session.detectedEmergencyType}
            </StatusBadge>
            <StatusBadge tone="neutral">{overview.session.publicSessionCode}</StatusBadge>
          </div>
          <div className="grid gap-6 border-t-2 border-theme-black/10 pt-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black/50">SESSION STATUS</p>
              <p className="font-mono text-sm font-bold text-theme-black">{overview.session.status.toUpperCase()}</p>
            </div>
            <div className="space-y-2 border-l-2 border-theme-black/10 pl-6">
              <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black/50">COUNTRY ROUTING</p>
              <p className="font-mono text-sm font-bold text-theme-black">{overview.session.countryCode ?? 'UNKNOWN'}</p>
            </div>
            <div className="space-y-2 border-l-2 border-theme-black/10 pl-6">
              <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black/50">INCIDENT DISPATCH</p>
              <p className="font-mono text-sm font-bold text-theme-red">{overview.latestIncident?.summaryText ?? 'NO INCIDENT RECORD'}</p>
            </div>
          </div>
          <div className="border-2 border-theme-black bg-theme-white p-6 shadow-[4px_4px_0_var(--theme-black)]">
            <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black">CONVERSATION LOGS</p>
            <div className="mt-4 space-y-4">
              {overview.turns.map((turn) => (
                <div key={turn.id} className="border-l-4 border-theme-black bg-theme-black/5 p-4 pl-6 text-sm text-theme-black">
                  <p className="font-mono font-medium">&quot;{turn.originalText}&quot;</p>
                  <p className="mt-2 font-mono text-theme-red">&quot; {turn.translatedText} &quot;</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
