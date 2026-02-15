"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { uploadProfileImage, deleteProfileImage, updateProfile } from "@/app/actions/profile";

import { colors } from "@/utils/design-tokens";

const availableAvatars = ["🧑‍💻", "👨‍🎨", "👩‍🔬", "🧑‍🚀", "👨‍🍳", "👩‍🎤", "🧑‍🏫", "👨‍⚕️", "👩‍💼", "🦸", "🧙", "🧛", "🧜‍♀️", "🧚", "🦊", "🐱", "🐶", "🦁", "🐼", "🦄"];

const availableInterests = [
    "🏃 Fitness & Health",
    "🎨 Art & Creativity",
    "📚 Learning & Education",
    "🧘 Self Improvement",
    "📈 Productivity & Career",
    "⚽ Sports",
    "💰 Hustling",
    "🚭 Habit Building",
    "🌅 Daily Routines",
];

export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [avatar, setAvatar] = useState("🧑‍💻");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [interests, setInterests] = useState<string[]>([]);
    const [goals, setGoals] = useState<string[]>([]);
    const [goalInput, setGoalInput] = useState("");
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [avatarType, setAvatarType] = useState<"emoji" | "image">("emoji");

    useEffect(() => {
        setMounted(true);
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push("/login");
                return;
            }

            setEmail(user.email || "");
            const metadata = user.user_metadata || {};
            setDisplayName(metadata.display_name || metadata.full_name || "");
            setUsername(metadata.username || "");
            setBio(metadata.bio || "");
            setAvatar(metadata.avatar || "🧑‍💻");
            setAvatarUrl(metadata.avatar_url || null);
            setInterests(metadata.interests || []);
            setGoals(metadata.goals || []);
            setAvatarType(metadata.avatar_url ? "image" : "emoji");
        } catch (err) {
            console.error("Error loading user data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            await updateProfile({
                display_name: displayName,
                username: username,
                bio: bio,
                avatar: avatarType === "emoji" ? avatar : undefined,
                avatar_url: avatarType === "image" ? (avatarUrl || undefined) : undefined,
                interests: interests,
                goals: goals.length > 0 ? goals : undefined,
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const publicUrl = await uploadProfileImage(formData);
            setAvatarUrl(publicUrl);
            setAvatarType("image");
            setShowAvatarPicker(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemoveImage = async () => {
        setUploading(true);
        setError(null);

        try {
            await deleteProfileImage();
            setAvatarUrl(null);
            setAvatarType("emoji");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
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

    const handleDeleteAccount = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

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
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "16px"
                }}>
                    <div style={{
                        width: "48px",
                        height: "48px",
                        border: `3px solid ${colors.border}`,
                        borderTopColor: colors.primary,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                    }} />
                    <span style={{ color: colors.textMuted }}>Loading settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: "100vh",
            background: colors.bg,
            color: colors.textPrimary,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Gradient mesh background */}
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

            <Navbar />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: "none" }}
                onChange={handleFileSelect}
            />

            {/* Main Content */}
            <div style={{
                maxWidth: "700px",
                margin: "0 auto",
                padding: "32px 24px 120px",
                paddingLeft: "88px",
                position: "relative",
                zIndex: 1,
            }}>
                {/* Header */}
                <div style={{ marginBottom: "32px" }}>
                    <h1 style={{
                        fontSize: "32px",
                        fontWeight: 800,
                        marginBottom: "8px",
                        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}>
                        Settings ⚙️
                    </h1>
                    <p style={{ color: colors.textSecondary, fontSize: "15px" }}>
                        Customize your profile and account preferences
                    </p>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div style={{
                        padding: "16px 20px",
                        marginBottom: "24px",
                        borderRadius: "12px",
                        background: "rgba(0, 217, 165, 0.1)",
                        border: `1px solid ${colors.accent}40`,
                        color: colors.accent,
                        fontSize: "14px",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        animation: "slideUp 0.3s ease",
                    }}>
                        ✅ Your changes have been saved successfully!
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: "16px 20px",
                        marginBottom: "24px",
                        borderRadius: "12px",
                        background: "rgba(255, 71, 87, 0.1)",
                        border: `1px solid ${colors.danger}40`,
                        color: colors.danger,
                        fontSize: "14px",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                    }}>
                        ❌ {error}
                    </div>
                )}

                {/* Profile Section */}
                <div style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "24px",
                    padding: "32px",
                    marginBottom: "24px",
                }}>
                    <h2 style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                    }}>
                        <span style={{ fontSize: "24px" }}>👤</span>
                        Profile
                    </h2>

                    {/* Avatar Section */}
                    <div style={{ marginBottom: "28px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "12px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: colors.textSecondary,
                        }}>
                            Profile Picture
                        </label>

                        {/* Avatar Type Toggle */}
                        <div style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "16px",
                        }}>
                            <button
                                onClick={() => setAvatarType("emoji")}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    border: avatarType === "emoji"
                                        ? `2px solid ${colors.primary}`
                                        : `1px solid ${colors.border}`,
                                    background: avatarType === "emoji"
                                        ? `${colors.primary}20`
                                        : "transparent",
                                    color: avatarType === "emoji"
                                        ? colors.primaryLight
                                        : colors.textSecondary,
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                😊 Emoji
                            </button>
                            <button
                                onClick={() => setAvatarType("image")}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    border: avatarType === "image"
                                        ? `2px solid ${colors.primary}`
                                        : `1px solid ${colors.border}`,
                                    background: avatarType === "image"
                                        ? `${colors.primary}20`
                                        : "transparent",
                                    color: avatarType === "image"
                                        ? colors.primaryLight
                                        : colors.textSecondary,
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                📷 Photo
                            </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                            {/* Avatar Preview */}
                            {avatarType === "image" && avatarUrl ? (
                                <div style={{ position: "relative" }}>
                                    <div style={{
                                        width: "100px",
                                        height: "100px",
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        border: `3px solid ${colors.primary}`,
                                        boxShadow: `0 0 30px ${colors.primary}40`,
                                    }}>
                                        <Image
                                            src={avatarUrl}
                                            alt="Profile"
                                            width={100}
                                            height={100}
                                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleRemoveImage}
                                        disabled={uploading}
                                        style={{
                                            position: "absolute",
                                            top: "-8px",
                                            right: "-8px",
                                            width: "28px",
                                            height: "28px",
                                            borderRadius: "50%",
                                            border: "none",
                                            background: colors.danger,
                                            color: "#fff",
                                            fontSize: "14px",
                                            cursor: uploading ? "not-allowed" : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                        title="Remove image"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : avatarType === "emoji" ? (
                                <button
                                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                    style={{
                                        width: "100px",
                                        height: "100px",
                                        borderRadius: "50%",
                                        background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primaryLight}30)`,
                                        border: `3px solid ${colors.primary}`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "48px",
                                        cursor: "pointer",
                                        transition: "all 0.3s",
                                        boxShadow: showAvatarPicker ? `0 0 30px ${colors.primary}40` : "none",
                                    }}
                                >
                                    {avatar}
                                </button>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    style={{
                                        width: "100px",
                                        height: "100px",
                                        borderRadius: "50%",
                                        background: colors.bg,
                                        border: `2px dashed ${colors.border}`,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "4px",
                                        cursor: uploading ? "not-allowed" : "pointer",
                                        transition: "all 0.3s",
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
                                            <span style={{ fontSize: "24px" }}>📷</span>
                                            <span style={{ fontSize: "11px", color: colors.textMuted }}>Upload</span>
                                        </>
                                    )}
                                </button>
                            )}

                            <div style={{ flex: 1 }}>
                                {avatarType === "emoji" && (
                                    <span style={{ fontSize: "14px", color: colors.textMuted }}>
                                        Click to choose an emoji avatar
                                    </span>
                                )}
                                {avatarType === "image" && !avatarUrl && (
                                    <div>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            style={{
                                                padding: "12px 20px",
                                                borderRadius: "10px",
                                                border: `1px solid ${colors.border}`,
                                                background: "transparent",
                                                color: colors.textPrimary,
                                                fontSize: "14px",
                                                fontWeight: 500,
                                                cursor: uploading ? "not-allowed" : "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                            }}
                                        >
                                            {uploading ? "Uploading..." : "📤 Upload Photo"}
                                        </button>
                                        <p style={{
                                            fontSize: "12px",
                                            color: colors.textMuted,
                                            marginTop: "8px"
                                        }}>
                                            Max 5MB. JPEG, PNG, GIF, or WebP.
                                        </p>
                                    </div>
                                )}
                                {avatarType === "image" && avatarUrl && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        style={{
                                            padding: "10px 16px",
                                            borderRadius: "8px",
                                            border: `1px solid ${colors.border}`,
                                            background: "transparent",
                                            color: colors.textSecondary,
                                            fontSize: "13px",
                                            cursor: uploading ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {uploading ? "Uploading..." : "Change Photo"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Emoji Picker Grid */}
                        {avatarType === "emoji" && showAvatarPicker && (
                            <div style={{
                                marginTop: "16px",
                                padding: "20px",
                                background: colors.bg,
                                borderRadius: "16px",
                                border: `1px solid ${colors.border}`,
                                display: "grid",
                                gridTemplateColumns: "repeat(10, 1fr)",
                                gap: "8px",
                                animation: "fadeIn 0.2s ease",
                            }}>
                                {availableAvatars.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            setAvatar(emoji);
                                            setShowAvatarPicker(false);
                                        }}
                                        style={{
                                            width: "44px",
                                            height: "44px",
                                            borderRadius: "10px",
                                            border: avatar === emoji
                                                ? `2px solid ${colors.primary}`
                                                : `1px solid ${colors.border}`,
                                            background: avatar === emoji
                                                ? `${colors.primary}20`
                                                : "transparent",
                                            fontSize: "24px",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Display Name */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: colors.textSecondary,
                        }}>
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your display name"
                            style={{
                                width: "100%",
                                padding: "14px 18px",
                                borderRadius: "12px",
                                border: `1px solid ${colors.border}`,
                                background: colors.bg,
                                color: colors.textPrimary,
                                fontSize: "15px",
                                transition: "border-color 0.2s",
                                outline: "none",
                            }}
                        />
                    </div>

                    {/* Username */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: colors.textSecondary,
                        }}>
                            Username
                        </label>
                        <div style={{ position: "relative" }}>
                            <span style={{
                                position: "absolute",
                                left: "18px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: colors.textMuted,
                                fontSize: "15px",
                            }}>
                                @
                            </span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                placeholder="username"
                                style={{
                                    width: "100%",
                                    padding: "14px 18px 14px 36px",
                                    borderRadius: "12px",
                                    border: `1px solid ${colors.border}`,
                                    background: colors.bg,
                                    color: colors.textPrimary,
                                    fontSize: "15px",
                                    transition: "border-color 0.2s",
                                    outline: "none",
                                }}
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: colors.textSecondary,
                        }}>
                            <span>Bio</span>
                            <span style={{
                                color: bio.length > 150 ? colors.danger : colors.textMuted,
                                fontWeight: 400,
                            }}>
                                {bio.length}/160
                            </span>
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value.slice(0, 160))}
                            placeholder="Tell us about yourself..."
                            rows={3}
                            style={{
                                width: "100%",
                                padding: "14px 18px",
                                borderRadius: "12px",
                                border: `1px solid ${colors.border}`,
                                background: colors.bg,
                                color: colors.textPrimary,
                                fontSize: "15px",
                                resize: "none",
                                lineHeight: 1.5,
                                outline: "none",
                            }}
                        />
                    </div>
                </div>

                {/* Interests Section */}
                <div style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "24px",
                    padding: "32px",
                    marginBottom: "24px",
                }}>
                    <h2 style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        marginBottom: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                    }}>
                        <span style={{ fontSize: "24px" }}>✨</span>
                        Interests
                    </h2>
                    <p style={{
                        color: colors.textMuted,
                        fontSize: "14px",
                        marginBottom: "20px"
                    }}>
                        Select your interests to help us personalize your experience
                    </p>

                    <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px"
                    }}>
                        {availableInterests.map((interest) => {
                            const isSelected = interests.includes(interest);
                            return (
                                <button
                                    key={interest}
                                    onClick={() => toggleInterest(interest)}
                                    style={{
                                        padding: "10px 18px",
                                        borderRadius: "20px",
                                        border: isSelected
                                            ? `2px solid ${colors.primary}`
                                            : `1px solid ${colors.border}`,
                                        background: isSelected
                                            ? `${colors.primary}20`
                                            : "transparent",
                                        color: isSelected
                                            ? colors.primaryLight
                                            : colors.textSecondary,
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    {interest}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Goals Section */}
                <div style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "24px",
                    padding: "0",
                    marginBottom: "24px",
                    overflow: "hidden",
                    position: "relative",
                }}>
                    {/* Gradient header */}
                    <div style={{
                        padding: "24px 28px 20px",
                        background: `linear-gradient(135deg, rgba(108, 92, 231, 0.15) 0%, rgba(0, 217, 165, 0.08) 100%)`,
                        borderBottom: `1px solid ${colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "12px",
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "20px",
                                boxShadow: `0 4px 16px ${colors.primary}40`,
                            }}>
                                🎯
                            </div>
                            <div>
                                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Goals</h2>
                                <p style={{ fontSize: "12px", color: colors.textMuted, margin: 0, marginTop: "2px" }}>
                                    What are you working towards? (up to 5)
                                </p>
                            </div>
                        </div>
                        <span style={{
                            fontSize: "12px",
                            color: goals.length >= 5 ? colors.accent : colors.textMuted,
                            background: goals.length >= 5 ? `${colors.accent}15` : "transparent",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontWeight: 600,
                        }}>
                            {goals.length}/5
                        </span>
                    </div>

                    <div style={{ padding: "20px 24px 24px" }}>
                        {/* Goal input */}
                        <div style={{
                            display: "flex",
                            gap: "10px",
                            marginBottom: goals.length > 0 ? "20px" : "0",
                        }}>
                            <div style={{
                                flex: 1,
                                position: "relative",
                            }}>
                                <input
                                    type="text"
                                    value={goalInput}
                                    onChange={(e) => setGoalInput(e.target.value.slice(0, 80))}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } }}
                                    placeholder="e.g. Run a marathon, Learn Spanish..."
                                    disabled={goals.length >= 5}
                                    style={{
                                        width: "100%",
                                        padding: "14px 18px",
                                        borderRadius: "14px",
                                        border: `1px solid ${colors.border}`,
                                        background: colors.bg,
                                        color: colors.textPrimary,
                                        fontSize: "15px",
                                        outline: "none",
                                        transition: "border-color 0.2s",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>
                            <button
                                onClick={addGoal}
                                disabled={!goalInput.trim() || goals.length >= 5}
                                style={{
                                    padding: "14px 22px",
                                    borderRadius: "14px",
                                    border: "none",
                                    background: goalInput.trim() && goals.length < 5
                                        ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`
                                        : colors.surfaceHover,
                                    color: goalInput.trim() && goals.length < 5
                                        ? "#fff"
                                        : colors.textMuted,
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    cursor: goalInput.trim() && goals.length < 5 ? "pointer" : "not-allowed",
                                    transition: "all 0.25s",
                                    boxShadow: goalInput.trim() && goals.length < 5
                                        ? `0 4px 16px ${colors.primary}40`
                                        : "none",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                + Add
                            </button>
                        </div>

                        {/* Goal list */}
                        {goals.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {goals.map((goal, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "14px",
                                            padding: "14px 18px",
                                            background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(108, 92, 231, 0.04) 100%)`,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: "14px",
                                            transition: "all 0.25s ease",
                                        }}
                                    >
                                        {/* Step number */}
                                        <div style={{
                                            width: "28px",
                                            height: "28px",
                                            borderRadius: "50%",
                                            background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primaryLight}30)`,
                                            border: `2px solid ${colors.primary}60`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "12px",
                                            fontWeight: 800,
                                            color: colors.primaryLight,
                                            flexShrink: 0,
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <span style={{
                                            flex: 1,
                                            fontSize: "15px",
                                            color: colors.textPrimary,
                                            lineHeight: 1.4,
                                            fontWeight: 500,
                                        }}>
                                            {goal}
                                        </span>
                                        <button
                                            onClick={() => removeGoal(goal)}
                                            style={{
                                                width: "28px",
                                                height: "28px",
                                                borderRadius: "50%",
                                                background: `${colors.danger}15`,
                                                border: `1px solid ${colors.danger}30`,
                                                color: colors.danger,
                                                fontSize: "14px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                lineHeight: 1,
                                                transition: "all 0.2s",
                                                flexShrink: 0,
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Subtle bottom glow */}
                    <div style={{
                        position: "absolute",
                        bottom: "-30px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "60%",
                        height: "60px",
                        background: `radial-gradient(ellipse, ${colors.primary}15 0%, transparent 70%)`,
                        pointerEvents: "none",
                    }} />
                </div>

                {/* Account Section */}
                <div style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "24px",
                    padding: "32px",
                    marginBottom: "32px",
                }}>
                    <h2 style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                    }}>
                        <span style={{ fontSize: "24px" }}>🔐</span>
                        Account
                    </h2>

                    {/* Email */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: colors.textSecondary,
                        }}>
                            Email Address
                        </label>
                        <div style={{
                            padding: "14px 18px",
                            borderRadius: "12px",
                            border: `1px solid ${colors.border}`,
                            background: colors.bg,
                            color: colors.textMuted,
                            fontSize: "15px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}>
                            <span>{email}</span>
                            <span style={{
                                fontSize: "12px",
                                padding: "4px 10px",
                                background: `${colors.accent}20`,
                                color: colors.accent,
                                borderRadius: "8px",
                            }}>
                                Verified
                            </span>
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: "24px" }}>
                        <label style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: colors.textSecondary,
                        }}>
                            Password
                        </label>
                        <Link
                            href="/update-password"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 20px",
                                borderRadius: "10px",
                                border: `1px solid ${colors.border}`,
                                background: "transparent",
                                color: colors.textPrimary,
                                fontSize: "14px",
                                fontWeight: 500,
                                textDecoration: "none",
                                transition: "all 0.2s",
                            }}
                        >
                            🔑 Change Password
                        </Link>
                    </div>

                    {/* Danger Zone */}
                    <div style={{
                        padding: "20px",
                        borderRadius: "12px",
                        border: `1px solid ${colors.danger}30`,
                        background: `${colors.danger}10`,
                    }}>
                        <h3 style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: colors.danger,
                            marginBottom: "8px",
                        }}>
                            Danger Zone
                        </h3>
                        <p style={{
                            fontSize: "13px",
                            color: colors.textMuted,
                            marginBottom: "16px"
                        }}>
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            style={{
                                padding: "10px 18px",
                                borderRadius: "8px",
                                border: `1px solid ${colors.danger}`,
                                background: "transparent",
                                color: colors.danger,
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            Delete Account
                        </button>
                    </div>
                </div >

                {/* Save Button */}
                < button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        width: "100%",
                        padding: "18px",
                        borderRadius: "14px",
                        border: "none",
                        background: saving
                            ? colors.border
                            : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                        color: "#fff",
                        fontSize: "16px",
                        fontWeight: 700,
                        cursor: saving ? "not-allowed" : "pointer",
                        transition: "all 0.3s",
                        boxShadow: saving ? "none" : `0 8px 32px ${colors.primary}40`,
                    }}
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button >
            </div >

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && (
                    <div style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.8)",
                        backdropFilter: "blur(8px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "24px",
                    }}>
                        <div style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "24px",
                            padding: "32px",
                            maxWidth: "400px",
                            width: "100%",
                            animation: "scaleIn 0.2s ease",
                        }}>
                            <div style={{
                                fontSize: "48px",
                                textAlign: "center",
                                marginBottom: "16px"
                            }}>
                                ⚠️
                            </div>
                            <h3 style={{
                                fontSize: "20px",
                                fontWeight: 700,
                                textAlign: "center",
                                marginBottom: "12px",
                            }}>
                                Delete Account?
                            </h3>
                            <p style={{
                                fontSize: "14px",
                                color: colors.textSecondary,
                                textAlign: "center",
                                marginBottom: "28px",
                                lineHeight: 1.6,
                            }}>
                                This action cannot be undone. All your data, including posts, groups, and achievements will be permanently deleted.
                            </p>
                            <div style={{
                                display: "flex",
                                gap: "12px"
                            }}>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: "14px",
                                        borderRadius: "10px",
                                        border: `1px solid ${colors.border}`,
                                        background: "transparent",
                                        color: colors.textPrimary,
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    style={{
                                        flex: 1,
                                        padding: "14px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: colors.danger,
                                        color: "#fff",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @media (max-width: 1023px) {
                    .settings-content {
                        padding-left: 24px !important;
                    }
                }
            `}</style>
        </div >
    );
}
