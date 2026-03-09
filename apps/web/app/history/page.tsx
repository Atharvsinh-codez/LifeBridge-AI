import { PageShell } from '../../components/page-shell';
import { HistoryFeed } from '../../features/history/history-feed';

export default function HistoryPage() {
  return (
    <PageShell>
      <div className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-red">CONVERSATION HISTORY</p>
          <h1 className="font-pixel text-4xl leading-tight text-theme-black md:text-5xl">
            AUDIT-FRIENDLY RECORDS
          </h1>
          <p className="font-mono text-sm leading-relaxed text-theme-black/70">
            Review past conversations, translated responder outputs, and the last known incident context for each emergency session.
          </p>
        </div>

        <HistoryFeed />
      </div>
    </PageShell>
  );
}
