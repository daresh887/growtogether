import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Only follow a real in-app destination. "/" is the generic default,
    // so treat it as unset and decide below where they actually belong.
    const requested = searchParams.get('next')
    const next =
        requested && requested !== '/' && requested.startsWith('/') && !requested.startsWith('//')
            ? requested
            : null

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
            // Without this, every OAuth failure looks identical from the
            // outside: expired code, missing PKCE verifier, misconfigured
            // redirect URL. Say which one it was.
            console.error('OAuth code exchange failed:', error.code || error.status, error.message)
        }
        if (!error) {
            let redirectPath = next

            if (!redirectPath) {
                // No contract yet means the whole point is still ahead of them.
                const { data: { user } } = await supabase.auth.getUser()
                const { data: contract } = user
                    ? await supabase
                        .from('contracts')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .maybeSingle()
                    : { data: null }

                redirectPath = contract ? `/contracts/${contract.id}` : '/lock-in'
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = origin.startsWith('http://localhost')
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
            } else {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
