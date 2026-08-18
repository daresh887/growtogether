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

        // What the cookie store holds now decides everything downstream: if
        // no sb- session cookie appears here, nothing was ever written and no
        // amount of redirect handling will help.
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
