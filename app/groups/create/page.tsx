"use client";

import { createGroup, uploadGroupIcon } from "@/app/actions/groups";
import { compressImage } from "@/utils/compressImage";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Plus,
    Trash2,
    Camera,
    Loader2,
    X,
    Rocket,
    FileText,
    ScrollText,
    Sparkles,
    Settings,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_RULES = [
    "Post your daily progress every day",
    "Be supportive and encouraging to others",
    "No spam or self-promotion",
];

const EMOJI_OPTIONS = ["🏃", "💻", "📚", "🎨", "💪", "🧘", "✍️", "🎵", "💼", "🍳", "📸", "🌱", "🚀", "🎯", "🧠", "🎮", "🏋️", "🎸", "📐", "🌍"];

const CATEGORIES = [
    { id: "fitness", label: "Fitness", emoji: "💪" },
    { id: "learning", label: "Learning", emoji: "📚" },
    { id: "coding", label: "Coding", emoji: "💻" },
    { id: "art", label: "Art", emoji: "🎨" },
    { id: "hustling", label: "Hustling", emoji: "💰" },
    { id: "writing", label: "Writing", emoji: "✍️" },
    { id: "music", label: "Music", emoji: "🎵" },
    { id: "self-improvement", label: "Self Improvement", emoji: "🧘" },
    { id: "other", label: "Other", emoji: "🎯" },
];

export default function CreateGroupPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
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
        groupDNA: { vibe: string; values: string[]; motto: string };
        iconUrl?: string;
    }>({
        name: "",
        description: "",
        emoji: "🎯",
        category: "fitness",
        requireDailyPost: true,
        contractText: "I commit to showing up daily, supporting my fellow members, and holding myself accountable to this group.",
        requireSignature: true,
        primaryColor: "#6C5CE7",
        glowColor: "#A29BFE",
        cardStyle: "glassy",
        bannerType: "gradient",
        gradientColors: ["#6C5CE7", "#A29BFE"],
        groupDNA: { vibe: "💪 Hustle & Grind", values: ["Growth Mindset", "Consistency", "Support"], motto: "" },
        iconUrl: undefined,
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
            const compressedFile = await compressImage(file, { maxWidth: 800, quality: 0.8 });
            const fd = new FormData();
            fd.append("file", compressedFile);
            const url = await uploadGroupIcon(fd);
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
                rules,
                settings: { requireDailyPost: formData.requireDailyPost },
                contract: { text: formData.contractText, requireSignature: formData.requireSignature },
                theme: {
                    primaryColor: formData.primaryColor, glowColor: formData.glowColor,
                    cardStyle: formData.cardStyle, bannerType: formData.bannerType,
                    gradientColors: formData.gradientColors, iconUrl: formData.iconUrl,
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
        if (currentStep === 4) return formData.groupDNA.motto.trim().length >= 5;
        return true;
    };

    const selectedCategory = CATEGORIES.find(c => c.id === formData.category);

    const STEPS = [
        { num: 1, label: "Basics", icon: FileText },
        { num: 2, label: "Rules", icon: ScrollText },
        { num: 3, label: "Contract", icon: FileText },
        { num: 4, label: "Manifesto", icon: Sparkles },
        { num: 5, label: "Settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                        <ArrowLeft size={14} /> Back to explore
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Create Your Group</h1>
                    <p className="text-muted-foreground mt-1">Build an accountability community in 5 simple steps</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-2 mb-8 flex-wrap">
                    {STEPS.map((step, idx) => (
                        <div key={step.num} className="flex items-center">
                            <button
                                type="button"
                                onClick={() => step.num <= currentStep && setCurrentStep(step.num)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors",
                                    currentStep === step.num
                                        ? "border-primary bg-primary/10 text-primary"
                                        : currentStep > step.num
                                            ? "border-green-500/50 bg-green-500/10 text-green-500 cursor-pointer"
                                            : "border-border text-muted-foreground cursor-default"
                                )}
                            >
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                    currentStep > step.num ? "bg-green-500 text-white"
                                        : currentStep === step.num ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                )}>
                                    {currentStep > step.num ? <Check size={12} /> : step.num}
                                </span>
                                <span className="hidden sm:inline">{step.label}</span>
                            </button>
                            {idx < 4 && (
                                <div className={cn("w-8 h-0.5 mx-1", currentStep > step.num ? "bg-green-500" : "bg-border")} />
                            )}
                        </div>
                    ))}
                </div>

                {formError && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                        {formError}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
                    {/* Form Area */}
                    <div>
                        {/* Step 1: Basics */}
                        {currentStep === 1 && (
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="text-lg font-semibold mb-6">Basic Information</h2>

                                    {/* Group Name */}
                                    <div className="mb-5">
                                        <label className="block text-sm font-medium mb-2">Group Name *</label>
                                        <Input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Morning Runners, Code Daily"
                                        />
                                        <p className={cn("text-xs mt-1.5", formData.name.length >= 3 ? "text-green-500" : "text-muted-foreground")}>
                                            {formData.name.length}/50 characters {formData.name.length >= 3 && <Check size={10} className="inline" />}
                                        </p>
                                    </div>

                                    {/* Description */}
                                    <div className="mb-5">
                                        <label className="block text-sm font-medium mb-2">Short Bio *</label>
                                        <Textarea
                                            maxLength={160}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="A short description of what this group is about..."
                                            rows={3}
                                            className="resize-none"
                                        />
                                        <div className="flex justify-between text-xs mt-1.5">
                                            <span className={formData.description.length >= 10 ? "text-green-500" : "text-muted-foreground"}>
                                                {formData.description.length >= 10 && <Check size={10} className="inline mr-0.5" />}
                                            </span>
                                            <span className="text-muted-foreground">{formData.description.length}/160</span>
                                        </div>
                                    </div>

                                    {/* Icon Type Toggle */}
                                    <div className="mb-5">
                                        <label className="block text-sm font-medium mb-3">Group Icon</label>
                                        <div className="flex gap-2 mb-4">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, emoji: prev.emoji || "🎯", iconUrl: undefined }))}
                                                className={cn(
                                                    "flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-semibold transition-colors cursor-pointer",
                                                    !formData.iconUrl && formData.iconUrl === undefined
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border text-muted-foreground"
                                                )}
                                            >
                                                Emoji
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, iconUrl: prev.iconUrl || "", emoji: "" }))}
                                                className={cn(
                                                    "flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                                                    formData.iconUrl !== undefined
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border text-muted-foreground"
                                                )}
                                            >
                                                <Camera size={14} /> Upload Image
                                            </button>
                                        </div>

                                        {/* Emoji Picker */}
                                        {formData.iconUrl === undefined ? (
                                            <div className="grid grid-cols-10 gap-2">
                                                {EMOJI_OPTIONS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, emoji })}
                                                        className={cn(
                                                            "w-11 h-11 rounded-lg text-2xl flex items-center justify-center transition-all border cursor-pointer",
                                                            formData.emoji === emoji
                                                                ? "border-primary bg-primary/10 scale-110"
                                                                : "border-border hover:border-muted-foreground/50"
                                                        )}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Image Upload */
                                            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted">
                                                {uploadingIcon ? (
                                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                        <Loader2 size={16} className="animate-spin" /> Uploading...
                                                    </div>
                                                ) : formData.iconUrl ? (
                                                    <div className="relative w-28 h-28 mx-auto">
                                                        <img src={formData.iconUrl} alt="Group Icon" className="w-full h-full object-cover rounded-xl border border-border" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, iconUrl: "" })}
                                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center cursor-pointer"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="cursor-pointer block">
                                                        <Camera size={32} className="mx-auto text-muted-foreground mb-2" />
                                                        <div className="font-semibold text-sm">Click to upload</div>
                                                        <div className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</div>
                                                        <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium mb-3">Category *</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {CATEGORIES.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, category: cat.id })}
                                                    className={cn(
                                                        "py-3 px-2 rounded-lg border-2 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2",
                                                        formData.category === cat.id
                                                            ? "border-primary bg-primary/10 text-primary"
                                                            : "border-border text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <span className="text-lg">{cat.emoji}</span>
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 2: Rules */}
                        {currentStep === 2 && (
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="text-lg font-semibold mb-1">Group Rules</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Define what members must follow.</p>

                                    <div className="space-y-2 mb-4">
                                        {rules.map((rule, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                                <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span className="flex-1 text-sm">{rule}</span>
                                                <Button variant="ghost" size="sm" onClick={() => handleRemoveRule(idx)} className="text-destructive hover:text-destructive h-7 px-2">
                                                    <Trash2 size={12} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {rules.length < 8 && (
                                        <div className="flex gap-2">
                                            <Input
                                                value={newRule}
                                                onChange={e => setNewRule(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddRule(); } }}
                                                placeholder="Add a new rule..."
                                                className="flex-1"
                                            />
                                            <Button onClick={handleAddRule} disabled={!newRule.trim()}>
                                                <Plus size={14} className="mr-1" /> Add
                                            </Button>
                                        </div>
                                    )}
                                    <p className={cn("text-xs mt-3", rules.length >= 6 ? "text-orange-500" : "text-muted-foreground")}>
                                        {rules.length}/8 rules {rules.length >= 6 && "(almost full!)"}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Contract */}
                        {currentStep === 3 && (
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="text-lg font-semibold mb-1">Commitment Contract</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Write the commitment members must sign when joining</p>

                                    <div className="mb-5">
                                        <label className="block text-sm font-medium mb-2">Contract Text *</label>
                                        <Textarea
                                            value={formData.contractText}
                                            onChange={e => setFormData({ ...formData, contractText: e.target.value })}
                                            placeholder="Write the commitment statement members will sign..."
                                            rows={5}
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1.5 text-right">{formData.contractText.length} characters</p>
                                    </div>

                                    {/* Require Signature Toggle */}
                                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg mb-5">
                                        <div>
                                            <div className="text-sm font-semibold">Require Hand-Drawn Signature</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">Members must sign with their finger or mouse</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, requireSignature: !formData.requireSignature })}
                                            className={cn(
                                                "w-12 h-7 rounded-full relative transition-colors cursor-pointer",
                                                formData.requireSignature ? "bg-green-500" : "bg-muted-foreground/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-full bg-white absolute top-1 transition-[left] shadow",
                                                formData.requireSignature ? "left-6" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    {/* Contract Preview */}
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-2 font-semibold">PREVIEW</p>
                                        <p className="text-sm italic text-muted-foreground leading-relaxed">
                                            &quot;{formData.contractText || "Your contract text will appear here..."}&quot;
                                        </p>
                                        {formData.requireSignature && (
                                            <div className="mt-4 p-4 border-2 border-dashed border-border rounded-lg text-center text-xs text-muted-foreground">
                                                ✍️ Signature pad will appear here
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 4: Manifesto */}
                        {currentStep === 4 && (
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="text-lg font-semibold mb-1">Group Manifesto</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Define your group&apos;s soul</p>

                                    {/* Motto */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium mb-2">Manifesto / Motto *</label>
                                        <Textarea
                                            value={formData.groupDNA.motto}
                                            onChange={e => setFormData({ ...formData, groupDNA: { ...formData.groupDNA, motto: e.target.value } })}
                                            placeholder="Write your group's manifesto... e.g., 'We show up every day, no excuses.'"
                                            rows={4}
                                            className="resize-none"
                                        />
                                        <p className={cn("text-xs mt-1.5", formData.groupDNA.motto.length >= 5 ? "text-green-500" : "text-muted-foreground")}>
                                            {formData.groupDNA.motto.length >= 5 && <Check size={10} className="inline mr-0.5" />} This is the heart of your group
                                        </p>
                                    </div>

                                    {/* Vibe */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium mb-3">Group Vibe</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                "💪 Hustle & Grind", "🧘 Calm & Steady", "🎉 Fun & Casual",
                                                "🔥 Intense & Focused", "🤝 Supportive & Friendly", "🏆 Competitive & Driven",
                                            ].map(vibe => (
                                                <button
                                                    key={vibe}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, groupDNA: { ...formData.groupDNA, vibe } })}
                                                    className={cn(
                                                        "px-3.5 py-2 rounded-lg border-2 text-sm font-medium transition-colors cursor-pointer",
                                                        formData.groupDNA.vibe === vibe
                                                            ? "border-primary bg-primary/10 text-primary"
                                                            : "border-border text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {vibe}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Values */}
                                    <div>
                                        <label className="block text-sm font-medium mb-3">Core Values</label>
                                        <div className="flex flex-wrap gap-2">
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
                                                            setFormData({ ...formData, groupDNA: { ...formData.groupDNA, values: newValues } });
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer",
                                                            isSelected
                                                                ? "border-green-500 bg-green-500/10 text-green-500"
                                                                : "border-border text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {isSelected && <Check size={10} className="inline mr-0.5" />}{value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">Select up to 5 values · {formData.groupDNA.values.length}/5 selected</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 5: Settings */}
                        {currentStep === 5 && (
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="text-lg font-semibold mb-1">Automation Settings</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Configure automatic moderation</p>

                                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                        <div>
                                            <div className="text-sm font-semibold">Require Daily Posts</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">Members must post at least once per day</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, requireDailyPost: !formData.requireDailyPost })}
                                            className={cn(
                                                "w-12 h-7 rounded-full relative transition-colors cursor-pointer",
                                                formData.requireDailyPost ? "bg-green-500" : "bg-muted-foreground/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-full bg-white absolute top-1 transition-[left] shadow",
                                                formData.requireDailyPost ? "left-6" : "left-1"
                                            )} />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-6">
                            {currentStep > 1 ? (
                                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                                    <ArrowLeft size={14} className="mr-1" /> Back
                                </Button>
                            ) : <div />}

                            {currentStep < 5 ? (
                                <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()}>
                                    Continue <ArrowRight size={14} className="ml-1" />
                                </Button>
                            ) : (
                                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Creating...</> : <><Rocket size={14} className="mr-1" /> Create Group</>}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="hidden lg:block">
                        <div className="sticky top-8">
                            <Card>
                                <CardContent className="p-5">
                                    <p className="text-xs text-muted-foreground font-semibold tracking-wide mb-4">LIVE PREVIEW</p>

                                    <div className="p-5 bg-muted rounded-xl">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4 overflow-hidden">
                                            {formData.iconUrl ? (
                                                <img src={formData.iconUrl} alt="Group Icon" className="w-full h-full object-cover" />
                                            ) : (
                                                formData.emoji
                                            )}
                                        </div>

                                        <h3 className="font-bold mb-2">{formData.name || "Your Group Name"}</h3>

                                        <div className="mb-3">
                                            <p className={cn("text-xs text-muted-foreground leading-relaxed", !descriptionExpanded && "line-clamp-2")}>
                                                {formData.description || "Your group description will appear here..."}
                                            </p>
                                            {formData.description && formData.description.length > 80 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                                                    className="text-xs text-primary font-semibold mt-1 cursor-pointer"
                                                >
                                                    {descriptionExpanded ? "Show less" : "Show more"}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <Badge variant="secondary" className="text-xs">
                                                {selectedCategory?.emoji} {selectedCategory?.label}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Users size={10} /> 1
                                            </span>
                                        </div>
                                    </div>

                                    {/* Rules Preview */}
                                    {rules.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-xs text-muted-foreground font-semibold mb-2">{rules.length} RULES</p>
                                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                                {rules.map((rule, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 text-xs p-2.5 bg-muted rounded-lg">
                                                        <span className="text-primary font-bold min-w-[20px]">#{idx + 1}</span>
                                                        <span className="text-muted-foreground leading-relaxed break-words">{rule}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
