"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${location.origin}/auth/callback?next=/update-password`,
            });
            if (error) throw error;
            setMessage("Check your email for the password reset link!");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const colors = {
        bg: "#0A0A0B",
        surface: "#141416",
        primary: "#6C5CE7",
        primaryLight: "#A29BFE",
        textPrimary: "#FFFFFF",
        textSecondary: "#B8B8C0",
        border: "#2A2A2E",
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: colors.bg,
            color: colors.textPrimary,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            padding: "24px",
        }}>
            <div style={{
                width: "100%",
                maxWidth: "400px",
                padding: "32px",
                background: colors.surface,
                borderRadius: "16px",
                border: `1px solid ${colors.border}`,
            }}>
                <div style={{ fontSize: "48px", marginBottom: "24px", textAlign: "center" }}>
                    🔑
                </div>

                <h1 style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: "8px",
                }}>
                    Reset Password
                </h1>

                <p style={{
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginBottom: "32px",
                    fontSize: "14px",
                }}>
                    Enter your email to receive a reset link
                </p>

                <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: "8px",
                                border: `1px solid ${colors.border}`,
                                background: "#000",
                                color: "#fff",
                                fontSize: "16px",
                            }}
                        />
                    </div>

                    {message && (
                        <div style={{
                            padding: "12px",
                            borderRadius: "8px",
                            background: "rgba(0, 217, 165, 0.1)",
                            border: "1px solid rgba(0, 217, 165, 0.2)",
                            color: "#00D9A5",
                            fontSize: "14px",
                        }}>
                            {message}
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: "12px",
                            borderRadius: "8px",
                            background: "rgba(255, 107, 107, 0.1)",
                            border: "1px solid rgba(255, 107, 107, 0.2)",
                            color: "#FF6B6B",
                            fontSize: "14px",
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            borderRadius: "8px",
                            border: "none",
                            background: loading
                                ? colors.border
                                : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                            color: loading ? colors.textSecondary : "#fff",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            marginTop: "8px",
                            transition: "transform 0.1s",
                        }}
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <div style={{ marginTop: "24px", textAlign: "center", fontSize: "14px" }}>
                    <Link
                        href="/login"
                        style={{
                            color: colors.textSecondary,
                            textDecoration: "none",
                            fontWeight: 500,
                        }}
                    >
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
