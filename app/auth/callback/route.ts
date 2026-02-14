import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Check profile and tutorial completion
            const { data: { user } } = await supabase.auth.getUser()
            const metadata = user?.user_metadata || {}

            let redirectPath = '/dashboard'
            if (!metadata.profile_complete) {
                redirectPath = '/setup'
            } else if (!metadata.tutorial_complete) {
                redirectPath = '/tutorial'
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
