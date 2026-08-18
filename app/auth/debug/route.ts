import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

/**
 * TEMPORARY — delete once the Google sign-in bug is closed.
 *
 * Reports what the server can actually see of your session, so the failure
 * can be read off instead of inferred from which page you land on. Cookie
 * values are never included: names and byte counts only, which is enough to
 * tell "no session cookie was ever written" apart from "one was written and
 * is not coming back".
 *
 * `lastCallback` is a breadcrumb the callback route drops on its way past,
 * so this still says what happened even when the session cookie is missing.
 */
export async function GET() {
    const store = await cookies()
    const all = store.getAll()

    const supabase = await createClient()
    let user: string | null = null
    let authError: Record<string, unknown> | null = null
    try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        user = data.user ? `present (${data.user.app_metadata?.provider ?? 'unknown provider'})` : 'null'
    } catch (e: unknown) {
        const err = e as { name?: string; code?: string; status?: number; message?: string }
        authError = {
            name: err?.name ?? null,
            code: err?.code ?? null,
            status: err?.status ?? null,
            message: err?.message ?? null,
        }
    }

    return NextResponse.json(
        {
            note: 'temporary diagnostic route; no cookie values are reported',
            sbCookies: all
                .filter((c) => c.name.startsWith('sb-'))
                .map((c) => ({ name: c.name, bytes: c.value.length })),
            otherCookieNames: all.filter((c) => !c.name.startsWith('sb-')).map((c) => c.name),
            user,
            authError,
            lastCallback: store.get('auth-debug')?.value ?? null,
        },
        { headers: { 'cache-control': 'no-store' } }
    )
}
