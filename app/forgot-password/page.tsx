"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import AuthShell from "@/components/ledger/AuthShell";

export default function ForgotPasswordPage() {
    const supabase = createClient();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${location.origin}/update-password`,
            });
            if (error) throw error;
            setSent(true);
        } catch (err: any) {
            setError(err?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            {sent ? (
                <section>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                        Check your email.
                    </h1>
                    <p className="type-doc leading-relaxed mb-10">
                        We sent a reset link to {email}.
                    </p>
                    <Link href="/login" className="overline ink-link">
                        Back to sign in
                    </Link>
                </section>
            ) : (
                <section>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                        Reset your password.
                    </h1>
                    <p className="text-[var(--ink-soft)] leading-relaxed mb-10">
                        Enter your email and we will send you a link.
                    </p>

                    <form onSubmit={submit}>
                        <label className="block mb-10">
                            <span className="overline block mb-2">Email</span>
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="type-doc w-full bg-transparent text-base border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-2 placeholder:text-[var(--ink-soft)]"
                            />
                        </label>

                        {error && (
                            <p className="text-sm mb-6" style={{ color: "var(--stamp-red)" }} role="alert">
                                {error}
                            </p>
                        )}

                        <div className="flex items-center gap-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[var(--ink)] text-[var(--paper)] px-7 py-3 text-sm font-medium tracking-wide disabled:opacity-25"
                            >
                                {loading ? "Sending…" : "Send the link"}
                            </button>
                            <Link href="/login" className="overline ink-link">
                                Back to sign in
                            </Link>
                        </div>
                    </form>
                </section>
            )}
        </AuthShell>
    );
}
