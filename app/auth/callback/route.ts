import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, setAllTrace } from '@/utils/supabase/server'

// TEMPORARY — remove with app/auth/debug/route.ts once Google sign-in is
// fixed. A breadcrumb of what happened in here, readable afterwards even
// when the session cookie is the thing that went missing. No values, no
// tokens: outcomes, names and sizes.
function stampDiagnostic(response: NextResponse, notes: string[]) {
    response.cookies.set('auth-debug', notes.join(' | '), {
        path: '/',
        maxAge: 900,
        sameSite: 'lax',
    })
    console.log('[auth/callback]', notes.join(' | '))
    return response
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const diag: string[] = [
        `host=${request.headers.get('host') ?? '-'}`,
        `xfh=${request.headers.get('x-forwarded-host') ?? '-'}`,
        `origin=${origin}`,
        `params=${[...searchParams.keys()].join(',') || 'none'}`,
        `cookiesIn=${(request.headers.get('cookie') ?? '')
            .split(';')
            .map((c) => c.split('=')[0].trim())
            .filter((n) => n.startsWith('sb-'))
            .join(',') || 'none'}`,
    ]
    // Only follow a real in-app destination. "/" is the generic default,
    // so treat it as unset and decide below where they actually belong.
    const requested = searchParams.get('next')
    const next =
        requested && requested !== '/' && requested.startsWith('/') && !requested.startsWith('//')
            ? requested
            : null

    if (code) {
        const supabase = await createClient()
        const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            // Without this, every OAuth failure looks identical from the
            // outside: expired code, missing PKCE verifier, misconfigured
            // redirect URL. Say which one it was.
            console.error('OAuth code exchange failed:', error.code || error.status, error.message)
        }

        // The exchange hands back a valid session and then loses it.
        //
        // auth-js fires the SIGNED_IN event that persists a session from
        // inside setTimeout(..., 0) and does not await it, while @supabase/ssr
        // writes the session cookie only in response to that event. In a route
        // handler nothing waits for a stray timer: the redirect goes out and
        // the invocation ends before it ever fires, so the cookie is never
        // written and the next request looks like a logged-out visitor.
        //
        // setSession takes the same path with the notification awaited, so the
        // cookie is written before we reply. Passing the tokens we already hold
        // costs no extra round trip against a fresh, unexpired session.
        if (!error && exchanged?.session) {
            const { error: persistError } = await supabase.auth.setSession({
                access_token: exchanged.session.access_token,
                refresh_token: exchanged.session.refresh_token,
            })
            if (persistError) {
                console.error('Could not persist the session after OAuth:', persistError.message)
            }
        }

        // Read after the persist, so this says whether the session cookie
        // actually made it into the store rather than whether it was promised.
        const store = await cookies()
        diag.push(
            `exchange=${error ? `FAIL(${error.code || error.status})` : 'ok'}`,
            `session=${exchanged?.session ? 'yes' : 'no'}`,
            `cookiesOut=${store
                .getAll()
                .filter((c) => c.name.startsWith('sb-'))
                .map((c) => `${c.name}:${c.value.length}b`)
                .join(',') || 'NONE'}`,
            `setAll=[${setAllTrace.join(' ') || 'NEVER CALLED'}]`
        )

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
            const target = isLocalEnv
                ? `${origin}${redirectPath}`
                : forwardedHost
                  ? `https://${forwardedHost}${redirectPath}`
                  : `${origin}${redirectPath}`
            diag.push(`redirect=${target}`)
            return stampDiagnostic(NextResponse.redirect(target), diag)
        }
    }

    // return the user to an error page with instructions
    diag.push('redirect=auth-code-error')
    return stampDiagnostic(NextResponse.redirect(`${origin}/auth/auth-code-error`), diag)
}
