import { createServerClient } from '@supabase/ssr'
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
    return authErrorCode(error) === 'session_missing' || authErrorCode(error) === ''
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
        // A refresh token the server no longer recognises (the session was
        // revoked, the auth users were wiped, or the token was already
        // rotated). Supabase keeps failing on it until the cookie is gone,
        // which looks like "I can't sign in with Google any more" — so drop
        // the dead session here and let them start a clean one.
        if (isStaleSession(error)) {
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
        return NextResponse.redirect(url)
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
