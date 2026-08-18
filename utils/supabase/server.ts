import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * TEMPORARY — what the last setAll on this instance did. The bare catch below
 * is the reason the Google sign-in bug has been invisible: a session that
 * fails to persist looks exactly like one that was never issued. This records
 * whether setAll ran at all, what it was asked to write, and what went wrong.
 * Remove with the rest of the diagnostics.
 */
export const setAllTrace: string[] = []

export async function createClient() {
    const cookieStore = await cookies()
    setAllTrace.length = 0

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    setAllTrace.push(
                        `called(${cookiesToSet.map((c) => `${c.name}=${c.value.length}b`).join(',') || 'empty'})`
                    )
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                        setAllTrace.push('wrote-ok')
                    } catch (e: unknown) {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                        const message = (e as Error)?.message ?? 'unknown'
                        setAllTrace.push(`THREW(${message})`)
                        console.error('[supabase/server] setAll could not write cookies:', e)
                    }
                },
            },
        }
    )
}
