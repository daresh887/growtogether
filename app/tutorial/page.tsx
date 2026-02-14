"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const colors = {
    bg: "#0A0A0B",
    surface: "#141416",
    surfaceHover: "#1A1A1E",
    border: "#2A2A2E",
    primary: "#6C5CE7",
    primaryLight: "#A29BFE",
    accent: "#00D9A5",
    accentAlt: "#FF6B6B",
    textPrimary: "#FFFFFF",
    textSecondary: "#B8B8C0",
    textMuted: "#6B6B74",
    warning: "#FECA57",
};

export default function TutorialPage() {
    const router = useRouter();
    const supabase = createClient();

    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [userName, setUserName] = useState("");
    const [saving, setSaving] = useState(false);

    // Interactive states
    const [hasJoinedGroup, setHasJoinedGroup] = useState(false);
    const [hasPosted, setHasPosted] = useState(false);
    const [mockPostText, setMockPostText] = useState("");
    const [streakCount, setStreakCount] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            router.push("/login");
            return;
        }

        const metadata = user.user_metadata || {};

        // Check if tutorial already completed
        if (metadata.tutorial_complete) {
            router.push("/dashboard");
            return;
        }

        // Check if profile not complete
        if (!metadata.profile_complete) {
            router.push("/setup");
            return;
        }

        setUserName(metadata.display_name || metadata.full_name || "there");
        setLoading(false);
    };

    const handleJoinGroup = () => {
        setHasJoinedGroup(true);
        // Animate streak after joining
        setTimeout(() => {
            setStreakCount(1);
        }, 500);
    };

    const handlePost = () => {
        if (mockPostText.trim().length > 0) {
            setHasPosted(true);
            // Animate streak increment
            setTimeout(() => {
                setStreakCount(2);
            }, 300);
        }
    };

    const handleComplete = async () => {
        setSaving(true);
        setShowConfetti(true);

        try {
            await supabase.auth.updateUser({
                data: { tutorial_complete: true }
            });

            setTimeout(() => {
                router.push("/dashboard");
            }, 1500);
        } catch (err) {
            console.error("Error completing tutorial:", err);
            router.push("/dashboard");
        }
    };

    const totalSteps = 5;

    if (!mounted || loading) {
        return (
            <div style={{
                minHeight: "100vh",
                background: colors.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.textPrimary,
            }}>
                <div style={{
                    width: "48px",
                    height: "48px",
                    border: `3px solid ${colors.border}`,
                    borderTopColor: colors.primary,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                }} />
            </div>
        );
    }

    return (
        <div style={{
            minHeight: "100vh",
            background: colors.bg,
            color: colors.textPrimary,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Background gradients */}
            <div style={{
                position: "absolute",
                top: "-200px",
                right: "-200px",
                width: "600px",
                height: "600px",
                background: `radial-gradient(circle, rgba(108, 92, 231, 0.15) 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />
            <div style={{
                position: "absolute",
                bottom: "-100px",
                left: "-100px",
                width: "400px",
                height: "400px",
                background: `radial-gradient(circle, rgba(0, 217, 165, 0.1) 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />

            {/* Confetti overlay */}
            {showConfetti && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    {["🎉", "🎊", "✨", "🌟", "💫", "🎈"].map((emoji, i) => (
                        <span
                            key={i}
                            style={{
                                position: "absolute",
                                fontSize: "48px",
                                animation: `confetti ${1 + Math.random()}s ease-out forwards`,
                                animationDelay: `${i * 0.1}s`,
                                left: `${20 + i * 12}%`,
                            }}
                        >
                            {emoji}
                        </span>
                    ))}
                </div>
            )}

            {/* Progress bar */}
            <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: colors.border,
            }}>
                <div style={{
                    height: "100%",
                    width: `${((step + 1) / totalSteps) * 100}%`,
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
                    transition: "width 0.5s ease",
                }} />
            </div>

            {/* Skip button */}
            <button
                onClick={handleComplete}
                style={{
                    position: "fixed",
                    top: "24px",
                    right: "24px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.border}`,
                    background: "transparent",
                    color: colors.textMuted,
                    fontSize: "13px",
                    cursor: "pointer",
                }}
            >
                Skip tutorial
            </button>

            {/* Main content */}
            <div style={{
                maxWidth: "600px",
                width: "100%",
                animation: "fadeIn 0.5s ease",
            }}>
                {/* Step 0: Welcome */}
                {step === 0 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{
                            fontSize: "80px",
                            marginBottom: "24px",
                            animation: "wave 1s ease-in-out infinite",
                        }}>
                            👋
                        </div>
                        <h1 style={{
                            fontSize: "clamp(32px, 6vw, 48px)",
                            fontWeight: 800,
                            marginBottom: "16px",
                        }}>
                            Welcome, {userName}!
                        </h1>
                        <p style={{
                            color: colors.textSecondary,
                            fontSize: "18px",
                            marginBottom: "16px",
                            lineHeight: 1.6,
                        }}>
                            Let&apos;s take a quick tour of how GrowTogether works.
                        </p>
                        <p style={{
                            color: colors.accent,
                            fontSize: "16px",
                            fontWeight: 500,
                        }}>
                            It only takes 1 minute ⚡
                        </p>
                    </div>
                )}

                {/* Step 1: Groups Demo */}
                {step === 1 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
                        <h1 style={{
                            fontSize: "32px",
                            fontWeight: 800,
                            marginBottom: "8px",
                        }}>
                            Join accountability groups
                        </h1>
                        <p style={{
                            color: colors.textSecondary,
                            fontSize: "16px",
                            marginBottom: "32px",
                        }}>
                            Find people working on the same goals as you
                        </p>

                        {/* Mock group card */}
                        <div
                            onClick={handleJoinGroup}
                            style={{
                                background: colors.surface,
                                border: `2px solid ${hasJoinedGroup ? colors.accent : colors.border}`,
                                borderRadius: "20px",
                                padding: "24px",
                                cursor: hasJoinedGroup ? "default" : "pointer",
                                transition: "all 0.3s",
                                transform: hasJoinedGroup ? "scale(1.02)" : "none",
                                boxShadow: hasJoinedGroup ? `0 0 30px ${colors.accent}30` : "none",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{
                                    width: "64px",
                                    height: "64px",
                                    borderRadius: "16px",
                                    background: `${colors.accent}20`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "32px",
                                }}>
                                    🏋️
                                </div>
                                <div style={{ flex: 1, textAlign: "left" }}>
                                    <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px" }}>
                                        Fitness Accountability
                                    </h3>
                                    <p style={{ color: colors.textMuted, fontSize: "14px" }}>
                                        23 members • 🔥 Active daily
                                    </p>
                                </div>
                                <div style={{
                                    padding: "12px 24px",
                                    borderRadius: "12px",
                                    background: hasJoinedGroup
                                        ? colors.accent
                                        : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                                    color: "#fff",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    transition: "all 0.3s",
                                }}>
                                    {hasJoinedGroup ? "✓ Joined!" : "Join →"}
                                </div>
                            </div>
                        </div>

                        {hasJoinedGroup && (
                            <p style={{
                                color: colors.accent,
                                fontSize: "14px",
                                marginTop: "16px",
                                animation: "fadeIn 0.5s ease",
                            }}>
                                🎉 Great! You joined your first group!
                            </p>
                        )}

                        {!hasJoinedGroup && (
                            <p style={{
                                color: colors.textMuted,
                                fontSize: "13px",
                                marginTop: "16px",
                            }}>
                                👆 Click to join this group
                            </p>
                        )}
                    </div>
                )}

                {/* Step 2: Check-in Demo */}
                {step === 2 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
                        <h1 style={{
                            fontSize: "32px",
                            fontWeight: 800,
                            marginBottom: "8px",
                        }}>
                            Post daily check-ins
                        </h1>
                        <p style={{
                            color: colors.textSecondary,
                            fontSize: "16px",
                            marginBottom: "32px",
                        }}>
                            Share your progress, wins, and struggles with your group
                        </p>

                        {/* Mock post composer */}
                        <div style={{
                            background: colors.surface,
                            border: `1px solid ${hasPosted ? colors.accent : colors.border}`,
                            borderRadius: "20px",
                            padding: "24px",
                            transition: "all 0.3s",
                        }}>
                            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                                <div style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "50%",
                                    background: `${colors.primary}30`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "22px",
                                }}>
                                    😊
                                </div>
                                <div style={{ flex: 1 }}>
                                    <textarea
                                        value={mockPostText}
                                        onChange={(e) => setMockPostText(e.target.value)}
                                        placeholder="What did you accomplish today?"
                                        disabled={hasPosted}
                                        style={{
                                            width: "100%",
                                            padding: "12px",
                                            borderRadius: "12px",
                                            border: `1px solid ${colors.border}`,
                                            background: colors.bg,
                                            color: colors.textPrimary,
                                            fontSize: "15px",
                                            resize: "none",
                                            outline: "none",
                                            minHeight: "80px",
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handlePost}
                                disabled={mockPostText.trim().length === 0 || hasPosted}
                                style={{
                                    width: "100%",
                                    padding: "14px",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: hasPosted
                                        ? colors.accent
                                        : mockPostText.trim().length > 0
                                            ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`
                                            : colors.surfaceHover,
                                    color: hasPosted || mockPostText.trim().length > 0 ? "#fff" : colors.textMuted,
                                    fontSize: "15px",
                                    fontWeight: 600,
                                    cursor: hasPosted || mockPostText.trim().length === 0 ? "not-allowed" : "pointer",
                                    transition: "all 0.3s",
                                }}
                            >
                                {hasPosted ? "✓ Posted!" : "Post Check-in"}
                            </button>
                        </div>

                        {hasPosted && (
                            <p style={{
                                color: colors.accent,
                                fontSize: "14px",
                                marginTop: "16px",
                                animation: "fadeIn 0.5s ease",
                            }}>
                                🚀 You&apos;re on a roll! Your streak just increased!
                            </p>
                        )}
                    </div>
                )}

                {/* Step 3: Streaks Demo */}
                {step === 3 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔥</div>
                        <h1 style={{
                            fontSize: "32px",
                            fontWeight: 800,
                            marginBottom: "8px",
                        }}>
                            Build your streak
                        </h1>
                        <p style={{
                            color: colors.textSecondary,
                            fontSize: "16px",
                            marginBottom: "32px",
                        }}>
                            Check in daily to keep your streak alive
                        </p>

                        {/* Streak counter */}
                        <div style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "24px",
                            padding: "40px",
                            marginBottom: "24px",
                        }}>
                            <div style={{
                                fontSize: "80px",
                                fontWeight: 800,
                                background: `linear-gradient(135deg, ${colors.warning}, ${colors.accentAlt})`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                marginBottom: "8px",
                                animation: "pulse 2s ease-in-out infinite",
                            }}>
                                🔥 {streakCount}
                            </div>
                            <p style={{ color: colors.textSecondary, fontSize: "18px" }}>
                                Day Streak
                            </p>
                        </div>

                        {/* Leaderboard preview */}
                        <div style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "16px",
                            overflow: "hidden",
                        }}>
                            <div style={{
                                padding: "12px 16px",
                                borderBottom: `1px solid ${colors.border}`,
                                fontSize: "13px",
                                fontWeight: 600,
                                color: colors.textMuted,
                            }}>
                                🏆 Group Leaderboard
                            </div>
                            {[
                                { rank: 1, name: "Sarah K.", streak: 47, you: false },
                                { rank: 2, name: "You", streak: streakCount, you: true },
                                { rank: 3, name: "Marcus", streak: 19, you: false },
                            ].map((m) => (
                                <div
                                    key={m.rank}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        padding: "12px 16px",
                                        background: m.you ? `${colors.primary}15` : "transparent",
                                    }}
                                >
                                    <span style={{
                                        width: "24px",
                                        height: "24px",
                                        borderRadius: "50%",
                                        background: m.rank === 1 ? "#FFD700" : m.rank === 2 ? "#C0C0C0" : "#CD7F32",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: colors.bg,
                                    }}>
                                        {m.rank}
                                    </span>
                                    <span style={{
                                        flex: 1,
                                        fontSize: "14px",
                                        fontWeight: m.you ? 600 : 400,
                                        color: m.you ? colors.primary : colors.textPrimary,
                                    }}>
                                        {m.name}
                                    </span>
                                    <span style={{
                                        fontSize: "13px",
                                        color: colors.warning,
                                        fontWeight: 600,
                                    }}>
                                        🔥 {m.streak}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 4: Complete */}
                {step === 4 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{
                            fontSize: "80px",
                            marginBottom: "24px",
                            animation: "bounce 1s ease-in-out infinite",
                        }}>
                            🎉
                        </div>
                        <h1 style={{
                            fontSize: "clamp(32px, 6vw, 48px)",
                            fontWeight: 800,
                            marginBottom: "16px",
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}>
                            You&apos;re all set!
                        </h1>
                        <p style={{
                            color: colors.textSecondary,
                            fontSize: "18px",
                            marginBottom: "32px",
                            lineHeight: 1.6,
                        }}>
                            Time to find your first group and start building real consistency.
                        </p>

                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            maxWidth: "300px",
                            margin: "0 auto",
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 16px",
                                background: colors.surface,
                                borderRadius: "12px",
                            }}>
                                <span style={{ fontSize: "24px" }}>👥</span>
                                <span style={{ color: colors.textSecondary, fontSize: "14px" }}>Join groups that match your goals</span>
                            </div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 16px",
                                background: colors.surface,
                                borderRadius: "12px",
                            }}>
                                <span style={{ fontSize: "24px" }}>📝</span>
                                <span style={{ color: colors.textSecondary, fontSize: "14px" }}>Check in daily with your progress</span>
                            </div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 16px",
                                background: colors.surface,
                                borderRadius: "12px",
                            }}>
                                <span style={{ fontSize: "24px" }}>🔥</span>
                                <span style={{ color: colors.textSecondary, fontSize: "14px" }}>Build streaks and stay consistent</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation button */}
                <div style={{ marginTop: "40px" }}>
                    <button
                        onClick={() => {
                            if (step < totalSteps - 1) {
                                setStep(step + 1);
                            } else {
                                handleComplete();
                            }
                        }}
                        disabled={saving || (step === 1 && !hasJoinedGroup) || (step === 2 && !hasPosted)}
                        style={{
                            width: "100%",
                            padding: "18px 32px",
                            borderRadius: "16px",
                            border: "none",
                            background: (step === 1 && !hasJoinedGroup) || (step === 2 && !hasPosted)
                                ? colors.surfaceHover
                                : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                            color: (step === 1 && !hasJoinedGroup) || (step === 2 && !hasPosted)
                                ? colors.textMuted
                                : "#fff",
                            fontSize: "18px",
                            fontWeight: 600,
                            cursor: saving || (step === 1 && !hasJoinedGroup) || (step === 2 && !hasPosted)
                                ? "not-allowed"
                                : "pointer",
                            transition: "all 0.3s",
                            boxShadow: (step === 1 && !hasJoinedGroup) || (step === 2 && !hasPosted)
                                ? "none"
                                : `0 4px 20px ${colors.primary}40`,
                        }}
                    >
                        {saving ? "Loading..." : step === totalSteps - 1 ? "Go to Dashboard 🚀" : "Continue →"}
                    </button>

                    {step === 1 && !hasJoinedGroup && (
                        <p style={{ color: colors.textMuted, fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
                            Join the group above to continue
                        </p>
                    )}
                    {step === 2 && !hasPosted && (
                        <p style={{ color: colors.textMuted, fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
                            Write something and post to continue
                        </p>
                    )}
                </div>
            </div>

            {/* Global styles */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(20deg); }
                    75% { transform: rotate(-20deg); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes confetti {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(-500px) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
