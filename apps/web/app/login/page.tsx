'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { APP_NAME } from '@lifebridge/shared';

import { getSupabaseBrowser } from '../../lib/supabase/browser';

function LoginForm() {
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') ?? '/';
    const callbackError = searchParams.get('error');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(callbackError === 'auth_callback_failed' ? 'Authentication failed. Please try again.' : '');
    const [isLoading, setIsLoading] = useState(false);

    async function handleEmailLogin(event: React.FormEvent) {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const supabase = getSupabaseBrowser();
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            window.location.href = redirect;
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogleLogin() {
        setError('');
        setIsLoading(true);

        try {
            const supabase = getSupabaseBrowser();
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
                },
            });

            if (authError) {
                setError(authError.message);
                setIsLoading(false);
            }
        } catch {
            setError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md space-y-8">
            <div className="text-center">
                <Link href="/" className="group inline-flex items-center gap-4 transition-transform hover:-translate-y-1">
                    <div className="flex h-12 w-12 items-center justify-center border-2 border-theme-black bg-theme-red font-pixel text-xl text-theme-white shadow-[4px_4px_0_var(--theme-black)] transition-transform group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0_var(--theme-black)]">
                        LB
                    </div>
                    <span className="font-pixel text-3xl font-semibold text-theme-black">{APP_NAME}</span>
                </Link>
                <p className="mt-6 font-mono text-sm tracking-tight text-theme-black/70">SIGN IN TO ACCESS YOUR EMERGENCY PROFILE.</p>
            </div>

            <div className="border-4 border-theme-black bg-theme-white p-8 shadow-[12px_12px_0_var(--theme-red)]">
                {error && (
                    <div className="mb-6 border-2 border-theme-red bg-theme-red/10 px-4 py-3 font-mono text-xs font-semibold text-theme-red">
                        [ERROR] {error}
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-4 border-2 border-theme-black bg-theme-white px-4 py-4 font-pixel text-xs tracking-widest text-theme-black shadow-[4px_4px_0_var(--theme-black)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--theme-black)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    CONTINUE WITH GOOGLE
                </button>

                <div className="my-8 flex items-center gap-4">
                    <div className="h-0.5 flex-1 bg-theme-black/20" />
                    <span className="font-pixel text-[10px] uppercase tracking-widest text-theme-black/50">or</span>
                    <div className="h-0.5 flex-1 bg-theme-black/20" />
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-6">
                    <label className="block space-y-2">
                        <span className="font-pixel text-[10px] uppercase tracking-widest text-theme-black">Email Address</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            className="w-full border-2 border-theme-black bg-theme-white px-4 py-3.5 font-mono text-theme-black outline-none placeholder:text-theme-black/40 focus:border-theme-red focus:ring-0"
                        />
                    </label>
                    <label className="block space-y-2">
                        <span className="font-pixel text-[10px] uppercase tracking-widest text-theme-black">Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={6}
                            className="w-full border-2 border-theme-black bg-theme-white px-4 py-3.5 font-mono text-theme-black outline-none placeholder:text-theme-black/40 focus:border-theme-red focus:ring-0"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 w-full border-2 border-theme-black bg-theme-red px-4 py-4 font-pixel text-sm uppercase tracking-widest text-theme-white shadow-[4px_4px_0_var(--theme-black)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--theme-black)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50"
                    >
                        {isLoading ? 'SIGNING IN...' : 'LOGIN VIA EMAIL'}
                    </button>
                </form>
            </div>

            <p className="text-center font-mono text-xs font-semibold text-theme-black/60">
                NO ACCOUNT?{' '}
                <Link href="/signup" className="text-theme-red underline decoration-theme-red/30 decoration-2 underline-offset-4 transition hover:decoration-theme-red">
                    CREATE ONE
                </Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="grid-backdrop flex min-h-screen flex-col items-center justify-center p-6">
            <Suspense fallback={
                <div className="flex items-center justify-center p-12">
                    <p className="font-pixel text-theme-red animate-pulse">LOADING...</p>
                </div>
            }>
                <LoginForm />
            </Suspense>
        </div>
    );
}
