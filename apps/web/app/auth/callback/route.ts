import { NextResponse } from 'next/server';

import { getSupabaseServer } from '../../../lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const redirect = searchParams.get('redirect') ?? '/';

    if (code) {
        const supabase = await getSupabaseServer();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(`${origin}${redirect}`);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
