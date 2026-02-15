"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ============================================
// COLORS & STYLES
// ============================================

const colors = {
    bg: "#0A0A0B",
    surface: "#141416",
    surfaceHover: "#1A1A1E",
    border: "#2A2A2E",
    primary: "#6C5CE7",
    primaryLight: "#A29BFE",
    accent: "#00D9A5",
    warning: "#FFEAA7",
    danger: "#FF6B6B",
    textPrimary: "#FFFFFF",
    textSecondary: "#B8B8C0",
    textMuted: "#6B6B74",
};

// ============================================
// DATA
// ============================================

const testimonials = [
    { name: "Sarah K.", streak: 47, text: "Finally finished my side project!", avatar: "👩‍💼" },
    { name: "Marcus T.", streak: 89, text: "Lost 30 lbs with my group!", avatar: "👨‍🎨" },
    { name: "Elena R.", streak: 156, text: "Learned Spanish in 6 months!", avatar: "👩‍💻" },
];

const sampleGroups = [
    { name: "Morning Runners", emoji: "🏃", members: 24, color: "#FF6B6B" },
    { name: "Code Every Day", emoji: "💻", members: 156, color: "#6C5CE7" },
    { name: "Learn Spanish", emoji: "🇪🇸", members: 89, color: "#00D9A5" },
];

// ============================================
// ANIMATED COMPONENTS
// ============================================

function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setHasStarted(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!hasStarted) return;
        let start = 0;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [hasStarted, target, duration]);

    return <>{count}{suffix}</>;
}

function FloatingEmoji({ emoji, delay, x }: { emoji: string; delay: number; x: number }) {
    return (
        <div
            style={{
                position: "absolute",
                left: `${x}%`,
                top: "100%",
                fontSize: "24px",
                opacity: 0.6,
                animation: `floatUp 4s ease-in-out ${delay}s infinite`,
                pointerEvents: "none",
            }}
        >
            {emoji}
        </div>
    );
}

function PulsingDot({ color, delay = 0 }: { color: string; delay?: number }) {
    return (
        <span
            style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: color,
                animation: `pulse 2s ease-in-out ${delay}s infinite`,
            }}
        />
    );
}

function TypewriterText({ texts, speed = 50, pause = 3000 }: { texts: string[]; speed?: number, pause?: number }) {
    const [textIndex, setTextIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentText = texts[textIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (charIndex < currentText.length) {
                    setCharIndex(charIndex + 1);
                } else {
                    setTimeout(() => setIsDeleting(true), pause);
                }
            } else {
                if (charIndex > 0) {
                    setCharIndex(charIndex - 1);
                } else {
                    setIsDeleting(false);
                    setTextIndex((textIndex + 1) % texts.length);
                }
            }
        }, isDeleting ? speed / 2 : speed);
        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, textIndex, texts, speed, pause]);

    return (
        <span>
            {texts[textIndex].slice(0, charIndex)}
            <span style={{
                borderRight: "2px solid currentColor",
                animation: "blink 0.8s step-end infinite",
                marginLeft: "2px",
            }} />
        </span>
    );
}

// ============================================
// SECTION COMPONENTS
// ============================================

function HeroSection({ userCount }: { userCount: number }) {
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);

    return (
        <section style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Floating emojis background */}
            {["🎯", "💪", "🚀", "✨", "🔥", "📈", "🏆"].map((emoji, i) => (
                <FloatingEmoji key={i} emoji={emoji} delay={i * 0.7} x={10 + i * 12} />
            ))}

            {/* Live counter badge */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: `${colors.accent}15`,
                borderRadius: "24px",
                border: `1px solid ${colors.accent}30`,
                marginBottom: "24px",
                animation: "fadeInDown 0.8s ease",
            }}>
                <PulsingDot color={colors.accent} />
                <span style={{ fontSize: "14px", color: colors.accent, fontWeight: 500 }}>
                    <AnimatedCounter target={userCount} /> people growing together right now
                </span>
            </div>

            {/* Main headline */}
            <h1 style={{
                fontSize: "clamp(36px, 8vw, 72px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-2px",
                marginBottom: "16px",
                animation: "fadeInUp 0.8s ease 0.2s both",
            }}>
                Stop quitting.<br />
                <span style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}>
                    Start finishing.
                </span>
            </h1>

            {/* Dynamic subtitle */}
            <p style={{
                fontSize: "clamp(16px, 3vw, 22px)",
                color: colors.textSecondary,
                maxWidth: "600px",
                marginBottom: "8px",
                animation: "fadeInUp 0.8s ease 0.4s both",
            }}>
                Join small accountability groups for{" "}
                <span style={{ color: colors.primary, fontWeight: 600 }}>
                    <TypewriterText
                        texts={["fitness", "studying", "locking in", "getting shredded", "hustling", "self improvement", "shipping apps", "being consistent", "learning languages", "reading books"]}
                        pause={3000}
                    />
                </span>
            </p>

            <p style={{
                fontSize: "16px",
                color: colors.textMuted,
                marginBottom: "32px",
                animation: "fadeInUp 0.8s ease 0.5s both",
            }}>
                Real people. Daily check-ins. No more quitting alone.
            </p>

            {/* CTA Buttons */}
            <div style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                justifyContent: "center",
                animation: "fadeInUp 0.8s ease 0.6s both",
            }}>
                <Link
                    href="/onboarding"
                    onMouseEnter={() => setHoveredButton("start")}
                    onMouseLeave={() => setHoveredButton(null)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "16px 32px",
                        background: hoveredButton === "start"
                            ? `linear-gradient(135deg, #5B4BD6, ${colors.primary})`
                            : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                        color: "#fff",
                        borderRadius: "14px",
                        fontWeight: 600,
                        fontSize: "16px",
                        textDecoration: "none",
                        transition: "all 0.3s ease",
                        transform: hoveredButton === "start" ? "translateY(-3px) scale(1.02)" : "none",
                        boxShadow: hoveredButton === "start"
                            ? `0 12px 40px rgba(108, 92, 231, 0.5)`
                            : `0 4px 20px rgba(108, 92, 231, 0.3)`,
                    }}
                >
                    Start Free <span style={{ fontSize: "20px" }}>→</span>
                </Link>
                <Link
                    href="/login"
                    onMouseEnter={() => setHoveredButton("login")}
                    onMouseLeave={() => setHoveredButton(null)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "16px 32px",
                        background: hoveredButton === "login" ? colors.surface : "transparent",
                        color: colors.textSecondary,
                        borderRadius: "14px",
                        fontWeight: 500,
                        fontSize: "16px",
                        textDecoration: "none",
                        border: `1px solid ${colors.border}`,
                        transition: "all 0.3s ease",
                    }}
                >
                    Log in
                </Link>
            </div>

            {/* Scroll indicator */}
            <div style={{
                position: "absolute",
                bottom: "32px",
                left: "50%",
                transform: "translateX(-50%)",
                animation: "bounce 2s infinite",
            }}>
                <div style={{
                    width: "24px",
                    height: "40px",
                    borderRadius: "12px",
                    border: `2px solid ${colors.border}`,
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: "8px",
                }}>
                    <div style={{
                        width: "4px",
                        height: "8px",
                        borderRadius: "2px",
                        background: colors.textMuted,
                        animation: "scrollDown 2s infinite",
                    }} />
                </div>
            </div>
        </section>
    );
}

function HowItWorksSection() {
    const [hoveredStep, setHoveredStep] = useState<number | null>(null);

    const steps = [
        { number: "01", emoji: "👥", title: "Join a group", desc: "Find people with your exact goal. Small groups (5-30) mean real connection.", color: colors.primary },
        { number: "02", emoji: "📝", title: "Check in daily", desc: "Post your progress. Share wins, struggles, questions. Get support.", color: colors.accent },
        { number: "03", emoji: "🔥", title: "Build your streak", desc: "Your group sees when you're active. Streak = visible consistency.", color: colors.warning },
        { number: "04", emoji: "🏆", title: "Level up together", desc: "Compete on leaderboards. Celebrate wins. Never feel alone again.", color: colors.danger },
    ];

    return (
        <section style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, marginBottom: "12px" }}>
                    How it works
                </h2>
                <p style={{ color: colors.textSecondary, fontSize: "18px" }}>
                    4 simple steps to actually finish what you start
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
                {steps.map((step, i) => (
                    <div
                        key={i}
                        onMouseEnter={() => setHoveredStep(i)}
                        onMouseLeave={() => setHoveredStep(null)}
                        style={{
                            padding: "32px",
                            background: hoveredStep === i ? colors.surfaceHover : colors.surface,
                            borderRadius: "20px",
                            border: `1px solid ${hoveredStep === i ? step.color : colors.border}`,
                            transition: "all 0.3s ease",
                            transform: hoveredStep === i ? "translateY(-8px)" : "none",
                            cursor: "default",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                            <span style={{
                                fontSize: "40px",
                                transition: "transform 0.3s ease",
                                transform: hoveredStep === i ? "scale(1.2) rotate(10deg)" : "none",
                            }}>
                                {step.emoji}
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: step.color, opacity: 0.7 }}>
                                {step.number}
                            </span>
                        </div>
                        <h3 style={{
                            fontSize: "20px",
                            fontWeight: 700,
                            marginBottom: "8px",
                            color: hoveredStep === i ? step.color : colors.textPrimary,
                            transition: "color 0.3s ease",
                        }}>
                            {step.title}
                        </h3>
                        <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: 1.6 }}>
                            {step.desc}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AppPreviewSection() {
    const [activeTab, setActiveTab] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    return (
        <section style={{ padding: "80px 24px", background: colors.surface }}>
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: "48px" }}>
                    <div style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: colors.primary,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "12px",
                    }}>
                        What you get
                    </div>
                    <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, marginBottom: "12px" }}>
                        See the real app
                    </h2>
                    <p style={{ color: colors.textSecondary, fontSize: "18px" }}>
                        Interactive previews of what you&apos;ll use daily
                    </p>
                </div>

                {/* Tab buttons */}
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "32px", flexWrap: "wrap" }}>
                    {["Groups", "Check-ins", "Streaks"].map((tab, i) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(i)}
                            style={{
                                padding: "12px 24px",
                                borderRadius: "10px",
                                border: "none",
                                background: activeTab === i
                                    ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`
                                    : colors.bg,
                                color: activeTab === i ? "#fff" : colors.textSecondary,
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                transform: activeTab === i ? "scale(1.05)" : "none",
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Preview content */}
                <div style={{
                    background: colors.bg,
                    borderRadius: "24px",
                    padding: "32px",
                    border: `1px solid ${colors.border}`,
                    minHeight: "400px",
                }}>
                    {activeTab === 0 && (
                        <div style={{ animation: "fadeIn 0.5s ease" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px", color: colors.textSecondary }}>
                                Find your perfect group
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {sampleGroups.map((group, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "16px",
                                            padding: "20px",
                                            background: colors.surface,
                                            borderRadius: "16px",
                                            border: `1px solid ${colors.border}`,
                                            animation: `fadeInUp 0.5s ease ${i * 0.1}s both`,
                                            transition: "all 0.3s ease",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = group.color;
                                            e.currentTarget.style.transform = "translateX(8px)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = colors.border;
                                            e.currentTarget.style.transform = "none";
                                        }}
                                    >
                                        <div style={{
                                            width: "56px",
                                            height: "56px",
                                            borderRadius: "16px",
                                            background: `${group.color}20`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "28px",
                                        }}>
                                            {group.emoji}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "4px" }}>{group.name}</div>
                                            <div style={{ fontSize: "13px", color: colors.textMuted }}>{group.members} members • 🔥 Active</div>
                                        </div>
                                        <div style={{
                                            padding: "10px 18px",
                                            borderRadius: "10px",
                                            background: `${group.color}20`,
                                            color: group.color,
                                            fontSize: "14px",
                                            fontWeight: 600,
                                        }}>
                                            Join
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 1 && (
                        <div style={{ animation: "fadeIn 0.5s ease" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px", color: colors.textSecondary }}>
                                Daily check-ins with your group
                            </h3>
                            <div style={{
                                background: colors.surface,
                                borderRadius: "16px",
                                border: `1px solid ${colors.border}`,
                                overflow: "hidden",
                            }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "16px 20px",
                                    borderBottom: `1px solid ${colors.border}`,
                                }}>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "50%",
                                        background: `${colors.accent}20`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "22px",
                                    }}>
                                        👨‍💻
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: "15px" }}>Alex M.</div>
                                        <div style={{ fontSize: "12px", color: colors.textMuted }}>Just now • Day 23</div>
                                    </div>
                                    <div style={{
                                        padding: "6px 12px",
                                        borderRadius: "8px",
                                        background: `${colors.accent}15`,
                                        color: colors.accent,
                                        fontSize: "13px",
                                        fontWeight: 600,
                                    }}>
                                        🔥 23
                                    </div>
                                </div>
                                <div style={{ padding: "20px" }}>
                                    <p style={{ fontSize: "15px", lineHeight: 1.6, marginBottom: "20px" }}>
                                        Did a 30 min workout before work! 💪 Small win but staying consistent.
                                    </p>
                                    <div style={{ display: "flex", gap: "12px" }}>
                                        <button
                                            onClick={() => setIsLiked(!isLiked)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "10px 16px",
                                                borderRadius: "10px",
                                                background: isLiked ? `${colors.primary}20` : colors.bg,
                                                border: `1px solid ${isLiked ? colors.primary : colors.border}`,
                                                color: isLiked ? colors.primary : colors.textSecondary,
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                fontWeight: 500,
                                                transition: "all 0.2s ease",
                                                transform: isLiked ? "scale(1.05)" : "none",
                                            }}
                                        >
                                            {isLiked ? "🔥" : "👍"} {isLiked ? "8" : "7"}
                                        </button>
                                        <button style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "10px 16px",
                                            borderRadius: "10px",
                                            background: colors.bg,
                                            border: `1px solid ${colors.border}`,
                                            color: colors.textSecondary,
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            fontWeight: 500,
                                        }}>
                                            💬 3
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 2 && (
                        <div style={{ animation: "fadeIn 0.5s ease" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px", color: colors.textSecondary }}>
                                Track your progress
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div style={{
                                    background: colors.surface,
                                    borderRadius: "16px",
                                    padding: "24px",
                                    textAlign: "center",
                                    border: `1px solid ${colors.border}`,
                                }}>
                                    <div style={{
                                        fontSize: "56px",
                                        fontWeight: 800,
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        marginBottom: "8px",
                                    }}>
                                        <AnimatedCounter target={23} />
                                    </div>
                                    <div style={{ color: colors.textSecondary, fontWeight: 500 }}>🔥 Day Streak</div>
                                </div>
                                <div style={{
                                    background: colors.surface,
                                    borderRadius: "16px",
                                    padding: "12px",
                                    border: `1px solid ${colors.border}`,
                                }}>
                                    <div style={{
                                        padding: "8px 12px",
                                        borderBottom: `1px solid ${colors.border}`,
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        color: colors.textMuted,
                                    }}>
                                        🏆 Leaderboard
                                    </div>
                                    {[
                                        { rank: 1, name: "Sarah K.", streak: 47 },
                                        { rank: 2, name: "You", streak: 23 },
                                        { rank: 3, name: "Marcus", streak: 19 },
                                    ].map((m, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                                padding: "10px 12px",
                                                background: m.rank === 2 ? `${colors.primary}10` : "transparent",
                                                borderRadius: "8px",
                                            }}
                                        >
                                            <span style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "50%",
                                                background: m.rank === 1 ? "#FFD700" : m.rank === 2 ? "#C0C0C0" : "#CD7F32",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                color: colors.bg,
                                            }}>
                                                {m.rank}
                                            </span>
                                            <span style={{ flex: 1, fontSize: "13px", fontWeight: m.rank === 2 ? 600 : 400 }}>{m.name}</span>
                                            <span style={{ fontSize: "12px", color: colors.accent, fontWeight: 600 }}>🔥 {m.streak}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function StatsSection({ userCount }: { userCount: number }) {
    return (
        <section style={{ padding: "80px 24px", maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "24px",
                textAlign: "center",
            }}>
                {[
                    { value: 92, suffix: "%", label: "of people fail alone", color: colors.danger },
                    { value: 65, suffix: "%", label: "more likely to succeed with a partner", color: colors.primary },
                    { value: 23, suffix: "", label: "average day streak", prefix: "🔥 ", color: colors.accent },
                    { value: userCount, suffix: "+", label: "active members", color: colors.primaryLight },
                ].map((stat, i) => (
                    <div
                        key={i}
                        style={{
                            padding: "32px 24px",
                            background: colors.surface,
                            borderRadius: "20px",
                            border: `1px solid ${colors.border}`,
                        }}
                    >
                        <div style={{ fontSize: "48px", fontWeight: 800, color: stat.color, marginBottom: "8px" }}>
                            {stat.prefix}<AnimatedCounter target={stat.value} suffix={stat.suffix} />
                        </div>
                        <div style={{ color: colors.textSecondary, fontSize: "14px" }}>{stat.label}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function TestimonialsSection() {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % testimonials.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section style={{ padding: "80px 24px", background: colors.surface }}>
            <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
                <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, marginBottom: "48px" }}>
                    This could be you!
                </h2>

                <div style={{ position: "relative", minHeight: "200px" }}>
                    {testimonials.map((t, i) => (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                opacity: i === activeIndex ? 1 : 0,
                                transform: i === activeIndex ? "scale(1)" : "scale(0.9)",
                                transition: "all 0.5s ease",
                                pointerEvents: i === activeIndex ? "auto" : "none",
                            }}
                        >
                            <div style={{ fontSize: "64px", marginBottom: "16px" }}>{t.avatar}</div>
                            <p style={{ fontSize: "24px", fontStyle: "italic", marginBottom: "16px", color: colors.textPrimary }}>
                                &quot;{t.text}&quot;
                            </p>
                            <div style={{ color: colors.textSecondary }}>
                                <strong>{t.name}</strong> • 🔥 {t.streak} day streak
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "32px" }}>
                    {testimonials.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            style={{
                                width: i === activeIndex ? "32px" : "10px",
                                height: "10px",
                                borderRadius: "5px",
                                background: i === activeIndex ? colors.primary : colors.border,
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                            }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

function CTASection() {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <section style={{ padding: "100px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            {/* Background glow */}
            <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "600px",
                height: "600px",
                background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
                <h2 style={{ fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 800, marginBottom: "16px", letterSpacing: "-1px" }}>
                    Ready to actually finish?
                </h2>
                <p style={{ fontSize: "18px", color: colors.textSecondary, marginBottom: "32px", maxWidth: "500px", margin: "0 auto 32px" }}>
                    Join thousands who stopped quitting and started growing together.
                </p>
                <Link
                    href="/onboarding"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "20px 48px",
                        background: isHovered
                            ? `linear-gradient(135deg, #5B4BD6, ${colors.primary})`
                            : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                        color: "#fff",
                        borderRadius: "16px",
                        fontWeight: 700,
                        fontSize: "18px",
                        textDecoration: "none",
                        transition: "all 0.3s ease",
                        transform: isHovered ? "translateY(-4px) scale(1.02)" : "none",
                        boxShadow: isHovered
                            ? `0 20px 60px rgba(108, 92, 231, 0.5)`
                            : `0 8px 30px rgba(108, 92, 231, 0.3)`,
                    }}
                >
                    Get Started Free <span style={{ fontSize: "22px" }}>🚀</span>
                </Link>
                <p style={{ fontSize: "13px", color: colors.textMuted, marginTop: "16px" }}>
                    No credit card required • Free forever
                </p>
            </div>
        </section>
    );
}

// ============================================
// MAIN CLIENT COMPONENT
// ============================================

export default function LandingPageClient({ userCount }: { userCount: number }) {
    // If userCount is 0 or very low (e.g. dev env), show a realistic "starting" number or the actual number if requested
    // The user specifically asked for "actual number", so we use it. 
    // But to make it look good if it's 0, we'll ensure at least 1 (the user themselves) or 0 if truly empty.
    const displayCount = userCount;

    return (
        <div style={{
            background: colors.bg,
            color: colors.textPrimary,
            fontFamily: "var(--font-inter), Inter, -apple-system, sans-serif",
            minHeight: "100vh",
        }}>
            <HeroSection userCount={displayCount} />
            <HowItWorksSection />
            <AppPreviewSection />
            <StatsSection userCount={displayCount} />
            <TestimonialsSection />
            <CTASection />

            {/* Global animations */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0) translateX(-50%); }
                    50% { transform: translateY(-10px) translateX(-50%); }
                }
                @keyframes scrollDown {
                    0%, 100% { opacity: 1; transform: translateY(0); }
                    50% { opacity: 0.3; transform: translateY(6px); }
                }
                @keyframes floatUp {
                    0% { opacity: 0; transform: translateY(0) rotate(0deg); }
                    10% { opacity: 0.6; }
                    90% { opacity: 0.6; }
                    100% { opacity: 0; transform: translateY(-400px) rotate(20deg); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                * {
                    box-sizing: border-box;
                }
                html {
                    scroll-behavior: smooth;
                }
            `}</style>
        </div>
    );
}



