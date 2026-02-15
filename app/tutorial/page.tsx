"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Check, Loader2, Rocket, Users, FileText, Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TutorialPage() {
    const router = useRouter();
    const supabase = createClient();

    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [userName, setUserName] = useState("");
    const [saving, setSaving] = useState(false);

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
        if (error || !user) { router.push("/login"); return; }
        const metadata = user.user_metadata || {};
        if (metadata.tutorial_complete) { router.push("/dashboard"); return; }
        if (!metadata.profile_complete) { router.push("/setup"); return; }
        setUserName(metadata.display_name || metadata.full_name || "there");
        setLoading(false);
    };

    const handleJoinGroup = () => {
        setHasJoinedGroup(true);
        setTimeout(() => setStreakCount(1), 500);
    };

    const handlePost = () => {
        if (mockPostText.trim().length > 0) {
            setHasPosted(true);
            setTimeout(() => setStreakCount(2), 300);
        }
    };

    const handleComplete = async () => {
        setSaving(true);
        setShowConfetti(true);
        try {
            await supabase.auth.updateUser({ data: { tutorial_complete: true } });
            setTimeout(() => router.push("/dashboard"), 1500);
        } catch (err) {
            console.error("Error completing tutorial:", err);
            router.push("/dashboard");
        }
    };

    const totalSteps = 5;
    const isDisabled = saving || (step === 1 && !hasJoinedGroup) || (step === 2 && !hasPosted);

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Confetti overlay */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                    {["🎉", "🎊", "✨", "🌟", "💫", "🎈"].map((emoji, i) => (
                        <span
                            key={i}
                            className="absolute text-5xl animate-bounce"
                            style={{ left: `${20 + i * 12}%`, animationDelay: `${i * 100}ms` }}
                        >
                            {emoji}
                        </span>
                    ))}
                </div>
            )}

            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-border z-50">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
            </div>

            {/* Skip button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleComplete}
                className="fixed top-5 right-5 text-muted-foreground z-50"
            >
                Skip tutorial
            </Button>

            {/* Main content */}
            <div className="max-w-xl w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Step 0: Welcome */}
                {step === 0 && (
                    <div className="text-center">
                        <div className="text-7xl mb-6">👋</div>
                        <h1 className="text-4xl font-bold mb-4">Welcome, {userName}!</h1>
                        <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                            Let&apos;s take a quick tour of how GrowTogether works.
                        </p>
                        <p className="text-green-500 font-medium">It only takes 1 minute ⚡</p>
                    </div>
                )}

                {/* Step 1: Groups Demo */}
                {step === 1 && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">👥</div>
                        <h1 className="text-3xl font-bold mb-2">Join accountability groups</h1>
                        <p className="text-muted-foreground mb-8">Find people working on the same goals as you</p>

                        <Card
                            className={cn(
                                "cursor-pointer transition-all",
                                hasJoinedGroup ? "border-green-500 bg-green-500/5" : "hover:border-primary"
                            )}
                            onClick={handleJoinGroup}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-3xl">🏋️</div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-semibold mb-1">Fitness Accountability</h3>
                                        <p className="text-xs text-muted-foreground">23 members · 🔥 Active daily</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={hasJoinedGroup ? "default" : "default"}
                                        className={cn(hasJoinedGroup && "bg-green-600 hover:bg-green-700")}
                                    >
                                        {hasJoinedGroup ? <><Check size={12} className="mr-1" /> Joined!</> : <>Join <ArrowRight size={12} className="ml-1" /></>}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {hasJoinedGroup && (
                            <p className="text-green-500 text-sm mt-4 animate-in fade-in">
                                🎉 Great! You joined your first group!
                            </p>
                        )}
                        {!hasJoinedGroup && (
                            <p className="text-xs text-muted-foreground mt-4">👆 Click to join this group</p>
                        )}
                    </div>
                )}

                {/* Step 2: Check-in Demo */}
                {step === 2 && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">📝</div>
                        <h1 className="text-3xl font-bold mb-2">Post daily check-ins</h1>
                        <p className="text-muted-foreground mb-8">Share your progress, wins, and struggles with your group</p>

                        <Card className={cn(hasPosted && "border-green-500")}>
                            <CardContent className="p-5">
                                <div className="flex gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">😊</div>
                                    <Textarea
                                        value={mockPostText}
                                        onChange={e => setMockPostText(e.target.value)}
                                        placeholder="What did you accomplish today?"
                                        disabled={hasPosted}
                                        rows={3}
                                        className="flex-1 resize-none"
                                    />
                                </div>
                                <Button
                                    className={cn("w-full", hasPosted && "bg-green-600 hover:bg-green-700")}
                                    onClick={handlePost}
                                    disabled={mockPostText.trim().length === 0 || hasPosted}
                                >
                                    {hasPosted ? <><Check size={12} className="mr-1" /> Posted!</> : "Post Check-in"}
                                </Button>
                            </CardContent>
                        </Card>

                        {hasPosted && (
                            <p className="text-green-500 text-sm mt-4 animate-in fade-in">
                                🚀 You&apos;re on a roll! Your streak just increased!
                            </p>
                        )}
                    </div>
                )}

                {/* Step 3: Streaks Demo */}
                {step === 3 && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">🔥</div>
                        <h1 className="text-3xl font-bold mb-2">Build your streak</h1>
                        <p className="text-muted-foreground mb-8">Check in daily to keep your streak alive</p>

                        <Card className="mb-6">
                            <CardContent className="py-10 text-center">
                                <div className="text-7xl font-bold text-orange-500 mb-2">🔥 {streakCount}</div>
                                <p className="text-muted-foreground text-lg">Day Streak</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-0">
                                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                                    <Trophy size={14} className="text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground">Group Leaderboard</span>
                                </div>
                                {[
                                    { rank: 1, name: "Sarah K.", streak: 47, you: false },
                                    { rank: 2, name: "You", streak: streakCount, you: true },
                                    { rank: 3, name: "Marcus", streak: 19, you: false },
                                ].map(m => (
                                    <div key={m.rank} className={cn("flex items-center gap-3 px-4 py-3", m.you && "bg-primary/5")}>
                                        <span className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                            m.rank === 1 ? "bg-yellow-500 text-black" : m.rank === 2 ? "bg-gray-400 text-black" : "bg-amber-700 text-white"
                                        )}>
                                            {m.rank}
                                        </span>
                                        <span className={cn("flex-1 text-sm", m.you ? "font-semibold text-primary" : "")}>{m.name}</span>
                                        <span className="text-sm text-orange-500 font-semibold">🔥 {m.streak}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 4: Complete */}
                {step === 4 && (
                    <div className="text-center">
                        <div className="text-7xl mb-6 animate-bounce">🎉</div>
                        <h1 className="text-4xl font-bold mb-4">You&apos;re all set!</h1>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                            Time to find your first group and start building real consistency.
                        </p>

                        <div className="space-y-3 max-w-xs mx-auto">
                            {[
                                { icon: Users, text: "Join groups that match your goals" },
                                { icon: FileText, text: "Check in daily with your progress" },
                                { icon: Flame, text: "Build streaks and stay consistent" },
                            ].map(({ icon: Icon, text }, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                    <Icon size={20} className="text-primary shrink-0" />
                                    <span className="text-sm text-muted-foreground">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation button */}
                <div className="mt-10">
                    <Button
                        className="w-full h-12 text-base"
                        onClick={() => { step < totalSteps - 1 ? setStep(step + 1) : handleComplete(); }}
                        disabled={isDisabled}
                    >
                        {saving ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...</>
                        ) : step === totalSteps - 1 ? (
                            <><Rocket size={16} className="mr-2" /> Go to Dashboard</>
                        ) : (
                            <>Continue <ArrowRight size={16} className="ml-2" /></>
                        )}
                    </Button>

                    {step === 1 && !hasJoinedGroup && (
                        <p className="text-xs text-muted-foreground text-center mt-3">Join the group above to continue</p>
                    )}
                    {step === 2 && !hasPosted && (
                        <p className="text-xs text-muted-foreground text-center mt-3">Write something and post to continue</p>
                    )}
                </div>
            </div>
        </div>
    );
}
