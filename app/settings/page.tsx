"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { uploadProfileImage, deleteProfileImage, updateProfile } from "@/app/actions/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Loader2,
    User,
    Sparkles,
    Target,
    Lock,
    Key,
    Trash2,
    X,
    Camera,
    Upload,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
            if (error || !user) { router.push("/login"); return; }
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
        } catch (err) { console.error("Error loading user data:", err); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true); setError(null); setSuccess(false);
        try {
            await updateProfile({
                display_name: displayName,
                username,
                bio,
                avatar: avatarType === "emoji" ? avatar : undefined,
                avatar_url: avatarType === "image" ? (avatarUrl || undefined) : undefined,
                interests,
                goals: goals.length > 0 ? goals : undefined,
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true); setError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const publicUrl = await uploadProfileImage(formData);
            setAvatarUrl(publicUrl);
            setAvatarType("image");
            setShowAvatarPicker(false);
        } catch (err: any) { setError(err.message); }
        finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };

    const handleRemoveImage = async () => {
        setUploading(true); setError(null);
        try { await deleteProfileImage(); setAvatarUrl(null); setAvatarType("emoji"); }
        catch (err: any) { setError(err.message); }
        finally { setUploading(false); }
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

    const removeGoal = (goal: string) => { setGoals(prev => prev.filter(g => g !== goal)); };

    const handleDeleteAccount = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center min-h-[80vh]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileSelect} />

            <main className="max-w-2xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">Customize your profile and account preferences</p>
                </div>

                {/* Success / Error */}
                {success && (
                    <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 size={16} /> Your changes have been saved successfully!
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium flex items-center gap-2">
                        <XCircle size={16} /> {error}
                    </div>
                )}

                {/* Profile Section */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <User size={18} /> Profile
                        </h2>

                        {/* Avatar */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-muted-foreground mb-3">Profile Picture</label>

                            {/* Avatar Type Toggle */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setAvatarType("emoji")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border",
                                        avatarType === "emoji"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground"
                                    )}
                                >
                                    Emoji
                                </button>
                                <button
                                    onClick={() => setAvatarType("image")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border",
                                        avatarType === "image"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground"
                                    )}
                                >
                                    <Camera size={11} className="inline mr-1" /> Photo
                                </button>
                            </div>

                            <div className="flex items-center gap-5">
                                {avatarType === "image" && avatarUrl ? (
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary">
                                            <Image src={avatarUrl} alt="Profile" width={80} height={80} className="object-cover w-full h-full" />
                                        </div>
                                        <button
                                            onClick={handleRemoveImage}
                                            disabled={uploading}
                                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : avatarType === "emoji" ? (
                                    <button
                                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                        className="w-20 h-20 rounded-full bg-muted border-2 border-border flex items-center justify-center text-4xl cursor-pointer hover:border-primary transition-colors"
                                    >
                                        {avatar}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                                    >
                                        {uploading ? (
                                            <Loader2 size={20} className="animate-spin text-muted-foreground" />
                                        ) : (
                                            <>
                                                <Camera size={20} className="text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground mt-0.5">Upload</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                <div className="flex-1">
                                    {avatarType === "emoji" && (
                                        <p className="text-sm text-muted-foreground">Click to choose an emoji avatar</p>
                                    )}
                                    {avatarType === "image" && !avatarUrl && (
                                        <div>
                                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                                <Upload size={14} className="mr-1" /> {uploading ? "Uploading..." : "Upload Photo"}
                                            </Button>
                                            <p className="text-xs text-muted-foreground mt-2">Max 5MB. JPEG, PNG, GIF, or WebP.</p>
                                        </div>
                                    )}
                                    {avatarType === "image" && avatarUrl && (
                                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                            {uploading ? "Uploading..." : "Change Photo"}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Emoji Picker */}
                            {avatarType === "emoji" && showAvatarPicker && (
                                <div className="mt-4 p-4 bg-muted rounded-lg grid grid-cols-10 gap-2">
                                    {availableAvatars.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => { setAvatar(emoji); setShowAvatarPicker(false); }}
                                            className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center text-xl cursor-pointer transition-colors border",
                                                avatar === emoji
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:border-muted-foreground/50"
                                            )}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Display Name */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Display Name</label>
                            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" />
                        </div>

                        {/* Username */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Username</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                                <Input
                                    value={username}
                                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                    placeholder="username"
                                    className="pl-7"
                                />
                            </div>
                        </div>

                        {/* Bio */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-muted-foreground">Bio</label>
                                <span className={cn("text-xs", bio.length > 150 ? "text-destructive" : "text-muted-foreground")}>
                                    {bio.length}/160
                                </span>
                            </div>
                            <Textarea
                                value={bio}
                                onChange={e => setBio(e.target.value.slice(0, 160))}
                                placeholder="Tell us about yourself..."
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Interests */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                            <Sparkles size={18} /> Interests
                        </h2>
                        <p className="text-sm text-muted-foreground mb-5">
                            Select your interests to help us personalize your experience
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {availableInterests.map(interest => {
                                const isSelected = interests.includes(interest);
                                return (
                                    <button
                                        key={interest}
                                        onClick={() => toggleInterest(interest)}
                                        className={cn(
                                            "px-3.5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer border",
                                            isSelected
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {interest}
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Goals */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Target size={18} /> Goals
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    What are you working towards? (up to 5)
                                </p>
                            </div>
                            <Badge variant="secondary">{goals.length}/5</Badge>
                        </div>

                        {/* Goal input */}
                        <div className="flex gap-2 mb-4">
                            <Input
                                value={goalInput}
                                onChange={e => setGoalInput(e.target.value.slice(0, 80))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } }}
                                placeholder="e.g. Run a marathon, Learn Spanish..."
                                disabled={goals.length >= 5}
                                className="flex-1"
                            />
                            <Button onClick={addGoal} disabled={!goalInput.trim() || goals.length >= 5}>
                                <Plus size={14} className="mr-1" /> Add
                            </Button>
                        </div>

                        {/* Goal list */}
                        {goals.length > 0 && (
                            <div className="space-y-2">
                                {goals.map((goal, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                        <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 text-sm">{goal}</span>
                                        <button
                                            onClick={() => removeGoal(goal)}
                                            className="w-6 h-6 rounded-full bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-center cursor-pointer hover:bg-destructive/20 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Account */}
                <Card className="mb-8">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Lock size={18} /> Account
                        </h2>

                        {/* Email */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Email Address</label>
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted">
                                <span className="text-sm text-muted-foreground">{email}</span>
                                <Badge variant="secondary" className="text-xs">Verified</Badge>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/update-password">
                                    <Key size={14} className="mr-1" /> Change Password
                                </Link>
                            </Button>
                        </div>

                        {/* Danger Zone */}
                        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                            <h3 className="text-sm font-semibold text-destructive mb-1">Danger Zone</h3>
                            <p className="text-xs text-muted-foreground mb-3">
                                Once you delete your account, there is no going back. Please be certain.
                            </p>
                            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteModal(true)}>
                                <Trash2 size={14} className="mr-1" /> Delete Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Save Button */}
                <Button className="w-full h-12 text-base font-semibold" onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
                </Button>
            </main>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-6">
                    <Card className="max-w-sm w-full">
                        <CardContent className="p-8 text-center">
                            <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-4" />
                            <h3 className="text-lg font-bold mb-2">Delete Account?</h3>
                            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                                This action cannot be undone. All your data, including posts, groups, and achievements will be permanently deleted.
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" className="flex-1" onClick={handleDeleteAccount}>
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
