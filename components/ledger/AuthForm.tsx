"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Props = { mode: "signin" | "signup" };

export default function AuthForm({ mode }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Only follow in-app paths: a full URL here would let a crafted login
    // link bounce someone to another site right after they authenticate.
    const requested = searchParams.get("next");
    const next =
        requested && requested.startsWith("/") && !requested.startsWith("//")
            ? requested
            : mode === "signup"
              ? "/lock-in"
              : "/";
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            if (mode === "signup") {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                    },
                });
                if (error) throw error;
                setSent(true);
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.push(next);
                router.refresh();
            }
        } catch (err: any) {
            setError(err?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const withGoogle = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err?.message || "Something went wrong");
            setLoading(false);
        }
    };

    const inputCls =
        "type-doc w-full bg-transparent text-base border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-2 placeholder:text-[var(--ink-soft)]";

    if (sent) {
        return (
            <section>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                    Check your email.
                </h1>
                <p className="type-doc leading-relaxed">
                    We sent a confirmation link to {email}.
                    <br />
                    Open it, then come back and lock in.
                </p>
            </section>
        );
    }

    return (
        <section>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                {mode === "signup" ? "Create your account." : "Sign in."}
            </h1>
            <p className="text-[var(--ink-soft)] leading-relaxed mb-10">
                {mode === "signup"
                    ? "One account. One contract. Everyone can see whether you keep it."
                    : "Your contract is waiting."}
            </p>

            <form onSubmit={submit}>
                <label className="block mb-6">
                    <span className="overline block mb-2">Email</span>
                    <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={inputCls}
                    />
                </label>

                <label className="block mb-10">
                    <span className="overline block mb-2">Password</span>
                    <input
                        type="password"
                        required
                        minLength={6}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "At least 6 characters" : ""}
                        className={inputCls}
                    />
                </label>

                {error && (
                    <p className="text-sm mb-6" style={{ color: "var(--stamp-red)" }} role="alert">
                        {error}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-[var(--ink)] text-[var(--paper)] px-7 py-3 text-sm font-medium tracking-wide disabled:opacity-25"
                    >
                        {loading ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
                    </button>
                    <button type="button" onClick={withGoogle} disabled={loading} className="overline ink-link">
                        Continue with Google
                    </button>
                </div>
            </form>

            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-12 pt-6 border-t border-[var(--rule)]">
                {mode === "signup" ? (
                    <Link href="/login" className="overline ink-link">
                        Already have an account
                    </Link>
                ) : (
                    <>
                        <Link href="/signup" className="overline ink-link">
                            Create an account
                        </Link>
                        <Link href="/forgot-password" className="overline ink-link">
                            Forgot your password
                        </Link>
                    </>
                )}
            </div>
        </section>
    );
}
