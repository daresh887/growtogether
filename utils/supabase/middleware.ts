import { createServerClient } from '@supabase/ssr'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// The session is unrecoverable: the refresh token is gone, spent, or its
// session no longer exists. Signing out and back in is the only cure.
const STALE_SESSION_CODES = new Set([
    'refresh_token_not_found',
    'refresh_token_already_used',
    'session_not_found',
    'session_expired',
    'user_not_found',
])

function authErrorCode(error: unknown): string {
    return typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : ''
}

function isStaleSession(error: unknown): boolean {
    return STALE_SESSION_CODES.has(authErrorCode(error))
}

// Nobody is signed in. Normal for every logged-out visitor, not an error.
function isMissingSession(error: unknown): boolean {
    return authErrorCode(error) === 'session_missing'
}

/**
 * Is there a session cookie on this request at all? The difference between
 * "logged out" and "broken" is not in the error — a cookie the client cannot
 * even parse comes back with no code on it — it is here. No cookie and a
 * failure means a visitor who was never signed in. A cookie and a failure
 * means the cookie is the problem.
 */
function hasAuthCookie(request: NextRequest): boolean {
    return request.cookies
        .getAll()
        .some(
            (c) =>
                c.name.startsWith('sb-') &&
                c.name.includes('auth-token') &&
                !c.name.includes('code-verifier')
        )
}

/**
 * Drop the Supabase session cookies on this response. The PKCE code
 * verifier is deliberately left alone: an OAuth sign-in that is mid-flight
 * needs it to finish, and that is exactly when a dead session shows up.
 */
function clearAuthCookies(request: NextRequest, response: NextResponse) {
    for (const cookie of request.cookies.getAll()) {
        if (
            cookie.name.startsWith('sb-') &&
            cookie.name.includes('auth-token') &&
            !cookie.name.includes('code-verifier')
        ) {
            request.cookies.delete(cookie.name)
            response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
        }
    }
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    let user = null
    try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        user = data.user
    } catch (error: unknown) {
        // Supabase itself is unreachable or answering 5xx. The cookie may be
        // perfectly good, so it stays: signing everyone out over a blip in
        // someone else's network is the worse failure.
        if (isAuthRetryableFetchError(error)) {
            console.error('Auth check could not reach Supabase:', error)
        } else if (isStaleSession(error) || hasAuthCookie(request)) {
            // Either a refresh token the server no longer recognises (the
            // session was revoked, the auth users were wiped, the token was
            // already rotated), or a cookie that cannot be read at all.
            //
            // Both look identical from the outside, and both are fatal in the
            // same way: Supabase keeps failing on that cookie forever, every
            // protected page bounces to /login, and signing in again writes a
            // fresh session that the ruined cookie still shadows. That is the
            // "I complete the Google sign-in and land back on the sign-in
            // page" loop. It only breaks if something throws the cookie away,
            // so this is where that happens.
            if (!isStaleSession(error) && !isMissingSession(error)) {
                console.error('Unreadable session cookie, clearing it:', error)
            }
            clearAuthCookies(request, supabaseResponse)
        } else if (!isMissingSession(error)) {
            console.error('Auth check failed in middleware:', error)
        }
    }

    // The record is public: anyone can read the feed and any contract.
    // Everything else needs an account.
    const path = request.nextUrl.pathname
    const isPublic =
        path === '/' ||
        path.startsWith('/feed') ||
        path.startsWith('/losers') ||
        path.startsWith('/login') ||
        path.startsWith('/signup') ||
        path.startsWith('/auth') ||
        path.startsWith('/contracts') ||
        path.startsWith('/forgot-password') ||
        path.startsWith('/update-password')

    if (!user && !isPublic) {
        // no user, redirect to login page
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', request.nextUrl.pathname)
        const redirectResponse = NextResponse.redirect(url)
        // Carry over whatever was written above — a refreshed session, or the
        // instruction to delete a ruined one. This is the bounce that runs
        // when a cookie is broken, so dropping these headers is what made the
        // breakage permanent: the cookie was cleared on a response nobody
        // ever sent, and the next request arrived with it still attached.
        //
        // With one exception, for the same reason clearAuthCookies has it. A
        // failed session read makes the client bin the code verifier along
        // with everything else, and forwarding that would cancel an OAuth
        // sign-in that is still in flight. Its deletion is the one header
        // this bounce is right to swallow.
        for (const cookie of supabaseResponse.cookies.getAll()) {
            const deletesCodeVerifier = cookie.name.includes('code-verifier') && !cookie.value
            if (!deletesCodeVerifier) redirectResponse.cookies.set(cookie)
        }
        return redirectResponse
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new Response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    return supabaseResponse
}
