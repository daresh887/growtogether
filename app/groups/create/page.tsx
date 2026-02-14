"use client";

import { createGroup, uploadGroupIcon } from "@/app/actions/groups";
import { compressImage } from "@/utils/compressImage";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const DEFAULT_RULES = [
    "Post your daily progress every day",
    "Be supportive and encouraging to others",
    "No spam or self-promotion",
];

const EMOJI_OPTIONS = ["🏃", "💻", "📚", "🎨", "💪", "🧘", "✍️", "🎵", "💼", "🍳", "📸", "🌱", "🚀", "🎯", "🧠", "🎮", "🏋️", "🎸", "📐", "🌍"];

const CATEGORIES = [
    { id: "fitness", label: "Fitness", emoji: "💪", color: "#FF6B6B" },
    { id: "learning", label: "Learning", emoji: "📚", color: "#4ECDC4" },
    { id: "coding", label: "Coding", emoji: "💻", color: "#6C5CE7" },
    { id: "art", label: "Art", emoji: "🎨", color: "#FD79A8" },
    { id: "writing", label: "Writing", emoji: "✍️", color: "#00B894" },
    { id: "music", label: "Music", emoji: "🎵", color: "#E17055" },
    { id: "business", label: "Business", emoji: "💼", color: "#0984E3" },
    { id: "wellness", label: "Wellness", emoji: "🧘", color: "#00D9A5" },
    { id: "other", label: "Other", emoji: "🎯", color: "#A29BFE" },
];

import { colors } from "@/utils/design-tokens";

export default function CreateGroupPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        emoji: string;
        category: string;

        requireDailyPost: boolean;
        contractText: string;
        requireSignature: boolean;
        primaryColor: string;
        glowColor: string;
        cardStyle: "minimal" | "glassy" | "neon" | "gradient";
        bannerType: "solid" | "gradient" | "animated";
        gradientColors: string[];
        groupDNA: {
            vibe: string;
            values: string[];
            motto: string;
        };
        iconUrl?: string;
    }>({
        name: "",
        description: "",
        emoji: "🎯",
        category: "fitness",

        requireDailyPost: true,
        contractText: "I commit to showing up daily, supporting my fellow members, and holding myself accountable to this group.",
        requireSignature: true,
        // Theme settings
        primaryColor: "#6C5CE7",
        glowColor: "#A29BFE",
        cardStyle: "glassy",
        bannerType: "gradient",
        gradientColors: ["#6C5CE7", "#A29BFE"],
        // Group DNA - core identity traits
        groupDNA: {
            vibe: "💪 Hustle & Grind",
            values: ["Growth Mindset", "Consistency", "Support"],
            motto: "",
        },
        iconUrl: undefined
    });

    const [rules, setRules] = useState<string[]>(DEFAULT_RULES);
    const [newRule, setNewRule] = useState("");
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);


    const handleAddRule = () => {
        if (newRule.trim() && rules.length < 8) {
            setRules([...rules, newRule.trim()]);
            setNewRule("");
        }
    };

    const handleRemoveRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingIcon(true);
        setFormError(null);
        try {
            // Compress image before upload
            const compressedFile = await compressImage(file, { maxWidth: 800, quality: 0.8 });

            const formData = new FormData();
            formData.append("file", compressedFile);
            const url = await uploadGroupIcon(formData);
            setFormData(prev => ({ ...prev, iconUrl: url }));
        } catch (error) {
            console.error("Upload failed", error);
            setFormError("Failed to upload image. Please try again.");
        } finally {
            setUploadingIcon(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        try {
            await createGroup({
                name: formData.name,
                description: formData.description,
                emoji: formData.emoji,
                category: formData.category,
                rules: rules,
                settings: {
                    requireDailyPost: formData.requireDailyPost,

                },
                contract: {
                    text: formData.contractText,
                    requireSignature: formData.requireSignature,
                },
                theme: {
                    primaryColor: formData.primaryColor,
                    glowColor: formData.glowColor,
                    cardStyle: formData.cardStyle,
                    bannerType: formData.bannerType,
                    gradientColors: formData.gradientColors,
                    iconUrl: formData.iconUrl,
                },
                groupDNA: formData.groupDNA,
            });

            router.push("/groups");
        } catch (error) {
            console.error("Error creating group:", error);
            setFormError("Failed to create group. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const canProceed = () => {
        if (currentStep === 1) return formData.name.trim().length >= 3 && formData.description.trim().length >= 10;
        if (currentStep === 2) return rules.length >= 1;
        if (currentStep === 3) return formData.contractText.trim().length >= 10;
        if (currentStep === 4) return formData.groupDNA.motto.trim().length >= 5; // Manifesto step
        return true;
    };

    const selectedCategory = CATEGORIES.find(c => c.id === formData.category);

    return (
        <div style={{
            minHeight: "100vh",
            background: colors.bg,
            color: colors.textPrimary,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Animated gradient backgrounds */}
            <div style={{
                position: "absolute",
                top: "-200px",
                right: "-200px",
                width: "700px",
                height: "700px",
                background: `radial-gradient(circle, ${selectedCategory?.color || colors.primary}20 0%, transparent 60%)`,
                pointerEvents: "none",
                transition: "background 0.5s ease",
            }} />
            <div style={{
                position: "absolute",
                bottom: "-150px",
                left: "-150px",
                width: "500px",
                height: "500px",
                background: `radial-gradient(circle, rgba(0, 217, 165, 0.1) 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />

            <Navbar />

            {/* Main Content */}
            <div style={{
                maxWidth: "1100px",
                margin: "0 auto",
                padding: "32px 24px 120px",
                paddingLeft: "88px",
                position: "relative",
                zIndex: 1,
            }}>
                {/* Header */}
                <div style={{ marginBottom: "32px" }}>
                    <Link
                        href="/groups"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            color: colors.textMuted,
                            textDecoration: "none",
                            fontSize: "14px",
                            marginBottom: "16px",
                        }}
                    >
                        ← Back to explore
                    </Link>
                    <h1 style={{
                        fontSize: "40px",
                        fontWeight: 800,
                        marginBottom: "8px",
                        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}>
                        Create Your Group ✨
                    </h1>
                    <p style={{ color: colors.textSecondary, fontSize: "16px" }}>
                        Build an accountability community in 5 simple steps
                    </p>
                </div>

                {/* Progress Steps */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "40px",
                }}>
                    {[
                        { num: 1, label: "Basics" },
                        { num: 2, label: "Rules" },
                        { num: 3, label: "Contract" },
                        { num: 4, label: "Manifesto" },
                        { num: 5, label: "Settings" },
                    ].map((step, idx) => (
                        <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
                            <button
                                type="button"
                                onClick={() => step.num <= currentStep && setCurrentStep(step.num)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "12px 20px",
                                    borderRadius: "14px",
                                    border: `2px solid ${currentStep === step.num ? colors.primary : currentStep > step.num ? colors.accent : colors.border}`,
                                    background: currentStep === step.num
                                        ? `linear-gradient(135deg, ${colors.primary}20, ${colors.primaryLight}10)`
                                        : currentStep > step.num
                                            ? `${colors.accent}15`
                                            : colors.surface,
                                    color: currentStep >= step.num ? colors.textPrimary : colors.textMuted,
                                    cursor: step.num <= currentStep ? "pointer" : "default",
                                    transition: "all 0.3s",
                                }}
                            >
                                <div style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    background: currentStep > step.num
                                        ? colors.accent
                                        : currentStep === step.num
                                            ? colors.primary
                                            : colors.border,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "14px",
                                    fontWeight: 700,
                                }}>
                                    {currentStep > step.num ? "✓" : step.num}
                                </div>
                                <span style={{ fontWeight: 600, fontSize: "14px" }}>{step.label}</span>
                            </button>
                            {idx < 4 && (
                                <div style={{
                                    width: "40px",
                                    height: "2px",
                                    background: currentStep > step.num ? colors.accent : colors.border,
                                    margin: "0 8px",
                                    transition: "background 0.3s",
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px" }}>
                    {/* Form Area */}
                    <div>
                        <div>
                            {/* Step 1: Basics */}
                            {currentStep === 1 && (
                                <div style={{
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "24px",
                                    padding: "32px",
                                }}>
                                    <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "24px" }}>
                                        📝 Basic Information
                                    </h2>

                                    {/* Group Name */}
                                    <div style={{ marginBottom: "24px" }}>
                                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                                            Group Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Morning Runners, Code Daily"
                                            style={{
                                                width: "100%",
                                                padding: "14px 18px",
                                                background: colors.bg,
                                                border: `2px solid ${formData.name.length >= 3 ? colors.accent : colors.border}`,
                                                borderRadius: "14px",
                                                color: colors.textPrimary,
                                                fontSize: "16px",
                                                outline: "none",
                                                transition: "border-color 0.2s",
                                            }}
                                        />
                                        <div style={{ fontSize: "12px", color: formData.name.length >= 3 ? colors.accent : colors.textMuted, marginTop: "6px" }}>
                                            {formData.name.length}/50 characters {formData.name.length >= 3 && "✓"}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div style={{ marginBottom: "24px" }}>
                                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                                            Short Bio *
                                        </label>
                                        <textarea
                                            required
                                            maxLength={160}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="A short description of what this group is about..."
                                            style={{
                                                width: "100%",
                                                minHeight: "70px",
                                                padding: "14px 18px",
                                                background: colors.bg,
                                                border: `2px solid ${formData.description.length >= 10 ? colors.accent : colors.border}`,
                                                borderRadius: "14px",
                                                color: colors.textPrimary,
                                                fontSize: "16px",
                                                fontFamily: "inherit",
                                                resize: "vertical",
                                                outline: "none",
                                                transition: "border-color 0.2s",
                                            }}
                                        />
                                        <div style={{
                                            fontSize: "12px",
                                            color: formData.description.length >= 140 ? colors.accentAlt : colors.textMuted,
                                            marginTop: "6px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                        }}>
                                            <span>{formData.description.length >= 10 && "✓"}</span>
                                            <span>{formData.description.length}/160</span>
                                        </div>
                                    </div>

                                    {/* Icon Type Toggle */}
                                    <div style={{ marginBottom: "20px" }}>
                                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
                                            Group Icon
                                        </label>
                                        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, emoji: prev.emoji || "🎯", iconUrl: undefined }))}
                                                style={{
                                                    flex: 1,
                                                    padding: "12px",
                                                    borderRadius: "12px",
                                                    border: `2px solid ${!formData.iconUrl ? colors.primary : colors.border}`,
                                                    background: !formData.iconUrl ? `${colors.primary}15` : colors.bg,
                                                    color: !formData.iconUrl ? colors.primary : colors.textSecondary,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                    transition: "all 0.2s"
                                                }}
                                            >
                                                Emoji
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, iconUrl: prev.iconUrl || "", emoji: "" }))}
                                                style={{
                                                    flex: 1,
                                                    padding: "12px",
                                                    borderRadius: "12px",
                                                    border: `2px solid ${formData.iconUrl !== undefined ? colors.primary : colors.border}`,
                                                    background: formData.iconUrl !== undefined ? `${colors.primary}15` : colors.bg,
                                                    color: formData.iconUrl !== undefined ? colors.primary : colors.textSecondary,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                    transition: "all 0.2s"
                                                }}
                                            >
                                                Upload Image
                                            </button>
                                        </div>

                                        {/* Emoji Picker */}
                                        {formData.iconUrl === undefined ? (
                                            <div style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: "8px",
                                            }}>
                                                {EMOJI_OPTIONS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, emoji })}
                                                        onMouseEnter={() => setHoveredEmoji(emoji)}
                                                        onMouseLeave={() => setHoveredEmoji(null)}
                                                        style={{
                                                            width: "52px",
                                                            height: "52px",
                                                            borderRadius: "14px",
                                                            border: `2px solid ${formData.emoji === emoji ? colors.primary : hoveredEmoji === emoji ? colors.border : "transparent"}`,
                                                            background: formData.emoji === emoji ? `${colors.primary}20` : colors.bg,
                                                            fontSize: "28px",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s",
                                                            transform: formData.emoji === emoji || hoveredEmoji === emoji ? "scale(1.1)" : "scale(1)",
                                                        }}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Image Upload */
                                            <div style={{
                                                border: `2px dashed ${colors.border}`,
                                                borderRadius: "16px",
                                                padding: "32px",
                                                textAlign: "center",
                                                background: colors.bg,
                                                position: "relative",
                                                overflow: "hidden"
                                            }}>
                                                {uploadingIcon ? (
                                                    <div style={{ color: colors.textMuted }}>Uploading...</div>
                                                ) : formData.iconUrl ? (
                                                    <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto" }}>
                                                        <img
                                                            src={formData.iconUrl}
                                                            alt="Group Icon"
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover",
                                                                borderRadius: "16px",
                                                                border: `2px solid ${colors.border}`
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, iconUrl: "" })}
                                                            style={{
                                                                position: "absolute",
                                                                top: -10,
                                                                right: -10,
                                                                background: colors.surface,
                                                                border: `1px solid ${colors.border}`,
                                                                borderRadius: "50%",
                                                                width: "30px",
                                                                height: "30px",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                fontSize: "14px"
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label style={{ cursor: "pointer", display: "block" }}>
                                                        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📷</div>
                                                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Click to upload</div>
                                                        <div style={{ fontSize: "13px", color: colors.textMuted }}>JPG, PNG up to 5MB</div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            style={{ display: "none" }}
                                                            onChange={handleIconUpload}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
                                            Category *
                                        </label>
                                        <div style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(3, 1fr)",
                                            gap: "10px",
                                        }}>
                                            {CATEGORIES.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, category: cat.id })}
                                                    style={{
                                                        padding: "14px",
                                                        borderRadius: "14px",
                                                        border: `2px solid ${formData.category === cat.id ? cat.color : colors.border}`,
                                                        background: formData.category === cat.id ? `${cat.color}15` : colors.bg,
                                                        color: formData.category === cat.id ? cat.color : colors.textSecondary,
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "8px",
                                                        transition: "all 0.2s",
                                                    }}
                                                >
                                                    <span style={{ fontSize: "20px" }}>{cat.emoji}</span>
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Rules */}
                            {currentStep === 2 && (
                                <div style={{
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "24px",
                                    padding: "32px",
                                }}>
                                    <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
                                        📜 Group Rules
                                    </h2>
                                    <p style={{ color: colors.textSecondary, fontSize: "14px", marginBottom: "24px" }}>
                                        Define what members must follow. Drag to reorder.
                                    </p>

                                    {/* Rules List */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                                        {rules.map((rule, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                    padding: "14px 18px",
                                                    background: colors.bg,
                                                    borderRadius: "14px",
                                                    border: `1px solid ${colors.border}`,
                                                }}
                                            >
                                                <div style={{
                                                    width: "28px",
                                                    height: "28px",
                                                    borderRadius: "8px",
                                                    background: `${colors.primary}20`,
                                                    color: colors.primary,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 700,
                                                    fontSize: "14px",
                                                    flexShrink: 0,
                                                }}>
                                                    {idx + 1}
                                                </div>
                                                <span style={{ flex: 1, fontSize: "15px" }}>{rule}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRule(idx)}
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: "8px",
                                                        border: "none",
                                                        background: `${colors.accentAlt}15`,
                                                        color: colors.accentAlt,
                                                        fontSize: "12px",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        transition: "all 0.2s",
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Rule */}
                                    {rules.length < 8 && (
                                        <div style={{ display: "flex", gap: "10px" }}>
                                            <input
                                                type="text"
                                                value={newRule}
                                                onChange={(e) => setNewRule(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleAddRule();
                                                    }
                                                }}
                                                placeholder="Add a new rule..."
                                                style={{
                                                    flex: 1,
                                                    padding: "14px 18px",
                                                    background: colors.bg,
                                                    border: `2px solid ${colors.border}`,
                                                    borderRadius: "14px",
                                                    color: colors.textPrimary,
                                                    fontSize: "15px",
                                                    outline: "none",
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddRule}
                                                disabled={!newRule.trim()}
                                                style={{
                                                    padding: "14px 24px",
                                                    borderRadius: "14px",
                                                    border: "none",
                                                    background: newRule.trim() ? colors.primary : colors.border,
                                                    color: newRule.trim() ? "#fff" : colors.textMuted,
                                                    fontWeight: 700,
                                                    fontSize: "14px",
                                                    cursor: newRule.trim() ? "pointer" : "not-allowed",
                                                    transition: "all 0.2s",
                                                }}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ marginTop: "12px", fontSize: "12px", color: rules.length >= 6 ? colors.accentAlt : colors.textMuted }}>
                                        {rules.length}/8 rules {rules.length >= 6 && "(almost full!)"}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Contract */}
                            {currentStep === 3 && (
                                <div style={{
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "24px",
                                    padding: "32px",
                                }}>
                                    <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
                                        📝 Commitment Contract
                                    </h2>
                                    <p style={{ color: colors.textSecondary, fontSize: "14px", marginBottom: "24px" }}>
                                        Write the commitment members must sign when joining
                                    </p>

                                    {/* Contract Text */}
                                    <div style={{ marginBottom: "24px" }}>
                                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                                            Contract Text *
                                        </label>
                                        <textarea
                                            value={formData.contractText}
                                            onChange={(e) => setFormData({ ...formData, contractText: e.target.value })}
                                            placeholder="Write the commitment statement members will sign..."
                                            style={{
                                                width: "100%",
                                                minHeight: "120px",
                                                padding: "16px 18px",
                                                background: colors.bg,
                                                border: `2px solid ${formData.contractText.length >= 10 ? colors.accent : colors.border}`,
                                                borderRadius: "14px",
                                                color: colors.textPrimary,
                                                fontSize: "16px",
                                                fontFamily: "inherit",
                                                resize: "vertical",
                                                outline: "none",
                                                lineHeight: 1.6,
                                                transition: "border-color 0.2s",
                                            }}
                                        />
                                        <div style={{
                                            fontSize: "12px",
                                            color: colors.textMuted,
                                            marginTop: "6px",
                                            display: "flex",
                                            justifyContent: "flex-end",
                                        }}>
                                            {formData.contractText.length} characters
                                        </div>
                                    </div>

                                    {/* Require Signature Toggle */}
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "20px",
                                        background: colors.bg,
                                        borderRadius: "16px",
                                        border: `1px solid ${colors.border}`,
                                        marginBottom: "24px",
                                    }}>
                                        <div>
                                            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                                                ✍️ Require Hand-Drawn Signature
                                            </div>
                                            <div style={{ fontSize: "13px", color: colors.textMuted }}>
                                                Members must sign with their finger or mouse
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, requireSignature: !formData.requireSignature })}
                                            style={{
                                                width: "56px",
                                                height: "32px",
                                                borderRadius: "16px",
                                                border: "none",
                                                background: formData.requireSignature ? colors.accent : colors.border,
                                                cursor: "pointer",
                                                position: "relative",
                                                transition: "background 0.3s",
                                            }}
                                        >
                                            <div style={{
                                                width: "24px",
                                                height: "24px",
                                                borderRadius: "50%",
                                                background: "#fff",
                                                position: "absolute",
                                                top: "4px",
                                                left: formData.requireSignature ? "28px" : "4px",
                                                transition: "left 0.3s",
                                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                            }} />
                                        </button>
                                    </div>

                                    {/* Contract Preview */}
                                    <div style={{
                                        background: `linear-gradient(135deg, ${colors.bg}, ${colors.primary}08)`,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: "16px",
                                        padding: "24px",
                                    }}>
                                        <div style={{ fontSize: "12px", color: colors.textMuted, marginBottom: "12px", fontWeight: 600 }}>
                                            📋 PREVIEW
                                        </div>
                                        <p style={{
                                            fontSize: "15px",
                                            color: colors.textSecondary,
                                            fontStyle: "italic",
                                            lineHeight: 1.7,
                                            margin: 0,
                                        }}>
                                            "{formData.contractText || "Your contract text will appear here..."}"
                                        </p>
                                        {formData.requireSignature && (
                                            <div style={{
                                                marginTop: "16px",
                                                padding: "16px",
                                                border: `2px dashed ${colors.border}`,
                                                borderRadius: "12px",
                                                textAlign: "center",
                                                color: colors.textMuted,
                                                fontSize: "13px",
                                            }}>
                                                ✍️ Signature pad will appear here
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Manifesto */}
                            {currentStep === 4 && (
                                <div style={{
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "24px",
                                    padding: "32px",
                                }}>
                                    <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
                                        📜 Group Manifesto
                                    </h2>
                                    <p style={{ color: colors.textSecondary, fontSize: "14px", marginBottom: "24px" }}>
                                        Define your group's soul — this is what members will see and feel
                                    </p>

                                    {/* Motto */}
                                    <div style={{ marginBottom: "24px" }}>
                                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                                            ✨ Manifesto / Motto *
                                        </label>
                                        <textarea
                                            value={formData.groupDNA.motto}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                groupDNA: { ...formData.groupDNA, motto: e.target.value }
                                            })}
                                            placeholder="Write your group's manifesto... e.g., 'We show up every day, no excuses. We push each other to be better. We celebrate wins and learn from failures.'"
                                            style={{
                                                width: "100%",
                                                minHeight: "100px",
                                                padding: "16px 18px",
                                                background: colors.bg,
                                                border: `2px solid ${formData.groupDNA.motto.length >= 5 ? colors.accent : colors.border}`,
                                                borderRadius: "14px",
                                                color: colors.textPrimary,
                                                fontSize: "16px",
                                                fontFamily: "inherit",
                                                resize: "vertical",
                                                outline: "none",
                                                lineHeight: 1.6,
                                                transition: "border-color 0.2s",
                                            }}
                                        />
                                        <div style={{ fontSize: "12px", color: formData.groupDNA.motto.length >= 5 ? colors.accent : colors.textMuted, marginTop: "6px" }}>
                                            {formData.groupDNA.motto.length >= 5 && "✓"} This is the heart of your group
                                        </div>
                                    </div>

                                    {/* Vibe */}
                                    <div style={{ marginBottom: "24px" }}>
                                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
                                            🎭 Group Vibe
                                        </label>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                            {[
                                                "💪 Hustle & Grind",
                                                "🧘 Calm & Steady",
                                                "🎉 Fun & Casual",
                                                "🔥 Intense & Focused",
                                                "🤝 Supportive & Friendly",
                                                "🏆 Competitive & Driven",
                                            ].map(vibe => (
                                                <button
                                                    key={vibe}
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        groupDNA: { ...formData.groupDNA, vibe }
                                                    })}
                                                    style={{
                                                        padding: "10px 16px",
                                                        borderRadius: "12px",
                                                        border: `2px solid ${formData.groupDNA.vibe === vibe ? colors.primary : colors.border}`,
                                                        background: formData.groupDNA.vibe === vibe ? `${colors.primary}20` : colors.bg,
                                                        color: formData.groupDNA.vibe === vibe ? colors.primary : colors.textSecondary,
                                                        fontSize: "14px",
                                                        fontWeight: 500,
                                                        cursor: "pointer",
                                                        transition: "all 0.2s",
                                                    }}
                                                >
                                                    {vibe}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Values */}
                                    <div>
                                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
                                            💎 Core Values
                                        </label>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                            {[
                                                "Growth Mindset", "Consistency", "Support", "Transparency",
                                                "Excellence", "Discipline", "Community", "Authenticity",
                                                "Resilience", "Curiosity", "Kindness", "Accountability",
                                            ].map(value => {
                                                const isSelected = formData.groupDNA.values.includes(value);
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => {
                                                            const newValues = isSelected
                                                                ? formData.groupDNA.values.filter(v => v !== value)
                                                                : [...formData.groupDNA.values, value].slice(0, 5);
                                                            setFormData({
                                                                ...formData,
                                                                groupDNA: { ...formData.groupDNA, values: newValues }
                                                            });
                                                        }}
                                                        style={{
                                                            padding: "8px 14px",
                                                            borderRadius: "10px",
                                                            border: `1px solid ${isSelected ? colors.accent : colors.border}`,
                                                            background: isSelected ? `${colors.accent}15` : colors.bg,
                                                            color: isSelected ? colors.accent : colors.textSecondary,
                                                            fontSize: "13px",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s",
                                                        }}
                                                    >
                                                        {isSelected && "✓ "}{value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "10px" }}>
                                            Select up to 5 values • {formData.groupDNA.values.length}/5 selected
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Settings */}
                            {currentStep === 5 && (
                                <div style={{
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "24px",
                                    padding: "32px",
                                }}>
                                    <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
                                        ⚙️ Automation Settings
                                    </h2>
                                    <p style={{ color: colors.textSecondary, fontSize: "14px", marginBottom: "24px" }}>
                                        Configure automatic moderation
                                    </p>

                                    {/* Require Daily Posts */}
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "20px",
                                        background: colors.bg,
                                        borderRadius: "16px",
                                        border: `1px solid ${colors.border}`,
                                        marginBottom: "16px",
                                    }}>
                                        <div>
                                            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                                                📝 Require Daily Posts
                                            </div>
                                            <div style={{ fontSize: "13px", color: colors.textMuted }}>
                                                Members must post at least once per day
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, requireDailyPost: !formData.requireDailyPost })}
                                            style={{
                                                width: "56px",
                                                height: "32px",
                                                borderRadius: "16px",
                                                border: "none",
                                                background: formData.requireDailyPost ? colors.accent : colors.border,
                                                cursor: "pointer",
                                                position: "relative",
                                                transition: "background 0.3s",
                                            }}
                                        >
                                            <div style={{
                                                width: "24px",
                                                height: "24px",
                                                borderRadius: "50%",
                                                background: "#fff",
                                                position: "absolute",
                                                top: "4px",
                                                left: formData.requireDailyPost ? "28px" : "4px",
                                                transition: "left 0.3s",
                                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                            }} />
                                        </button>
                                    </div>


                                </div>
                            )}



                            {/* Navigation Buttons */}
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: "24px",
                            }}>
                                {currentStep > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(currentStep - 1)}
                                        style={{
                                            padding: "14px 28px",
                                            borderRadius: "14px",
                                            border: `2px solid ${colors.border}`,
                                            background: "transparent",
                                            color: colors.textSecondary,
                                            fontWeight: 700,
                                            fontSize: "15px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        ← Back
                                    </button>
                                ) : <div />}

                                {currentStep < 5 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(currentStep + 1)}
                                        disabled={!canProceed()}
                                        style={{
                                            padding: "14px 32px",
                                            borderRadius: "14px",
                                            border: "none",
                                            background: canProceed()
                                                ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`
                                                : colors.border,
                                            color: canProceed() ? "#fff" : colors.textMuted,
                                            fontWeight: 700,
                                            fontSize: "15px",
                                            cursor: canProceed() ? "pointer" : "not-allowed",
                                            boxShadow: canProceed() ? `0 8px 24px ${colors.primary}40` : "none",
                                            transition: "all 0.3s",
                                        }}
                                    >
                                        Continue →
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        style={{
                                            padding: "14px 40px",
                                            borderRadius: "14px",
                                            border: "none",
                                            background: `linear-gradient(135deg, ${colors.accent}, #00B894)`,
                                            color: "#fff",
                                            fontWeight: 700,
                                            fontSize: "15px",
                                            cursor: isSubmitting ? "wait" : "pointer",
                                            boxShadow: `0 8px 24px ${colors.accent}40`,
                                            transition: "all 0.3s",
                                            opacity: isSubmitting ? 0.7 : 1,
                                        }}
                                    >
                                        {isSubmitting ? "Creating..." : "🚀 Create Group"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Live Preview Card */}
                    <div style={{ position: "sticky", top: "32px", height: "fit-content" }}>
                        <div style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "24px",
                            padding: "24px",
                        }}>
                            <div style={{ fontSize: "12px", color: colors.textMuted, marginBottom: "16px", fontWeight: 600, letterSpacing: "0.5px" }}>
                                LIVE PREVIEW
                            </div>

                            {/* Preview Card */}
                            <div style={{
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "20px",
                                padding: "24px",
                                position: "relative",
                                overflow: "hidden",
                            }}>
                                {/* Glow effect */}
                                <div style={{
                                    position: "absolute",
                                    top: "0",
                                    right: "0",
                                    width: "100px",
                                    height: "100px",
                                    background: `radial-gradient(circle, ${selectedCategory?.color || colors.primary}30 0%, transparent 70%)`,
                                    pointerEvents: "none",
                                }} />

                                <div style={{
                                    width: "56px",
                                    height: "56px",
                                    borderRadius: "16px",
                                    background: `linear-gradient(135deg, ${selectedCategory?.color || colors.primary}30, ${selectedCategory?.color || colors.primary}10)`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "32px",
                                    marginBottom: "16px",
                                    overflow: "hidden"
                                }}>
                                    {formData.iconUrl ? (
                                        <img
                                            src={formData.iconUrl}
                                            alt="Group Icon"
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                            }}
                                        />
                                    ) : (
                                        formData.emoji
                                    )}
                                </div>

                                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
                                    {formData.name || "Your Group Name"}
                                </h3>

                                {/* Expandable Description */}
                                <div style={{ marginBottom: "16px" }}>
                                    <p style={{
                                        fontSize: "14px",
                                        color: colors.textSecondary,
                                        lineHeight: 1.5,
                                        margin: 0,
                                        ...(descriptionExpanded ? {
                                            wordBreak: "break-word" as const,
                                        } : {
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical" as const,
                                            overflow: "hidden",
                                        }),
                                    }}>
                                        {formData.description || "Your group description will appear here..."}
                                    </p>
                                    {formData.description && formData.description.length > 80 && (
                                        <button
                                            type="button"
                                            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: colors.primary,
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                padding: "4px 0",
                                                marginTop: "4px",
                                            }}
                                        >
                                            {descriptionExpanded ? "Show less ↑" : "Show more ↓"}
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{
                                        fontSize: "12px",
                                        padding: "6px 12px",
                                        background: `${selectedCategory?.color || colors.primary}20`,
                                        color: selectedCategory?.color || colors.primary,
                                        borderRadius: "10px",
                                        fontWeight: 600,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                    }}>
                                        {selectedCategory?.emoji} {selectedCategory?.label}
                                    </span>
                                    <span style={{ fontSize: "13px", color: colors.textMuted }}>
                                        👥 1
                                    </span>
                                </div>
                            </div>

                            {/* Rules Preview */}
                            {rules.length > 0 && (
                                <div style={{ marginTop: "20px" }}>
                                    <div style={{ fontSize: "12px", color: colors.textMuted, marginBottom: "10px", fontWeight: 600 }}>
                                        📜 {rules.length} RULES
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                        maxHeight: "280px",
                                        overflowY: "auto",
                                        paddingRight: "4px",
                                    }}>
                                        {rules.map((rule, idx) => (
                                            <div key={idx} style={{
                                                fontSize: "12px",
                                                color: colors.textSecondary,
                                                padding: "10px 12px",
                                                background: colors.bg,
                                                borderRadius: "10px",
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: "10px",
                                                border: `1px solid ${colors.border}`,
                                            }}>
                                                <span style={{
                                                    color: colors.primary,
                                                    fontWeight: 700,
                                                    minWidth: "20px",
                                                }}>#{idx + 1}</span>
                                                <span style={{
                                                    lineHeight: 1.4,
                                                    wordBreak: "break-word",
                                                }}>
                                                    {rule}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media (max-width: 900px) {
                    .create-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
