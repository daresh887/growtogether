"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { uploadProfileImage, updateProfile } from "@/app/actions/profile";

const colors = {
    bg: "#0A0A0B",
    surface: "#141416",
    surfaceHover: "#1A1A1E",
    border: "#2A2A2E",
    primary: "#6C5CE7",
    primaryLight: "#A29BFE",
    accent: "#00D9A5",
    textPrimary: "#FFFFFF",
    textSecondary: "#B8B8C0",
    textMuted: "#6B6B74",
    danger: "#FF4757",
};

const availableAvatars = ["🧑‍💻", "👨‍🎨", "👩‍🔬", "🧑‍🚀", "👨‍🍳", "👩‍🎤", "🧑‍🏫", "👨‍⚕️", "👩‍💼", "🦸", "🧙", "🧛", "🧜‍♀️", "🧚", "🦊", "🐱", "🐶", "🦁", "🐼", "🦄"];

const availableInterests = [
    "🏃 Fitness & Health",
    "🎨 Art & Creativity",
    "📚 Learning & Education",
    "🧘 Mindfulness & Wellness",
    "🍳 Lifestyle & Home",
    "👥 Social & Community",
    "📈 Productivity & Career",
    "🎮 Hobbies & Fun",
    "⚽ Sports",
    "💰 Finance & Saving",
    "🚭 Habit Building",
    "🌅 Daily Routines",
];

export default function SetupPage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [step, setStep] = useState(0);

    // Form state
    const [displayName, setDisplayName] = useState("");
    const [avatar, setAvatar] = useState("🧑‍💻");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarType, setAvatarType] = useState<"emoji" | "image">("emoji");
    const [bio, setBio] = useState("");
    const [interests, setInterests] = useState<string[]>([]);
    const [goals, setGoals] = useState<string[]>([]);
    const [goalInput, setGoalInput] = useState("");

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

        // Check if already completed
        const metadata = user.user_metadata || {};
        if (metadata.profile_complete) {
            router.push("/dashboard");
            return;
        }

        // Pre-fill existing data
        setDisplayName(metadata.display_name || metadata.full_name || "");
        setAvatar(metadata.avatar || "🧑‍💻");
        setAvatarUrl(metadata.avatar_url || null);
        setAvatarType(metadata.avatar_url ? "image" : "emoji");
        setBio(metadata.bio || "");
        setInterests(metadata.interests || []);

        setLoading(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const publicUrl = await uploadProfileImage(formData);
            setAvatarUrl(publicUrl);
            setAvatarType("image");
        } catch (err) {
            console.error("Error uploading:", err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const toggleInterest = (interest: string) => {
        setInterests(prev =>
            prev.includes(interest)
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        );
    };

    const addGoal = () => {
        const trimmed = goalInput.trim();
        if (trimmed && goals.length < 5 && !goals.includes(trimmed)) {
            setGoals(prev => [...prev, trimmed]);
            setGoalInput("");
        }
    };

    const removeGoal = (goal: string) => {
        setGoals(prev => prev.filter(g => g !== goal));
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            await updateProfile({
                display_name: displayName,
                avatar: avatarType === "emoji" ? avatar : undefined,
                avatar_url: avatarType === "image" ? (avatarUrl || undefined) : undefined,
                bio: bio,
                interests: interests,
                goals: goals.length > 0 ? goals : undefined,
            });

            // Set profile_complete flag (no separate tutorial needed)
            await supabase.auth.updateUser({
                data: { profile_complete: true, tutorial_complete: true }
            });

            router.push("/dashboard");
        } catch (err) {
            console.error("Error saving profile:", err);
        } finally {
            setSaving(false);
        }
    };

    const canProceed = () => {
        if (step === 0) return displayName.trim().length >= 2;
        if (step === 1) return true; // Avatar is optional
        if (step === 2) return true; // Bio is optional
        if (step === 3) return interests.length >= 1;
        if (step === 4) return true; // Goals are optional
        return true;
    };

    const handleNext = () => {
        setStep(step + 1);
    };

    const totalSteps = 6; // Name, Avatar, Bio, Interests, Groups, Preview

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
            {/* Background gradient */}
            <div style={{
                position: "absolute",
                top: "-200px",
                right: "-200px",
                width: "600px",
                height: "600px",
                background: `radial-gradient(circle, rgba(108, 92, 231, 0.15) 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: "none" }}
                onChange={handleFileSelect}
            />

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

            {/* Step indicator */}
            <div style={{
                position: "fixed",
                top: "24px",
                right: "24px",
                fontSize: "14px",
                color: colors.textMuted,
            }}>
                {step + 1} / {totalSteps}
            </div>

            {/* Main content */}
            <div style={{
                maxWidth: "500px",
                width: "100%",
                animation: "fadeIn 0.5s ease",
            }}>
                {/* Step 0: Name */}
                {step === 0 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>👋</div>
                        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
                            What should we call you?
                        </h1>
                        <p style={{ color: colors.textSecondary, fontSize: "16px", marginBottom: "32px" }}>
                            This is how you&apos;ll appear to others
                        </p>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your name"
                            style={{
                                width: "100%",
                                padding: "16px 20px",
                                borderRadius: "14px",
                                border: `2px solid ${displayName.trim().length >= 2 ? colors.primary : colors.border}`,
                                background: colors.surface,
                                color: colors.textPrimary,
                                fontSize: "18px",
                                textAlign: "center",
                                outline: "none",
                                transition: "border-color 0.2s",
                            }}
                            autoFocus
                        />
                    </div>
                )}

                {/* Step 1: Avatar */}
                {step === 1 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📸</div>
                        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
                            Choose your look
                        </h1>
                        <p style={{ color: colors.textSecondary, fontSize: "16px", marginBottom: "24px" }}>
                            Pick an emoji or upload a photo
                        </p>

                        {/* Avatar type toggle */}
                        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
                            <button
                                onClick={() => setAvatarType("emoji")}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "10px",
                                    border: avatarType === "emoji" ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                                    background: avatarType === "emoji" ? `${colors.primary}20` : "transparent",
                                    color: avatarType === "emoji" ? colors.primaryLight : colors.textSecondary,
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                😊 Emoji
                            </button>
                            <button
                                onClick={() => setAvatarType("image")}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "10px",
                                    border: avatarType === "image" ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                                    background: avatarType === "image" ? `${colors.primary}20` : "transparent",
                                    color: avatarType === "image" ? colors.primaryLight : colors.textSecondary,
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                📷 Photo
                            </button>
                        </div>

                        {avatarType === "emoji" ? (
                            <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: "8px",
                            }}>
                                {availableAvatars.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => setAvatar(emoji)}
                                        style={{
                                            width: "56px",
                                            height: "56px",
                                            borderRadius: "14px",
                                            border: avatar === emoji ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                                            background: avatar === emoji ? `${colors.primary}20` : colors.surface,
                                            fontSize: "28px",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            transform: avatar === emoji ? "scale(1.1)" : "none",
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                                {avatarUrl ? (
                                    <>
                                        <div style={{
                                            width: "120px",
                                            height: "120px",
                                            borderRadius: "50%",
                                            overflow: "hidden",
                                            border: `3px solid ${colors.primary}`,
                                            boxShadow: `0 0 30px ${colors.primary}40`,
                                        }}>
                                            <Image
                                                src={avatarUrl}
                                                alt="Profile"
                                                width={120}
                                                height={120}
                                                style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                padding: "10px 20px",
                                                borderRadius: "10px",
                                                border: `1px solid ${colors.border}`,
                                                background: "transparent",
                                                color: colors.textSecondary,
                                                fontSize: "14px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Change photo
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        style={{
                                            width: "120px",
                                            height: "120px",
                                            borderRadius: "50%",
                                            border: `2px dashed ${colors.border}`,
                                            background: colors.surface,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            cursor: uploading ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {uploading ? (
                                            <div style={{
                                                width: "24px",
                                                height: "24px",
                                                border: `2px solid ${colors.border}`,
                                                borderTopColor: colors.primary,
                                                borderRadius: "50%",
                                                animation: "spin 1s linear infinite",
                                            }} />
                                        ) : (
                                            <>
                                                <span style={{ fontSize: "32px" }}>📷</span>
                                                <span style={{ fontSize: "12px", color: colors.textMuted }}>Upload</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Bio */}
                {step === 2 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✨</div>
                        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
                            Tell us about yourself
                        </h1>
                        <p style={{ color: colors.textSecondary, fontSize: "16px", marginBottom: "32px" }}>
                            A short bio so others can get to know you
                        </p>
                        <div style={{ position: "relative" }}>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value.slice(0, 160))}
                                placeholder="I'm working on becoming more consistent with..."
                                rows={4}
                                style={{
                                    width: "100%",
                                    padding: "16px 20px",
                                    borderRadius: "14px",
                                    border: `2px solid ${colors.border}`,
                                    background: colors.surface,
                                    color: colors.textPrimary,
                                    fontSize: "16px",
                                    resize: "none",
                                    outline: "none",
                                    lineHeight: 1.6,
                                }}
                            />
                            <span style={{
                                position: "absolute",
                                bottom: "12px",
                                right: "16px",
                                fontSize: "12px",
                                color: bio.length > 140 ? colors.danger : colors.textMuted,
                            }}>
                                {bio.length}/160
                            </span>
                        </div>
                        <p style={{ color: colors.textMuted, fontSize: "13px", marginTop: "12px" }}>
                            Optional — you can always add this later
                        </p>
                    </div>
                )}

                {/* Step 3: Interests */}
                {step === 3 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
                        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
                            What are you into?
                        </h1>
                        <p style={{ color: colors.textSecondary, fontSize: "16px", marginBottom: "24px" }}>
                            Select your interests to find the right groups
                        </p>
                        <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            gap: "8px",
                            maxHeight: "350px",
                            overflowY: "auto",
                            padding: "8px",
                        }}>
                            {availableInterests.map((interest) => {
                                const isSelected = interests.includes(interest);
                                return (
                                    <button
                                        key={interest}
                                        onClick={() => toggleInterest(interest)}
                                        style={{
                                            padding: "10px 16px",
                                            borderRadius: "20px",
                                            border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                                            background: isSelected ? `${colors.primary}20` : colors.surface,
                                            color: isSelected ? colors.primaryLight : colors.textSecondary,
                                            fontSize: "14px",
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            transform: isSelected ? "scale(1.05)" : "none",
                                        }}
                                    >
                                        {interest}
                                    </button>
                                );
                            })}
                        </div>
                        {interests.length > 0 && (
                            <p style={{ color: colors.accent, fontSize: "14px", marginTop: "16px", fontWeight: 500 }}>
                                {interests.length} selected ✓
                            </p>
                        )}
                    </div>
                )}

                {/* Step 4: Goals */}
                {step === 4 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
                        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
                            What are you working towards?
                        </h1>
                        <p style={{ color: colors.textSecondary, fontSize: "16px", marginBottom: "24px" }}>
                            Add up to 5 goals you&apos;re working on
                        </p>

                        {/* Goal input */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                            <input
                                type="text"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value.slice(0, 80))}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } }}
                                placeholder="e.g. Run a marathon, Learn Spanish..."
                                style={{
                                    flex: 1,
                                    padding: "14px 18px",
                                    borderRadius: "14px",
                                    border: `2px solid ${colors.border}`,
                                    background: colors.surface,
                                    color: colors.textPrimary,
                                    fontSize: "15px",
                                    outline: "none",
                                }}
                            />
                            <button
                                onClick={addGoal}
                                disabled={!goalInput.trim() || goals.length >= 5}
                                style={{
                                    padding: "14px 20px",
                                    borderRadius: "14px",
                                    border: "none",
                                    background: goalInput.trim() && goals.length < 5
                                        ? colors.primary
                                        : colors.surfaceHover,
                                    color: goalInput.trim() && goals.length < 5
                                        ? "#fff"
                                        : colors.textMuted,
                                    fontSize: "15px",
                                    fontWeight: 600,
                                    cursor: goalInput.trim() && goals.length < 5 ? "pointer" : "not-allowed",
                                }}
                            >
                                Add
                            </button>
                        </div>

                        {/* Goal chips */}
                        {goals.length > 0 && (
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                                marginBottom: "16px",
                            }}>
                                {goals.map((goal, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                            padding: "12px 16px",
                                            background: colors.surface,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: "14px",
                                            textAlign: "left",
                                        }}
                                    >
                                        <span style={{ color: colors.accent, fontWeight: 700, fontSize: "16px" }}>🎯</span>
                                        <span style={{ flex: 1, fontSize: "15px", color: colors.textSecondary, lineHeight: 1.4 }}>
                                            {goal}
                                        </span>
                                        <button
                                            onClick={() => removeGoal(goal)}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: colors.textMuted,
                                                fontSize: "18px",
                                                cursor: "pointer",
                                                padding: "4px",
                                                lineHeight: 1,
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p style={{ color: colors.textMuted, fontSize: "13px", marginTop: "12px" }}>
                            Optional — you can always add these later
                        </p>
                    </div>
                )}

                {/* Step 5: Preview */}
                {step === 5 && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
                        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
                            Looking good!
                        </h1>
                        <p style={{ color: colors.textSecondary, fontSize: "16px", marginBottom: "32px" }}>
                            Here&apos;s your profile preview
                        </p>

                        {/* Profile card preview */}
                        <div style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "24px",
                            padding: "32px",
                            textAlign: "center",
                        }}>
                            {avatarType === "image" && avatarUrl ? (
                                <div style={{
                                    width: "100px",
                                    height: "100px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    border: `3px solid ${colors.primary}`,
                                    margin: "0 auto 16px",
                                    boxShadow: `0 0 30px ${colors.primary}40`,
                                }}>
                                    <Image src={avatarUrl} alt="Profile" width={100} height={100} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                                </div>
                            ) : (
                                <div style={{
                                    width: "100px",
                                    height: "100px",
                                    borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primaryLight}30)`,
                                    border: `3px solid ${colors.primary}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "48px",
                                    margin: "0 auto 16px",
                                    boxShadow: `0 0 30px ${colors.primary}40`,
                                }}>
                                    {avatar}
                                </div>
                            )}
                            <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>{displayName}</h2>
                            {bio && <p style={{ color: colors.textSecondary, fontSize: "14px", marginBottom: "16px", lineHeight: 1.5 }}>{bio}</p>}
                            {interests.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px" }}>
                                    {interests.slice(0, 6).map((interest) => (
                                        <span key={interest} style={{
                                            padding: "6px 12px",
                                            borderRadius: "12px",
                                            background: `${colors.primary}15`,
                                            color: colors.primaryLight,
                                            fontSize: "12px",
                                        }}>
                                            {interest}
                                        </span>
                                    ))}
                                    {interests.length > 6 && (
                                        <span style={{
                                            padding: "6px 12px",
                                            borderRadius: "12px",
                                            background: colors.surfaceHover,
                                            color: colors.textMuted,
                                            fontSize: "12px",
                                        }}>
                                            +{interests.length - 6}
                                        </span>
                                    )}
                                </div>
                            )}
                            {goals.length > 0 && (
                                <div style={{ marginTop: "16px" }}>
                                    <p style={{ color: colors.textMuted, fontSize: "12px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                                        Goals
                                    </p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {goals.map((goal, idx) => (
                                            <div key={idx} style={{
                                                padding: "8px 14px",
                                                borderRadius: "10px",
                                                background: `${colors.accent}10`,
                                                color: colors.accent,
                                                fontSize: "13px",
                                                textAlign: "left",
                                                display: "flex",
                                                gap: "8px",
                                                alignItems: "center",
                                            }}>
                                                <span>🎯</span> {goal}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation buttons */}
                <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
                    {step > 0 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            style={{
                                padding: "16px 24px",
                                borderRadius: "14px",
                                border: `1px solid ${colors.border}`,
                                background: "transparent",
                                color: colors.textSecondary,
                                fontSize: "16px",
                                fontWeight: 500,
                                cursor: "pointer",
                            }}
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (step < totalSteps - 1) {
                                handleNext();
                            } else {
                                handleComplete();
                            }
                        }}
                        disabled={!canProceed() || saving}
                        style={{
                            flex: 1,
                            padding: "16px 32px",
                            borderRadius: "14px",
                            border: "none",
                            background: canProceed()
                                ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`
                                : colors.surfaceHover,
                            color: canProceed() ? "#fff" : colors.textMuted,
                            fontSize: "16px",
                            fontWeight: 600,
                            cursor: canProceed() && !saving ? "pointer" : "not-allowed",
                            transition: "all 0.3s",
                            boxShadow: canProceed() ? `0 4px 20px ${colors.primary}40` : "none",
                        }}
                    >
                        {saving ? "Saving..." : step === totalSteps - 1 ? "Go to Dashboard 🚀" : "Continue →"}
                    </button>
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
            `}</style>
        </div>
    );
}
