import Link from "next/link";
import AuthShell from "@/components/ledger/AuthShell";

export const metadata = { title: "Sign in failed: LockIn Buddy" };

export default function AuthCodeErrorPage() {
    return (
        <AuthShell>
            <section>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                    That link did not work.
                </h1>
                <p className="text-[var(--ink-soft)] leading-relaxed mb-10">
                    It may have expired or already been used. Try signing in again.
                </p>
                <Link
                    href="/login"
                    className="bg-[var(--ink)] text-[var(--paper)] px-7 py-3 text-sm font-medium tracking-wide inline-block"
                >
                    Back to sign in
                </Link>
            </section>
        </AuthShell>
    );
}
