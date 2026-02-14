"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/client";

// ============================================
// ONBOARDING DATA
// ============================================

const testimonials = [
    {
        name: "Sarah K.",
        avatar: "👩‍💼",
        text: "Finally finished my side project after 2 years of procrastinating!",
        streak: 47,
    },
    {
        name: "Marcus T.",
        avatar: "👨‍🎨",
        text: "Lost 30 lbs because I couldn't let my group down.",
        streak: 89,
    },
    {
        name: "Elena R.",
        avatar: "👩‍💻",
        text: "Learned Spanish in 6 months with daily check-ins.",
        streak: 156,
    },
];

const goalTypes = [
    { id: "health", emoji: "💪", label: "Get healthier" },
    { id: "skill", emoji: "🎸", label: "Learn a new skill" },
    { id: "habit", emoji: "🌅", label: "Build a habit" },
    { id: "project", emoji: "🚀", label: "Finish a project" },
    { id: "career", emoji: "📈", label: "Grow my career" },
    { id: "creative", emoji: "🎨", label: "Create something" },
];

const momentumKillers = [
    { id: "boredom", emoji: "😴", label: "Gets boring" },
    { id: "invisible", emoji: "👻", label: "No one notices" },
    { id: "busy", emoji: "⏰", label: "Life gets busy" },
    { id: "interest", emoji: "🎯", label: "Lose interest" },
    { id: "alone", emoji: "🏝️", label: "Doing it alone" },
    { id: "overwhelm", emoji: "😵", label: "Overwhelmed" },
];

const interests = [
    { id: "fitness", emoji: "💪", label: "Fitness" },
    { id: "learning", emoji: "📚", label: "Learning" },
    { id: "coding", emoji: "💻", label: "Coding" },
    { id: "art", emoji: "🎨", label: "Art" },
    { id: "writing", emoji: "✍️", label: "Writing" },
    { id: "music", emoji: "🎵", label: "Music" },
    { id: "business", emoji: "💼", label: "Business" },
    { id: "mindfulness", emoji: "🧘", label: "Wellness" },
    { id: "languages", emoji: "🌍", label: "Languages" },
    { id: "reading", emoji: "📖", label: "Reading" },
    { id: "cooking", emoji: "🍳", label: "Cooking" },
    { id: "other", emoji: "✨", label: "Other" },
];

// Sample group data for preview
const sampleGroups = [
    { name: "Morning Runners", emoji: "🏃", members: 24, streak: "🔥 Active" },
    { name: "Code Every Day", emoji: "💻", members: 156, streak: "🔥 Active" },
    { name: "Learn Spanish", emoji: "🇪🇸", members: 89, streak: "🔥 Active" },
];

// ============================================
// STYLES
// ============================================

const colors = {
    bg: "#0A0A0B",
    surface: "#141416",
    surfaceHover: "#1A1A1E",
    border: "#2A2A2E",
    borderActive: "#6C5CE7",
    primary: "#6C5CE7",
    primaryLight: "#A29BFE",
    accent: "#00D9A5",
    warning: "#FFEAA7",
    textPrimary: "#FFFFFF",
    textSecondary: "#B8B8C0",
    textMuted: "#6B6B74",
};

const baseStyles = {
    page: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column" as const,
        background: colors.bg,
        fontFamily: "var(--font-inter), Inter, -apple-system, sans-serif",
        color: colors.textPrimary,
    },
    container: {
        flex: 1,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        maxWidth: "480px",
        margin: "0 auto",
        width: "100%",
    },
    title: {
        fontSize: "28px",
        fontWeight: 700,
        marginBottom: "12px",
        textAlign: "center" as const,
        lineHeight: 1.2,
        letterSpacing: "-0.5px",
    },
    subtitle: {
        fontSize: "16px",
        color: colors.textSecondary,
        textAlign: "center" as const,
        lineHeight: 1.5,
        marginBottom: "32px",
    },
    button: {
        width: "100%",
        padding: "16px 32px",
        borderRadius: "12px",
        border: "none",
        fontWeight: 600,
        fontSize: "16px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
    },
};

// ============================================
// COMPONENTS
// ============================================

function ProgressBar({ current, total }: { current: number; total: number }) {
    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: colors.border,
            zIndex: 100,
        }}>
            <div style={{
                height: "100%",
                width: `${((current + 1) / total) * 100}%`,
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryLight})`,
                transition: "width 0.4s ease",
                borderRadius: "0 3px 3px 0",
            }} />
        </div>
    );
}

function ContinueButton({
    onClick,
    disabled = false,
    label = "Continue"
}: {
    onClick: () => void;
    disabled?: boolean;
    label?: string;
}) {
    const [hover, setHover] = useState(false);

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...baseStyles.button,
                background: disabled
                    ? colors.border
                    : hover
                        ? `linear-gradient(135deg, #5B4BD6, ${colors.primary})`
                        : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                color: disabled ? colors.textMuted : "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                transform: !disabled && hover ? "translateY(-2px)" : "none",
                boxShadow: !disabled && hover
                    ? `0 8px 24px rgba(108, 92, 231, 0.4)`
                    : "none",
            }}
        >
            {label}
        </button>
    );
}

// ============================================
// SCREEN COMPONENTS
// ============================================

function HumanWelcomeScreen({ onNext, userCount }: { onNext: () => void; userCount: number }) {
    return (
        <div style={baseStyles.container}>
            {/* Friendly avatars */}
            <div style={{
                display: "flex",
                gap: "-8px",
                marginBottom: "24px",
            }}>
                {["👩‍💼", "👨‍🎨", "👩‍💻", "👨‍🔬", "👩‍🎤"].map((avatar, i) => (
                    <div
                        key={i}
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: colors.surface,
                            border: `2px solid ${colors.bg}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "24px",
                            marginLeft: i > 0 ? "-12px" : "0",
                            zIndex: 5 - i,
                            animation: `fadeIn 0.5s ease ${i * 0.1}s both`,
                        }}
                    >
                        {avatar}
                    </div>
                ))}
            </div>

            <h1 style={baseStyles.title}>
                Join {userCount.toLocaleString()} people who<br />actually follow through
            </h1>

            <p style={{ ...baseStyles.subtitle, marginBottom: "20px" }}>
                Real humans, real goals, real accountability.<br />
                No bots. No fake motivation.
            </p>

            {/* Trust badge */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "32px",
                padding: "10px 16px",
                background: `${colors.accent}15`,
                borderRadius: "24px",
                border: `1px solid ${colors.accent}30`,
            }}>
                <span style={{ color: colors.accent }}>✓</span>
                <span style={{ fontSize: "14px", color: colors.accent, fontWeight: 500 }}>
                    Average streak: 23 days
                </span>
            </div>

            <ContinueButton onClick={onNext} label="See how it works →" />
        </div>
    );
}

// Interactive Draggable Slider Screen
function DraggableSliderScreen({
    onNext,
    value,
    onChange
}: {
    onNext: () => void;
    value: number;
    onChange: (v: number) => void;
}) {
    const sliderRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const emojis = ["😰", "😟", "😐", "🙂", "😊"];
    const emojiIndex = Math.min(Math.floor(value / 20), 4);
    const currentEmoji = emojis[emojiIndex];

    const updateValue = useCallback((clientX: number) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        onChange(Math.round((x / rect.width) * 100));
    }, [onChange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        updateValue(e.clientX);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        updateValue(e.touches[0].clientX);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) updateValue(e.clientX);
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) updateValue(e.touches[0].clientX);
        };
        const handleEnd = () => setIsDragging(false);

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleEnd);
            document.addEventListener("touchmove", handleTouchMove);
            document.addEventListener("touchend", handleEnd);
        }
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleEnd);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleEnd);
        };
    }, [isDragging, updateValue]);

    return (
        <div style={baseStyles.container}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
            <h1 style={baseStyles.title}>
                How often do you finish<br />what you start?
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "48px" }}>
                Be honest — drag the slider!
            </p>

            <div style={{ width: "100%", marginBottom: "48px" }}>
                {/* Animated emoji */}
                <div style={{
                    fontSize: "80px",
                    textAlign: "center",
                    marginBottom: "32px",
                    transition: "transform 0.15s ease",
                    transform: `scale(${1 + value / 200}) rotate(${(value - 50) / 10}deg)`,
                }}>
                    {currentEmoji}
                </div>

                {/* Slider */}
                <div
                    ref={sliderRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    style={{
                        width: "100%",
                        height: "20px",
                        background: colors.surface,
                        borderRadius: "10px",
                        cursor: "pointer",
                        position: "relative",
                        border: `1px solid ${colors.border}`,
                        userSelect: "none",
                        touchAction: "none",
                    }}
                >
                    <div style={{
                        width: `${value}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, #FF6B6B, #FFEAA7, ${colors.accent})`,
                        borderRadius: "10px",
                        transition: isDragging ? "none" : "width 0.1s",
                    }} />
                    <div style={{
                        position: "absolute",
                        top: "50%",
                        left: `${value}%`,
                        transform: "translate(-50%, -50%)",
                        width: "36px",
                        height: "36px",
                        background: "#fff",
                        borderRadius: "50%",
                        boxShadow: isDragging ? "0 4px 20px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.3)",
                        cursor: isDragging ? "grabbing" : "grab",
                        transition: isDragging ? "none" : "left 0.1s",
                        border: `4px solid ${colors.primary}`,
                    }} />
                </div>

                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "16px",
                    fontSize: "14px",
                    color: colors.textSecondary,
                    fontWeight: 500,
                }}>
                    <span>Almost never</span>
                    <span>Always</span>
                </div>
            </div>

            <ContinueButton onClick={onNext} />
        </div>
    );
}

// Animated Stat Screen with counting animation
function AnimatedStatScreen({
    onNext,
    stat,
    headline,
    description,
    emoji,
    color = colors.primary
}: {
    onNext: () => void;
    stat: string;
    headline: string;
    description: string;
    emoji: string;
    color?: string;
}) {
    const [displayStat, setDisplayStat] = useState("0%");
    const numericStat = parseInt(stat.replace(/\D/g, ""));

    useEffect(() => {
        if (stat.includes("%")) {
            let current = 0;
            const interval = setInterval(() => {
                current += Math.ceil(numericStat / 20);
                if (current >= numericStat) {
                    current = numericStat;
                    clearInterval(interval);
                }
                setDisplayStat(`${current}%`);
            }, 50);
            return () => clearInterval(interval);
        } else {
            setDisplayStat(stat);
        }
    }, [stat, numericStat]);

    return (
        <div style={baseStyles.container}>
            <div style={{
                fontSize: "64px",
                marginBottom: "16px",
                animation: "bounce 1s ease infinite",
            }}>
                {emoji}
            </div>

            <div style={{
                fontSize: "80px",
                fontWeight: 800,
                color: color,
                lineHeight: 1,
                marginBottom: "16px",
                textShadow: `0 0 60px ${color}50`,
            }}>
                {displayStat}
            </div>

            <h1 style={{
                fontSize: "24px",
                fontWeight: 700,
                color: colors.textPrimary,
                marginBottom: "16px",
                lineHeight: 1.3,
                textAlign: "center",
            }}>
                {headline}
            </h1>

            <p style={{
                fontSize: "16px",
                color: colors.textSecondary,
                lineHeight: 1.6,
                maxWidth: "360px",
                textAlign: "center",
                marginBottom: "32px",
            }}>
                {description}
            </p>

            <ContinueButton onClick={onNext} />
        </div>
    );
}

// Momentum Killers Multi-Choice with haptic feedback feel
function MomentumKillersScreen({
    onNext,
    selected,
    onToggle,
}: {
    onNext: () => void;
    selected: string[];
    onToggle: (id: string) => void;
}) {
    const handleToggle = (id: string) => {
        onToggle(id);
    };

    return (
        <div style={baseStyles.container}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>💔</div>
            <h1 style={baseStyles.title}>
                What usually kills<br />your momentum?
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "24px" }}>
                Pick the ones that hit different 😅
            </p>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                width: "100%",
                marginBottom: "24px",
            }}>
                {momentumKillers.map((item) => {
                    const isSelected = selected.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleToggle(item.id)}
                            style={{
                                position: "relative",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "20px 12px",
                                borderRadius: "16px",
                                border: `2px solid ${isSelected ? "#FF6B6B" : colors.border}`,
                                background: isSelected
                                    ? "linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,107,107,0.1))"
                                    : colors.surface,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                transform: isSelected ? "scale(1.05)" : "scale(1)",
                                animation: isSelected ? "shake 0.3s ease" : "none",
                            }}
                        >
                            {isSelected && (
                                <div style={{
                                    position: "absolute",
                                    top: "-8px",
                                    right: "-8px",
                                    fontSize: "24px",
                                    animation: "bounce 0.5s ease",
                                }}>
                                    💥
                                </div>
                            )}
                            <span style={{
                                fontSize: "36px",
                                marginBottom: "8px",
                                transition: "transform 0.2s",
                                transform: isSelected ? "scale(1.2)" : "scale(1)",
                            }}>
                                {item.emoji}
                            </span>
                            <span style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: isSelected ? "#FF6B6B" : colors.textSecondary,
                            }}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {selected.length > 0 && (
                <p style={{
                    color: "#FF6B6B",
                    fontSize: "14px",
                    marginBottom: "16px",
                    fontWeight: 600,
                }}>
                    😤 {selected.length} pain points identified
                </p>
            )}

            <ContinueButton onClick={onNext} disabled={selected.length === 0} />
        </div>
    );
}

// 1-10 Scale with animated number
function ConsistencyScaleScreen({
    onNext,
    value,
    onChange
}: {
    onNext: () => void;
    value: number;
    onChange: (v: number) => void;
}) {
    const getColor = (val: number) => {
        if (val <= 3) return "#FF6B6B";
        if (val <= 6) return "#FFEAA7";
        return colors.accent;
    };

    const getMessage = (val: number) => {
        if (val <= 2) return { text: "We've all been there 😅", emoji: "📈" };
        if (val <= 4) return { text: "Room for growth!", emoji: "💪" };
        if (val <= 6) return { text: "Getting there!", emoji: "🌱" };
        if (val <= 8) return { text: "Pretty solid!", emoji: "⭐" };
        return { text: "Impressive!", emoji: "🚀" };
    };

    const msg = getMessage(value);

    return (
        <div style={baseStyles.container}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
            <h1 style={baseStyles.title}>
                How consistent are you<br />with your goals?
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "40px" }}>
                Rate yourself 1-10
            </p>

            {/* Large animated number */}
            <div style={{
                fontSize: "140px",
                fontWeight: 900,
                color: getColor(value),
                lineHeight: 1,
                marginBottom: "24px",
                textShadow: `0 0 80px ${getColor(value)}60`,
                transition: "all 0.3s ease",
                transform: `scale(${0.9 + value / 100})`,
            }}>
                {value}
            </div>

            {/* Scale buttons */}
            <div style={{
                display: "flex",
                gap: "6px",
                width: "100%",
                marginBottom: "24px",
            }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                        key={num}
                        onClick={() => onChange(num)}
                        style={{
                            flex: 1,
                            aspectRatio: "1",
                            borderRadius: "10px",
                            border: value === num ? `3px solid ${getColor(num)}` : `1px solid ${colors.border}`,
                            background: value === num
                                ? `linear-gradient(135deg, ${getColor(num)}, ${getColor(num)}80)`
                                : colors.surface,
                            color: value === num ? "#fff" : colors.textMuted,
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            transform: value === num ? "scale(1.15)" : "scale(1)",
                            boxShadow: value === num ? `0 4px 20px ${getColor(num)}50` : "none",
                        }}
                    >
                        {num}
                    </button>
                ))}
            </div>

            {/* Dynamic message */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 20px",
                background: `${getColor(value)}15`,
                borderRadius: "12px",
                marginBottom: "32px",
            }}>
                <span style={{ fontSize: "24px" }}>{msg.emoji}</span>
                <span style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: getColor(value),
                }}>
                    {msg.text}
                </span>
            </div>

            <ContinueButton onClick={onNext} />
        </div>
    );
}

function TestimonialScreen({ onNext }: { onNext: () => void }) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % testimonials.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={baseStyles.container}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
            <h1 style={baseStyles.title}>
                This could be you!
            </h1>

            {/* Testimonial carousel */}
            <div style={{
                width: "100%",
                marginBottom: "32px",
            }}>
                {testimonials.map((t, i) => (
                    <div
                        key={i}
                        style={{
                            display: i === activeIndex ? "block" : "none",
                            animation: "fadeIn 0.5s ease",
                        }}
                    >
                        <div style={{
                            background: colors.surface,
                            borderRadius: "16px",
                            padding: "24px",
                            border: `1px solid ${colors.border}`,
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                marginBottom: "16px",
                            }}>
                                <div style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "50%",
                                    background: `${colors.primary}20`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "24px",
                                }}>
                                    {t.avatar}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "16px" }}>{t.name}</div>
                                    <div style={{
                                        fontSize: "13px",
                                        color: colors.accent,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                    }}>
                                        🔥 {t.streak} day streak
                                    </div>
                                </div>
                            </div>
                            <p style={{
                                fontSize: "18px",
                                lineHeight: 1.5,
                                color: colors.textPrimary,
                                fontStyle: "italic",
                            }}>
                                &quot;{t.text}&quot;
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Dots */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                {testimonials.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveIndex(i)}
                        style={{
                            width: i === activeIndex ? "24px" : "8px",
                            height: "8px",
                            borderRadius: "4px",
                            background: i === activeIndex ? colors.primary : colors.border,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.3s",
                        }}
                    />
                ))}
            </div>

            <ContinueButton onClick={onNext} />
        </div>
    );
}

function GoalSelectionScreen({
    onNext,
    selected,
    onToggle,
}: {
    onNext: () => void;
    selected: string[];
    onToggle: (id: string) => void;
}) {
    return (
        <div style={baseStyles.container}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
            <h1 style={baseStyles.title}>
                What are you<br />working towards?
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "24px" }}>
                We&apos;ll match you with the right groups
            </p>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                width: "100%",
                marginBottom: "24px",
            }}>
                {goalTypes.map((item) => {
                    const isSelected = selected.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => onToggle(item.id)}
                            style={{
                                position: "relative",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "20px 12px",
                                borderRadius: "16px",
                                border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                                background: isSelected
                                    ? `linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.1))`
                                    : colors.surface,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                transform: isSelected ? "scale(1.02)" : "scale(1)",
                            }}
                        >
                            {isSelected && (
                                <div style={{
                                    position: "absolute",
                                    top: "8px",
                                    right: "8px",
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    background: colors.primary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}>
                                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>✓</span>
                                </div>
                            )}
                            <span style={{ fontSize: "32px", marginBottom: "8px" }}>{item.emoji}</span>
                            <span style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: isSelected ? colors.primaryLight : colors.textSecondary,
                            }}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {selected.length > 0 && (
                <p style={{
                    color: colors.accent,
                    fontSize: "14px",
                    marginBottom: "16px",
                    fontWeight: 600,
                }}>
                    ✨ {selected.length} selected
                </p>
            )}

            <ContinueButton onClick={onNext} disabled={selected.length === 0} />
        </div>
    );
}

function AppPreviewGroupsScreen({ onNext }: { onNext: () => void }) {
    return (
        <div style={baseStyles.container}>
            <div style={{
                fontSize: "12px",
                color: colors.primary,
                fontWeight: 600,
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
            }}>
                App Preview
            </div>
            <h1 style={{ ...baseStyles.title, marginBottom: "8px" }}>
                Find your tribe
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "24px" }}>
                Join small groups of like-minded people
            </p>

            {/* Mock group cards */}
            <div style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "24px",
            }}>
                {sampleGroups.map((group, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            padding: "16px",
                            background: colors.surface,
                            borderRadius: "14px",
                            border: `1px solid ${colors.border}`,
                            animation: `fadeIn 0.4s ease ${i * 0.1}s both`,
                        }}
                    >
                        <div style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "14px",
                            background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primaryLight}20)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                        }}>
                            {group.emoji}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "4px" }}>
                                {group.name}
                            </div>
                            <div style={{ fontSize: "13px", color: colors.textMuted }}>
                                {group.members} members • {group.streak}
                            </div>
                        </div>
                        <div style={{
                            padding: "8px 14px",
                            borderRadius: "8px",
                            background: `${colors.primary}20`,
                            color: colors.primary,
                            fontSize: "13px",
                            fontWeight: 600,
                        }}>
                            Join
                        </div>
                    </div>
                ))}
            </div>

            <p style={{
                fontSize: "13px",
                color: colors.textMuted,
                textAlign: "center",
                marginBottom: "24px",
            }}>
                Small groups (5-30 people) = more accountability
            </p>

            <ContinueButton onClick={onNext} />
        </div>
    );
}

function AppPreviewCheckInScreen({ onNext }: { onNext: () => void }) {
    const [liked, setLiked] = useState(false);

    return (
        <div style={baseStyles.container}>
            <div style={{
                fontSize: "12px",
                color: colors.primary,
                fontWeight: 600,
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
            }}>
                App Preview
            </div>
            <h1 style={{ ...baseStyles.title, marginBottom: "8px" }}>
                Daily check-ins
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "24px" }}>
                Share your progress, get support
            </p>

            {/* Mock post */}
            <div style={{
                width: "100%",
                background: colors.surface,
                borderRadius: "16px",
                border: `1px solid ${colors.border}`,
                overflow: "hidden",
                marginBottom: "24px",
            }}>
                {/* Post header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px",
                    borderBottom: `1px solid ${colors.border}`,
                }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: `${colors.accent}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                    }}>
                        👨‍💻
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "15px" }}>Alex M.</div>
                        <div style={{ fontSize: "12px", color: colors.textMuted }}>Just now • Day 12</div>
                    </div>
                    <div style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        background: `${colors.accent}15`,
                        color: colors.accent,
                        fontSize: "12px",
                        fontWeight: 600,
                    }}>
                        🔥 12
                    </div>
                </div>

                {/* Post content */}
                <div style={{ padding: "16px" }}>
                    <p style={{ fontSize: "15px", lineHeight: 1.6, marginBottom: "16px" }}>
                        Did a 20 min workout before work! 💪 Small win but staying consistent.
                        Thanks for the push yesterday @Sarah!
                    </p>

                    {/* Reactions */}
                    <div style={{
                        display: "flex",
                        gap: "12px",
                    }}>
                        <button
                            onClick={() => setLiked(!liked)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                borderRadius: "8px",
                                background: liked ? `${colors.primary}20` : colors.bg,
                                border: `1px solid ${liked ? colors.primary : colors.border}`,
                                color: liked ? colors.primary : colors.textSecondary,
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: 500,
                                transition: "all 0.2s",
                            }}
                        >
                            {liked ? "🔥" : "👍"} {liked ? "5" : "4"}
                        </button>
                        <button style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            color: colors.textSecondary,
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 500,
                        }}>
                            💬 2
                        </button>
                    </div>
                </div>
            </div>

            <p style={{
                fontSize: "13px",
                color: colors.textMuted,
                textAlign: "center",
                marginBottom: "24px",
            }}>
                Your group sees when you&apos;re inactive 👀
            </p>

            <ContinueButton onClick={onNext} />
        </div>
    );
}

function AppPreviewStreakScreen({ onNext }: { onNext: () => void }) {
    return (
        <div style={baseStyles.container}>
            <div style={{
                fontSize: "12px",
                color: colors.primary,
                fontWeight: 600,
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
            }}>
                App Preview
            </div>
            <h1 style={{ ...baseStyles.title, marginBottom: "8px" }}>
                Watch yourself grow
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "24px" }}>
                Track streaks & climb the leaderboard
            </p>

            {/* Mock streak display */}
            <div style={{
                width: "100%",
                background: colors.surface,
                borderRadius: "16px",
                border: `1px solid ${colors.border}`,
                padding: "24px",
                marginBottom: "16px",
                textAlign: "center",
            }}>
                <div style={{
                    fontSize: "72px",
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: "8px",
                }}>
                    23
                </div>
                <div style={{
                    fontSize: "16px",
                    color: colors.textSecondary,
                    fontWeight: 500,
                }}>
                    🔥 Day Streak
                </div>
            </div>

            {/* Mock leaderboard */}
            <div style={{
                width: "100%",
                background: colors.surface,
                borderRadius: "16px",
                border: `1px solid ${colors.border}`,
                overflow: "hidden",
                marginBottom: "24px",
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
                    { rank: 2, name: "You", streak: 23, you: true },
                    { rank: 3, name: "Marcus T.", streak: 19, you: false },
                ].map((member, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            background: member.you ? `${colors.primary}10` : "transparent",
                            borderBottom: i < 2 ? `1px solid ${colors.border}` : "none",
                        }}
                    >
                        <div style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: member.rank === 1 ? "#FFD700" : member.rank === 2 ? "#C0C0C0" : "#CD7F32",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: colors.bg,
                        }}>
                            {member.rank}
                        </div>
                        <div style={{ flex: 1, fontWeight: member.you ? 600 : 400 }}>
                            {member.name}
                        </div>
                        <div style={{
                            fontSize: "14px",
                            color: colors.accent,
                            fontWeight: 600,
                        }}>
                            🔥 {member.streak}
                        </div>
                    </div>
                ))}
            </div>

            <ContinueButton onClick={onNext} />
        </div>
    );
}

function CommunityQuestionScreen({ onNext }: { onNext: () => void }) {
    const handleSelect = () => {
        setTimeout(onNext, 300);
    };

    return (
        <div style={baseStyles.container}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤝</div>
            <h1 style={baseStyles.title}>
                Ready to join a<br />supportive community?
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "32px" }}>
                People who cheer you on & keep you accountable
            </p>

            <div style={{ display: "flex", gap: "16px", width: "100%" }}>
                {[
                    { id: "definitely", label: "Let's do this!", emoji: "🙌" },
                    { id: "maybe", label: "Tell me more", emoji: "🤔" },
                ].map((option) => (
                    <button
                        key={option.id}
                        onClick={handleSelect}
                        style={{
                            flex: 1,
                            padding: "32px 24px",
                            borderRadius: "16px",
                            border: `2px solid ${colors.border}`,
                            background: colors.surface,
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>{option.emoji}</div>
                        <div style={{
                            fontSize: "18px",
                            fontWeight: 600,
                            color: colors.textPrimary,
                        }}>
                            {option.label}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function InterestsScreen({
    onNext,
    selected,
    onToggle
}: {
    onNext: () => void;
    selected: string[];
    onToggle: (id: string) => void;
}) {
    return (
        <div style={baseStyles.container}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✨</div>
            <h1 style={baseStyles.title}>
                Final step!<br />Pick your interests
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "24px" }}>
                We&apos;ll recommend groups you&apos;ll love
            </p>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
                width: "100%",
                marginBottom: "24px",
            }}>
                {interests.map((item) => {
                    const isSelected = selected.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => onToggle(item.id)}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "14px 8px",
                                borderRadius: "12px",
                                border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                                background: isSelected
                                    ? `linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.1))`
                                    : colors.surface,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            <span style={{ fontSize: "24px", marginBottom: "4px" }}>{item.emoji}</span>
                            <span style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: isSelected ? colors.primaryLight : colors.textSecondary,
                            }}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {selected.length > 0 && (
                <p style={{
                    color: colors.accent,
                    fontSize: "14px",
                    marginBottom: "16px",
                    fontWeight: 600,
                }}>
                    ✨ {selected.length} selected
                </p>
            )}

            <ContinueButton onClick={onNext} disabled={selected.length === 0} />
        </div>
    );
}

function NameScreen({
    onNext,
    name,
    onChange
}: {
    onNext: () => void;
    name: string;
    onChange: (n: string) => void;
}) {
    const isValid = name.trim().length >= 2;

    return (
        <div style={baseStyles.container}>
            <div style={{
                fontSize: "56px",
                marginBottom: "24px",
                animation: "wave 1s ease-in-out infinite",
            }}>
                👋
            </div>
            <h1 style={baseStyles.title}>
                What should we<br />call you?
            </h1>
            <p style={{ ...baseStyles.subtitle, marginBottom: "32px" }}>
                This is how you&apos;ll appear in groups
            </p>

            <input
                type="text"
                value={name}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Your name"
                autoFocus
                style={{
                    width: "100%",
                    padding: "18px 24px",
                    fontSize: "20px",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    borderRadius: "14px",
                    border: `2px solid ${isValid ? colors.primary : colors.border}`,
                    background: colors.surface,
                    color: colors.textPrimary,
                    textAlign: "center",
                    outline: "none",
                    marginBottom: "16px",
                    transition: "all 0.2s",
                }}
            />

            {isValid && (
                <p style={{
                    color: colors.accent,
                    fontSize: "16px",
                    marginBottom: "24px",
                    fontWeight: 600,
                }}>
                    Nice to meet you, {name}! 🎉
                </p>
            )}

            <ContinueButton onClick={onNext} disabled={!isValid} />
        </div>
    );
}

function ReadyScreen({ onComplete, name }: { onComplete: () => void; name: string }) {
    return (
        <div style={baseStyles.container}>
            <div style={{
                fontSize: "80px",
                marginBottom: "24px",
                animation: "pulse 2s ease infinite",
            }}>
                🎉
            </div>
            <h1 style={{
                ...baseStyles.title,
                fontSize: "32px",
            }}>
                Welcome, {name}!
            </h1>
            <p style={{ ...baseStyles.subtitle, fontSize: "18px", marginBottom: "32px" }}>
                Your accountability journey starts now.<br />
                Let&apos;s find your perfect group.
            </p>

            {/* Quick promise */}
            <div style={{
                width: "100%",
                background: colors.surface,
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "32px",
                border: `1px solid ${colors.border}`,
            }}>
                <div style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: colors.textMuted,
                    marginBottom: "12px",
                }}>
                    ✨ What happens next:
                </div>
                {[
                    "Browse groups that match your interests",
                    "Join one that feels right",
                    "Post your first check-in today",
                ].map((item, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: i < 2 ? "10px" : 0,
                            fontSize: "14px",
                            color: colors.textSecondary,
                        }}
                    >
                        <span style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: `${colors.primary}20`,
                            color: colors.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                        }}>
                            {i + 1}
                        </span>
                        {item}
                    </div>
                ))}
            </div>

            <ContinueButton onClick={onComplete} label="Find my group →" />
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

function OnboardingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const step = parseInt(searchParams.get("step") || "0");

    const setStep = (newStep: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", newStep.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    // State
    const [userCount, setUserCount] = useState(2847);
    const [sliderValue, setSliderValue] = useState(50);
    const [momentumKillersSelected, setMomentumKillersSelected] = useState<string[]>([]);
    const [consistencyScore, setConsistencyScore] = useState(5);
    const [goalTypesSelected, setGoalTypesSelected] = useState<string[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [name, setName] = useState("");

    useEffect(() => {
        const fetchUserCount = async () => {
            const supabase = createClient();
            const { count } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true });
            if (count) setUserCount(count);
        };
        fetchUserCount();
    }, []);

    const toggleMomentumKiller = (id: string) => {
        setMomentumKillersSelected((prev) => {
            if (prev.includes(id)) return prev.filter((i) => i !== id);
            return [...prev, id];
        });
    };

    const toggleGoalType = (id: string) => {
        setGoalTypesSelected((prev) => {
            if (prev.includes(id)) return prev.filter((i) => i !== id);
            return [...prev, id];
        });
    };

    const toggleInterest = (id: string) => {
        setSelectedInterests((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const nextStep = () => setStep(step + 1);

    const handleComplete = () => {
        router.push("/login?next=/");
    };

    const totalSteps = 15;

    const screens = [
        // 0: Human Welcome with social proof
        <HumanWelcomeScreen key="welcome" onNext={nextStep} userCount={userCount} />,

        // 1: Interactive Slider - finish rate
        <DraggableSliderScreen key="slider" onNext={nextStep} value={sliderValue} onChange={setSliderValue} />,

        // 2: Animated Stat - 92% fail
        <AnimatedStatScreen
            key="stat1"
            onNext={nextStep}
            emoji="📉"
            stat="92%"
            headline="of resolutions fail by February"
            description="The #1 reason? No accountability. No one watching. No consequences for quitting."
            color="#FF6B6B"
        />,

        // 3: Momentum Killers
        <MomentumKillersScreen
            key="momentum"
            onNext={nextStep}
            selected={momentumKillersSelected}
            onToggle={toggleMomentumKiller}
        />,

        // 4: Animated Stat - 65% more likely
        <AnimatedStatScreen
            key="stat2"
            onNext={nextStep}
            emoji="🔬"
            stat="65%"
            headline="more likely to succeed with a partner"
            description="And 95% more likely with regular check-ins. Science says accountability works."
            color={colors.accent}
        />,

        // 5: Testimonials
        <TestimonialScreen key="testimonials" onNext={nextStep} />,

        // 6: Goal selection
        <GoalSelectionScreen
            key="goals"
            onNext={nextStep}
            selected={goalTypesSelected}
            onToggle={toggleGoalType}
        />,

        // 7: Consistency scale
        <ConsistencyScaleScreen key="scale" onNext={nextStep} value={consistencyScore} onChange={setConsistencyScore} />,

        // 8: App Preview - Groups
        <AppPreviewGroupsScreen key="preview-groups" onNext={nextStep} />,

        // 9: App Preview - Check-in
        <AppPreviewCheckInScreen key="preview-checkin" onNext={nextStep} />,

        // 10: App Preview - Streaks
        <AppPreviewStreakScreen key="preview-streak" onNext={nextStep} />,

        // 11: Community question
        <CommunityQuestionScreen key="community" onNext={nextStep} />,

        // 12: Interests
        <InterestsScreen key="interests" onNext={nextStep} selected={selectedInterests} onToggle={toggleInterest} />,

        // 13: Name
        <NameScreen key="name" onNext={nextStep} name={name} onChange={setName} />,

        // 14: Ready
        <ReadyScreen key="ready" onComplete={handleComplete} name={name} />,
    ];

    if (step >= screens.length) {
        return <ReadyScreen key="ready" onComplete={handleComplete} name={name} />;
    }

    return (
        <div style={baseStyles.page}>
            <ProgressBar current={step} total={totalSteps} />

            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                animation: "fadeIn 0.3s ease",
            }}>
                {screens[step]}
            </div>

            {/* Animations */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(20deg); }
                    75% { transform: rotate(-15deg); }
                }
                @keyframes shake {
                    0%, 100% { transform: scale(1.05) rotate(0deg); }
                    25% { transform: scale(1.05) rotate(-3deg); }
                    75% { transform: scale(1.05) rotate(3deg); }
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(108, 92, 231, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(108, 92, 231, 0.6); }
                }
                * {
                    box-sizing: border-box;
                }
                input::placeholder {
                    color: ${colors.textMuted};
                }
            `}</style>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: "100vh",
                background: "#0A0A0B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6B6B74"
            }}>
                Loading...
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    );
}
