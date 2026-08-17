"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AuthShell from "@/components/ledger/AuthShell";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const supabase = createClient();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err?.message || "Something went wrong");
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            <section>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                    Choose a new password.
                </h1>
                <p className="text-[var(--ink-soft)] leading-relaxed mb-10">
                    At least 6 characters.
                </p>

                <form onSubmit={submit}>
                    <label className="block mb-10">
                        <span className="overline block mb-2">New password</span>
                        <input
                            type="password"
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="type-doc w-full bg-transparent text-base border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-2"
                        />
                    </label>

                    {error && (
                        <p className="text-sm mb-6" style={{ color: "var(--stamp-red)" }} role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-[var(--ink)] text-[var(--paper)] px-7 py-3 text-sm font-medium tracking-wide disabled:opacity-25"
                    >
                        {loading ? "Saving…" : "Save password"}
                    </button>
                </form>
            </section>
        </AuthShell>
    );
}
