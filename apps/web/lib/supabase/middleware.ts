import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        return supabaseResponse;
    }

    const supabase = createServerClient(url, key, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
                for (const { name, value } of cookiesToSet) {
                    request.cookies.set(name, value);
                }
                supabaseResponse = NextResponse.next({ request });
                for (const cookie of cookiesToSet) {
                    supabaseResponse.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof supabaseResponse.cookies.set>[2]);
                }
            },
        },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;

    // Public paths — no login required
    const publicPaths = ['/', '/login', '/signup', '/auth/callback'];
    const isPublic = publicPaths.includes(pathname) || pathname.startsWith('/profile/');

    // If not a public path and user is not logged in → redirect to login
    if (!isPublic && !user) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If user is logged in and on auth pages → redirect home
    const authPaths = ['/login', '/signup'];
    const isAuthPage = authPaths.some((path) => pathname.startsWith(path));

    if (isAuthPage && user) {
        const homeUrl = request.nextUrl.clone();
        homeUrl.pathname = '/';
        return NextResponse.redirect(homeUrl);
    }

    return supabaseResponse;
}
