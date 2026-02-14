"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function LoginPageContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/";
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                    },
                });
                if (error) throw error;
                setSuccessMessage("Check your email for the confirmation link!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push(next);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
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
                    🌱
                </div>

                <h1 style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: "8px",
                }}>
                    {isSignUp ? "Create your account" : "Welcome back"}
                </h1>

                <p style={{
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginBottom: "32px",
                    fontSize: "14px",
                }}>
                    {isSignUp
                        ? "Start your journey to consistency today"
                        : "Continue growing with your tribe"}
                </p>

                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "12px",
                        marginBottom: "24px",
                        borderRadius: "8px",
                        border: `1px solid ${colors.border}`,
                        background: colors.surface,
                        color: "#fff",
                        fontWeight: 500,
                        cursor: loading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        fontSize: "15px",
                    }}
                >
                    <img src="https://authjs.dev/img/providers/google.svg" alt="Google" style={{ width: "20px", height: "20px" }} />
                    Continue with Google
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                    <div style={{ flex: 1, height: "1px", background: colors.border }} />
                    <span style={{ color: colors.textSecondary, fontSize: "14px" }}>OR</span>
                    <div style={{ flex: 1, height: "1px", background: colors.border }} />
                </div>

                <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
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
                        {!isSignUp && (
                            <div style={{ textAlign: "right", marginTop: "8px" }}>
                                <Link
                                    href="/forgot-password"
                                    style={{
                                        color: colors.textSecondary,
                                        fontSize: "13px",
                                        textDecoration: "none",
                                    }}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        )}
                    </div>

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

                    {successMessage && (
                        <div style={{
                            padding: "12px",
                            borderRadius: "8px",
                            background: "rgba(0, 217, 165, 0.1)",
                            border: "1px solid rgba(0, 217, 165, 0.2)",
                            color: "#00D9A5",
                            fontSize: "14px",
                        }}>
                            ✓ {successMessage}
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
                        {loading ? "Loading..." : (isSignUp ? "Sign Up" : "Log In")}
                    </button>
                </form>

                <div style={{ marginTop: "24px", textAlign: "center", fontSize: "14px" }}>
                    <span style={{ color: colors.textSecondary }}>
                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    </span>
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{
                            background: "none",
                            border: "none",
                            color: colors.primaryLight,
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0,
                        }}
                    >
                        {isSignUp ? "Log In" : "Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    );
}
