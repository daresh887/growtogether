"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SettingsActions({ email }: { email: string }) {
    const router = useRouter();
    const supabase = createClient();
    const [busy, setBusy] = useState<"out" | "reset" | null>(null);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signOut = async () => {
        if (busy) return;
        setBusy("out");
        setError(null);
        try {
            await supabase.auth.signOut();
            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err?.message || "Could not sign out");
            setBusy(null);
        }
    };

    const sendReset = async () => {
        if (busy) return;
        setBusy("reset");
        setError(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${location.origin}/update-password`,
            });
            if (error) throw error;
            setSent(true);
        } catch (err: any) {
            setError(err?.message || "Could not send the link");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div>
            <div className="py-5 border-b border-[var(--rule)]">
                <button type="button" onClick={sendReset} disabled={!!busy} className="ink-link text-sm font-medium">
                    {busy === "reset" ? "Sending…" : "Change your password"}
                </button>
                <p className="overline mt-2">
                    {sent ? `Link sent to ${email}` : "We email you a link to set a new one"}
                </p>
            </div>

            <div className="py-5 border-b border-[var(--rule)]">
                <button type="button" onClick={signOut} disabled={!!busy} className="ink-link text-sm font-medium">
                    {busy === "out" ? "Signing out…" : "Sign out"}
                </button>
            </div>

            {error && (
                <p className="text-sm mt-4" style={{ color: "var(--stamp-red)" }} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
