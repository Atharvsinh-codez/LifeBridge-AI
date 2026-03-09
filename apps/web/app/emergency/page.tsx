import { PageShell } from '../../components/page-shell';
import { EmergencyConsole } from '../../features/emergency/emergency-console';

export default function EmergencyPage() {
  return (
    <PageShell>
      <div className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-red">EMERGENCY MODE</p>
          <h1 className="font-pixel text-4xl leading-tight text-theme-black md:text-5xl">
            PANIC TRANSLATOR
          </h1>
          <p className="font-mono text-sm leading-relaxed text-theme-black/70">
            Speak or type in your language. The AI translates it and reads it aloud for your responder. Powered by Lingo.dev translation and Gemini TTS.
          </p>
        </div>

        <EmergencyConsole />
      </div>
    </PageShell>
  );
}
