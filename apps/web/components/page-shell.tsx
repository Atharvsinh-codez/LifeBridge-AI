import type { ReactNode } from 'react';

import { SiteHeader } from './site-header';

export function PageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="grid-backdrop min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">{children}</main>
    </div>
  );
}

