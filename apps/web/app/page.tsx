import Link from 'next/link';
import { Activity, Globe2, HeartPulse, Siren } from 'lucide-react';

import { APP_NAME, APP_TAGLINE } from '@lifebridge/shared';
import { PrimaryActionButton, SectionCard, StatusBadge } from '@lifebridge/ui';

import { PageShell } from '../components/page-shell';

const pillars = [
  {
    title: 'REAL-TIME TRANSLATION',
    description: 'Panic-safe voice and text translation across 30+ languages using Lingo.dev.',
    icon: Globe2,
  },
  {
    title: 'TRIAGE INTELLIGENCE',
    description: 'Context-aware classification and severity scoring derived from panic speech via Gemini AI.',
    icon: HeartPulse,
  },
  {
    title: 'VOICE OUTPUT',
    description: 'Gemini TTS reads translated text aloud so responders hear it in their language instantly.',
    icon: Siren,
  },
];

export default function HomePage() {
  return (
    <PageShell>
      <div className="space-y-16 py-12">
        <section className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <StatusBadge tone="critical">v1.0.0 Humanitarian Beta</StatusBadge>
            <div className="space-y-6">
              <h1 className="font-pixel text-6xl leading-[1.1] text-theme-black md:text-8xl">
                {APP_NAME}
              </h1>
              <p className="font-mono text-xl font-medium text-theme-red md:text-2xl">
                {APP_TAGLINE}
              </p>
              <p className="max-w-2xl text-lg leading-relaxed text-theme-black/80">
                A multilingual emergency communication platform for travelers, hospitals, and ambulance teams operating across language barriers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-4">
              <Link href="/login">
                <PrimaryActionButton>GET STARTED</PrimaryActionButton>
              </Link>
              <Link
                href="/signup"
                className="font-pixel text-xs uppercase tracking-widest text-theme-black underline decoration-theme-black/30 decoration-2 underline-offset-4 transition-colors hover:decoration-theme-red hover:text-theme-red"
              >
                CREATE ACCOUNT
              </Link>
            </div>
          </div>

          <SectionCard className="space-y-6 !border-4 !p-8 !shadow-[16px_16px_0_var(--theme-red)]">
            <StatusBadge tone="success">LIVE TRANSLATION STREAM</StatusBadge>

            <div className="space-y-3">
              <p className="font-pixel text-[10px] text-theme-black/50">INCOMING (SPANISH)</p>
              <div className="border-l-4 border-theme-black bg-theme-black/5 p-4">
                <p className="font-mono text-xl font-semibold text-theme-black">&quot;No puedo respirar, ayuda por favor&quot;</p>
              </div>
            </div>

            <div className="flex items-center justify-center py-2 text-theme-red">
              <Activity className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-3">
              <p className="font-pixel text-[10px] text-theme-red">HINDI OUTPUT (RESPONDER)</p>
              <div className="border-l-4 border-theme-red bg-theme-red/10 p-4">
                <p className="font-mono text-xl font-bold text-theme-red">&quot;मुझे सांस नहीं आ रही, कृपया मदद करें&quot;</p>
                <div className="mt-4 flex gap-2">
                  <span className="bg-theme-black px-2 py-1 font-pixel text-[8px] text-theme-white">SEVERITY: CRITICAL</span>
                  <span className="bg-theme-red px-2 py-1 font-pixel text-[8px] text-theme-white">DISPATCH AMBULANCE</span>
                </div>
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="grid gap-8 pt-12 md:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <SectionCard key={title} className="flex flex-col gap-6">
              <div className="flex h-16 w-16 items-center justify-center border-2 border-theme-black bg-theme-white text-theme-red shadow-[4px_4px_0_var(--theme-black)]">
                <Icon className="h-8 w-8 stroke-[2px]" />
              </div>
              <div className="space-y-4">
                <h2 className="font-pixel text-lg leading-tight text-theme-black">{title}</h2>
                <p className="font-mono text-sm leading-relaxed text-theme-black/70">{description}</p>
              </div>
            </SectionCard>
          ))}
        </section>
      </div>
    </PageShell>
  );
}
