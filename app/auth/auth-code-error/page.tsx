"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const colors = {
        bg: "#0A0A0B",
        surface: "#141416",
        primary: "#6C5CE7",
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
                maxWidth: "400px",
                textAlign: "center",
                padding: "32px",
                background: colors.surface,
                borderRadius: "16px",
                border: `1px solid ${colors.border}`,
            }}>
                <div style={{ fontSize: "48px", marginBottom: "24px" }}>⚠️</div>
                <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}>
                    Authentication Error
                </h1>
                <p style={{ color: colors.textSecondary, marginBottom: "32px", lineHeight: "1.5" }}>
                    {error || "There was a problem signing you in. The link may have expired or been used already."}
                </p>
                <Link
                    href="/login"
                    style={{
                        display: "inline-block",
                        padding: "12px 24px",
                        background: colors.primary,
                        color: "#fff",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: 600,
                    }}
                >
                    Back to Login
                </Link>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
