"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { uploadProfileImage, updateProfile } from "@/app/actions/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Plus, X, Loader2, Camera, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

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
        if (error || !user) { router.push("/login"); return; }
        const metadata = user.user_metadata || {};
        if (metadata.profile_complete) { router.push("/dashboard"); return; }
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
        setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
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
                bio, interests,
                goals: goals.length > 0 ? goals : undefined,
            });
            await supabase.auth.updateUser({ data: { profile_complete: true, tutorial_complete: true } });
            router.push("/dashboard");
        } catch (err) {
            console.error("Error saving profile:", err);
        } finally {
            setSaving(false);
        }
    };

    const canProceed = () => {
        if (step === 0) return displayName.trim().length >= 2;
        if (step === 3) return interests.length >= 1;
        return true;
    };

    const totalSteps = 6;

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileSelect} />

            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-border z-50">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
            </div>

            {/* Step indicator */}
            <div className="fixed top-6 right-6 text-sm text-muted-foreground">
                {step + 1} / {totalSteps}
            </div>

            {/* Main content */}
            <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Step 0: Name */}
                {step === 0 && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">👋</div>
                        <h1 className="text-3xl font-bold mb-2">What should we call you?</h1>
                        <p className="text-muted-foreground mb-8">This is how you&apos;ll appear to others</p>
                        <Input
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Your name"
                            className="text-center text-lg h-12"
                            autoFocus
                        />
                    </div>
                )}

                {/* Step 1: Avatar */}
                {step === 1 && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">📸</div>
                        <h1 className="text-3xl font-bold mb-2">Choose your look</h1>
                        <p className="text-muted-foreground mb-6">Pick an emoji or upload a photo</p>

                        <div className="flex justify-center gap-2 mb-6">
                            <button
                                onClick={() => setAvatarType("emoji")}
                                className={cn(
                                    "px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border-2",
                                    avatarType === "emoji" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                                )}
                            >
                                😊 Emoji
                            </button>
                            <button
                                onClick={() => setAvatarType("image")}
                                className={cn(
                                    "px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border-2",
                                    avatarType === "image" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                                )}
                            >
                                📷 Photo
                            </button>
                        </div>

                        {avatarType === "emoji" ? (
                            <div className="grid grid-cols-10 gap-2 justify-center">
                                {availableAvatars.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => setAvatar(emoji)}
                                        className={cn(
                                            "w-12 h-12 rounded-lg text-2xl flex items-center justify-center border transition-all cursor-pointer",
                                            avatar === emoji ? "border-primary bg-primary/10 scale-110" : "border-border hover:border-muted-foreground/50"
                                        )}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                {avatarUrl ? (
                                    <>
                                        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary">
                                            <Image src={avatarUrl} alt="Profile" width={120} height={120} className="object-cover w-full h-full" />
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                            Change photo
                                        </Button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-28 h-28 rounded-full border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors"
                                    >
                                        {uploading ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        ) : (
                                            <>
                                                <Camera size={28} className="text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Upload</span>
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
                    <div className="text-center">
                        <div className="text-5xl mb-4">✨</div>
                        <h1 className="text-3xl font-bold mb-2">Tell us about yourself</h1>
                        <p className="text-muted-foreground mb-8">A short bio so others can get to know you</p>
                        <div className="relative">
                            <Textarea
                                value={bio}
                                onChange={e => setBio(e.target.value.slice(0, 160))}
                                placeholder="I'm working on becoming more consistent with..."
                                rows={4}
                                className="resize-none"
                            />
                            <span className={cn("absolute bottom-3 right-3 text-xs", bio.length > 140 ? "text-destructive" : "text-muted-foreground")}>
                                {bio.length}/160
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">Optional — you can always add this later</p>
                    </div>
                )}

                {/* Step 3: Interests */}
                {step === 3 && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">🎯</div>
                        <h1 className="text-3xl font-bold mb-2">What are you into?</h1>
                        <p className="text-muted-foreground mb-6">Select your interests to find the right groups</p>
                        <div className="flex flex-wrap justify-center gap-2 max-h-80 overflow-y-auto p-2">
                            {availableInterests.map(interest => {
                                const isSelected = interests.includes(interest);
                                return (
                                    <button
                                        key={interest}
                                        onClick={() => toggleInterest(interest)}
                                        className={cn(
                                            "px-4 py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer border",
                                            isSelected
                                                ? "border-primary bg-primary/10 text-primary scale-105"
                                                : "border-border text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {interest}
                                    </button>
                                );
                            })}
                        </div>
                        {interests.length > 0 && (
                            <p className="text-sm text-green-500 mt-4 font-medium">
                                {interests.length} selected <Check size={12} className="inline" />
                            </p>
                        )}
                    </div>
                )}

                {/* Step 4: Goals */}
                {step === 4 && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">🎯</div>
                        <h1 className="text-3xl font-bold mb-2">What are you working towards?</h1>
                        <p className="text-muted-foreground mb-6">Add up to 5 goals you&apos;re working on</p>

                        <div className="flex gap-2 mb-4">
                            <Input
                                value={goalInput}
                                onChange={e => setGoalInput(e.target.value.slice(0, 80))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } }}
                                placeholder="e.g. Run a marathon, Learn Spanish..."
                                className="flex-1"
                            />
                            <Button onClick={addGoal} disabled={!goalInput.trim() || goals.length >= 5}>
                                <Plus size={14} className="mr-1" /> Add
                            </Button>
                        </div>

                        {goals.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {goals.map((goal, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg text-left">
                                        <span className="text-green-500 font-bold">🎯</span>
                                        <span className="flex-1 text-sm text-muted-foreground">{goal}</span>
                                        <button onClick={() => removeGoal(goal)} className="text-muted-foreground hover:text-destructive cursor-pointer">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">Optional — you can always add these later</p>
                    </div>
                )}

                {/* Step 5: Preview */}
                {step === 5 && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">🎉</div>
                        <h1 className="text-3xl font-bold mb-2">Looking good!</h1>
                        <p className="text-muted-foreground mb-8">Here&apos;s your profile preview</p>

                        <Card>
                            <CardContent className="p-8 text-center">
                                {avatarType === "image" && avatarUrl ? (
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary mx-auto mb-4">
                                        <Image src={avatarUrl} alt="Profile" width={100} height={100} className="object-cover w-full h-full" />
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-5xl mx-auto mb-4">
                                        {avatar}
                                    </div>
                                )}
                                <h2 className="text-xl font-bold mb-2">{displayName}</h2>
                                {bio && <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{bio}</p>}
                                {interests.length > 0 && (
                                    <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                                        {interests.slice(0, 6).map(interest => (
                                            <Badge key={interest} variant="secondary" className="text-xs">{interest}</Badge>
                                        ))}
                                        {interests.length > 6 && (
                                            <Badge variant="outline" className="text-xs">+{interests.length - 6}</Badge>
                                        )}
                                    </div>
                                )}
                                {goals.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Goals</p>
                                        <div className="space-y-1.5">
                                            {goals.map((goal, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 text-green-500 text-xs text-left">
                                                    <span>🎯</span> {goal}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-3 mt-8">
                    {step > 0 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)}>
                            <ArrowLeft size={14} className="mr-1" /> Back
                        </Button>
                    )}
                    <Button
                        className="flex-1"
                        onClick={() => { step < totalSteps - 1 ? setStep(step + 1) : handleComplete(); }}
                        disabled={!canProceed() || saving}
                    >
                        {saving ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...</>
                        ) : step === totalSteps - 1 ? (
                            <><Rocket size={14} className="mr-1" /> Go to Dashboard</>
                        ) : (
                            <>Continue <ArrowRight size={14} className="ml-1" /></>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
