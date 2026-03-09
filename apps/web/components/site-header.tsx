'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';

import { APP_NAME } from '@lifebridge/shared';

import { useAuth } from './auth-provider';

const navLinks = [
  { href: '/emergency', label: 'Emergency' },
  { href: '/profile', label: 'Profile' },
  { href: '/history', label: 'History' },
];

export function SiteHeader() {
  const { user, isLoading, signOut } = useAuth();

  // Show email username (part before @), never show stale display_name
  const displayName = user?.email?.split('@')[0] ?? 'User';

  return (
    <header className="sticky top-0 z-20 border-b-2 border-theme-black bg-theme-white transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="group flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-theme-black bg-theme-red font-pixel text-xl text-theme-white shadow-[4px_4px_0_var(--theme-black)] transition-transform group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0_var(--theme-black)]">
            LB
          </div>
          <div>
            <p className="font-pixel text-xl tracking-tight text-theme-black">{APP_NAME}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-theme-black/50">Emergency Infrastructure</p>
          </div>
        </Link>

        <div className="flex items-center gap-8">
          <nav className="hidden gap-6 font-pixel text-[10px] uppercase tracking-widest text-theme-black lg:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-theme-red">
                [{link.label}]
              </Link>
            ))}
          </nav>

          {!isLoading && (
            user ? (
              <div className="flex items-center gap-4 border-l-2 border-theme-black pl-8">
                <Link href="/profile" className="flex items-center gap-2 font-mono text-sm font-semibold text-theme-black hover:text-theme-red transition-colors">
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{displayName}</span>
                </Link>
                <button
                  onClick={signOut}
                  className="flex h-8 w-8 items-center justify-center border-2 border-theme-black bg-theme-white text-theme-black shadow-[2px_2px_0_var(--theme-red)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-theme-red hover:text-theme-white hover:shadow-[1px_1px_0_var(--theme-black)]"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center border-2 border-theme-black bg-theme-red px-6 py-2 font-pixel text-xs uppercase tracking-widest text-theme-white shadow-[4px_4px_0_var(--theme-black)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--theme-black)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              >
                Log In
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
