"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });
            if (error) throw error;
            router.push("/");
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
                    🔒
                </div>

                <h1 style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: "8px",
                }}>
                    New Password
                </h1>

                <p style={{
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginBottom: "32px",
                    fontSize: "14px",
                }}>
                    Enter your new password below
                </p>

                <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
                            New Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
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
                        {loading ? "Updating..." : "Update Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
