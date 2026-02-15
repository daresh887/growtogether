"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

/* ──────────────────── DATA ──────────────────── */

const testimonials = [
    { name: "Josh K.", avatar: "/images/avatars/josh.png", text: "Finally finished my side project after 2 years of procrastinating!", streak: 47 },
    { name: "Marcus T.", avatar: "/images/avatars/alex.webp", text: "Lost 30 lbs because I couldn't let my group down.", streak: 89 },
    { name: "Diana R.", avatar: "/images/avatars/diana.png", text: "Learned Spanish in 6 months with daily check-ins.", streak: 156 },
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
    { id: "hustling", emoji: "🚀", label: "Hustling" },
    { id: "mindfulness", emoji: "🧘", label: "Self Improvement" },
    { id: "languages", emoji: "🌍", label: "Languages" },
    { id: "reading", emoji: "📖", label: "Reading" },
    { id: "cooking", emoji: "🍳", label: "Cooking" },
    { id: "other", emoji: "✨", label: "Other" },
];

const sampleGroups = [
    { name: "Morning Runners", emoji: "🏃", members: 24, streak: "🔥 Active" },
    { name: "Code Every Day", emoji: "💻", members: 156, streak: "🔥 Active" },
    { name: "Learn Spanish", emoji: "🇪🇸", members: 89, streak: "🔥 Active" },
];

/* ──────────────────── SHARED ──────────────────── */

function ProgressBar({ current, total }: { current: number; total: number }) {
    return (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-border z-50">
            <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-r-full transition-[width] duration-400"
                style={{ width: `${((current + 1) / total) * 100}%` }}
            />
        </div>
    );
}

function ContinueButton({ onClick, disabled = false, label = "Continue" }: { onClick: () => void; disabled?: boolean; label?: string }) {
    return (
        <Button onClick={onClick} disabled={disabled} size="lg" className="w-full h-14 text-base font-semibold rounded-xl">
            {label}
        </Button>
    );
}

const Container = ({ children }: { children: React.ReactNode }) => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">{children}</div>
);

/* ──────────────────── SCREENS ──────────────────── */

function HumanWelcomeScreen({ onNext, userCount }: { onNext: () => void; userCount: number }) {
    return (
        <Container>
            <div className="flex mb-6 pl-4">
                {["/images/avatars/josh.png", "/images/avatars/alex.webp", "/images/avatars/diana.png", "/images/avatars/vladimir.png"].map((avatar, i) => (
                    <div
                        key={i}
                        className="w-12 h-12 rounded-full border-2 border-background flex items-center justify-center overflow-hidden bg-muted"
                        style={{ marginLeft: "-16px", zIndex: 5 - i, animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                    >
                        <img src={avatar} alt="User" className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
            <h1 className="text-2xl font-bold text-center mb-3 leading-tight tracking-tight">
                Join {userCount.toLocaleString()} people who<br />actually follow through
            </h1>
            <p className="text-muted-foreground text-center mb-5 leading-relaxed">Real humans, real goals, real accountability.<br />No bots. No fake motivation.</p>
            <Badge variant="outline" className="mb-8 text-green-500 border-green-500/30 bg-green-500/10">
                <Check size={14} className="mr-1" /> Average streak: 23 days
            </Badge>
            <ContinueButton onClick={onNext} label="See how it works →" />
        </Container>
    );
}

function DraggableSliderScreen({ onNext, value, onChange }: { onNext: () => void; value: number; onChange: (v: number) => void }) {
    const sliderRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const emojis = ["😰", "😟", "😐", "🙂", "😊"];
    const currentEmoji = emojis[Math.min(Math.floor(value / 20), 4)];

    const updateValue = useCallback((clientX: number) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        onChange(Math.round((x / rect.width) * 100));
    }, [onChange]);

    const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); updateValue(e.clientX); };
    const handleTouchStart = (e: React.TouchEvent) => { setIsDragging(true); updateValue(e.touches[0].clientX); };

    useEffect(() => {
        const handleMove = (e: MouseEvent) => { if (isDragging) updateValue(e.clientX); };
        const handleTouchMove = (e: TouchEvent) => { if (isDragging) updateValue(e.touches[0].clientX); };
        const handleEnd = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener("mousemove", handleMove);
            document.addEventListener("mouseup", handleEnd);
            document.addEventListener("touchmove", handleTouchMove);
            document.addEventListener("touchend", handleEnd);
        }
        return () => {
            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("mouseup", handleEnd);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleEnd);
        };
    }, [isDragging, updateValue]);

    return (
        <Container>
            <div className="text-5xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-center mb-3">How often do you finish<br />what you start?</h1>
            <p className="text-muted-foreground text-center mb-12">Be honest — drag the slider!</p>

            <div className="w-full mb-12">
                <div className="text-7xl text-center mb-8 transition-transform duration-150" style={{ transform: `scale(${1 + value / 200}) rotate(${(value - 50) / 10}deg)` }}>
                    {currentEmoji}
                </div>
                <div
                    ref={sliderRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className="w-full h-5 bg-muted rounded-full cursor-pointer relative border border-border select-none touch-none"
                >
                    <div className="h-full rounded-full" style={{ width: `${value}%`, background: "linear-gradient(90deg, #FF6B6B, #FFEAA7, #00D9A5)", transition: isDragging ? "none" : "width 0.1s" }} />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full border-4 border-primary"
                        style={{ left: `${value}%`, transform: "translate(-50%, -50%)", boxShadow: isDragging ? "0 4px 20px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.3)", cursor: isDragging ? "grabbing" : "grab", transition: isDragging ? "none" : "left 0.1s" }}
                    />
                </div>
                <div className="flex justify-between mt-4 text-sm text-muted-foreground font-medium">
                    <span>Almost never</span><span>Always</span>
                </div>
            </div>
            <ContinueButton onClick={onNext} />
        </Container>
    );
}

function AnimatedStatScreen({ onNext, stat, headline, description, emoji, color = "hsl(var(--primary))" }: { onNext: () => void; stat: string; headline: string; description: string; emoji: string; color?: string }) {
    const [displayStat, setDisplayStat] = useState("0%");
    const numericStat = parseInt(stat.replace(/\D/g, ""));

    useEffect(() => {
        if (stat.includes("%")) {
            let current = 0;
            const interval = setInterval(() => {
                current += Math.ceil(numericStat / 20);
                if (current >= numericStat) { current = numericStat; clearInterval(interval); }
                setDisplayStat(`${current}%`);
            }, 50);
            return () => clearInterval(interval);
        } else {
            setDisplayStat(stat);
        }
    }, [stat, numericStat]);

    return (
        <Container>
            <div className="text-6xl mb-4 animate-bounce">{emoji}</div>
            <div className="text-7xl font-extrabold leading-none mb-4" style={{ color }}>{displayStat}</div>
            <h1 className="text-2xl font-bold text-center mb-4 leading-snug">{headline}</h1>
            <p className="text-muted-foreground text-center leading-relaxed max-w-sm mb-8">{description}</p>
            <ContinueButton onClick={onNext} />
        </Container>
    );
}

function MomentumKillersScreen({ onNext, selected, onToggle }: { onNext: () => void; selected: string[]; onToggle: (id: string) => void }) {
    return (
        <Container>
            <div className="text-5xl mb-4">💔</div>
            <h1 className="text-2xl font-bold text-center mb-3">What usually kills<br />your momentum?</h1>
            <p className="text-muted-foreground text-center mb-6">Pick the ones that hit different 😅</p>
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
                {momentumKillers.map(item => {
                    const isSelected = selected.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => onToggle(item.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 cursor-pointer transition-all",
                                isSelected ? "border-red-400 bg-red-500/10 scale-105" : "border-border bg-card hover:border-muted-foreground/40"
                            )}
                        >
                            {isSelected && <div className="absolute -top-2 -right-2 text-2xl">💥</div>}
                            <span className={cn("text-4xl mb-2 transition-transform", isSelected && "scale-125")}>{item.emoji}</span>
                            <span className={cn("text-sm font-semibold", isSelected ? "text-red-400" : "text-muted-foreground")}>{item.label}</span>
                        </button>
                    );
                })}
            </div>
            {selected.length > 0 && <p className="text-red-400 text-sm font-semibold mb-4">😤 {selected.length} pain points identified</p>}
            <ContinueButton onClick={onNext} disabled={selected.length === 0} />
        </Container>
    );
}

function ConsistencyScaleScreen({ onNext, value, onChange }: { onNext: () => void; value: number; onChange: (v: number) => void }) {
    const getColor = (val: number) => val <= 3 ? "#FF6B6B" : val <= 6 ? "#FFEAA7" : "#00D9A5";
    const getMessage = (val: number) => {
        if (val <= 2) return { text: "We've all been there 😅", emoji: "📈" };
        if (val <= 4) return { text: "Room for growth!", emoji: "💪" };
        if (val <= 6) return { text: "Getting there!", emoji: "🌱" };
        if (val <= 8) return { text: "Pretty solid!", emoji: "⭐" };
        return { text: "Impressive!", emoji: "🚀" };
    };
    const msg = getMessage(value);

    return (
        <Container>
            <div className="text-5xl mb-4">📊</div>
            <h1 className="text-2xl font-bold text-center mb-3">How consistent are you<br />with your goals?</h1>
            <p className="text-muted-foreground text-center mb-10">Rate yourself 1-10</p>

            <div className="text-[140px] font-black leading-none mb-6 transition-all duration-300" style={{ color: getColor(value), transform: `scale(${0.9 + value / 100})` }}>
                {value}
            </div>

            <div className="flex gap-1.5 w-full mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <button
                        key={num}
                        onClick={() => onChange(num)}
                        className={cn(
                            "flex-1 aspect-square rounded-lg text-sm font-bold transition-all cursor-pointer",
                            value === num ? "text-white scale-115 border-2" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                        )}
                        style={value === num ? { background: getColor(num), borderColor: getColor(num), boxShadow: `0 4px 20px ${getColor(num)}80` } : undefined}
                    >
                        {num}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 px-5 py-3 rounded-xl mb-8" style={{ background: `${getColor(value)}15` }}>
                <span className="text-2xl">{msg.emoji}</span>
                <span className="text-base font-semibold" style={{ color: getColor(value) }}>{msg.text}</span>
            </div>

            <ContinueButton onClick={onNext} />
        </Container>
    );
}

function TestimonialScreen({ onNext }: { onNext: () => void }) {
    const [activeIndex, setActiveIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setActiveIndex(prev => (prev + 1) % testimonials.length), 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Container>
            <div className="text-5xl mb-4">💬</div>
            <h1 className="text-2xl font-bold text-center mb-6">This could be you!</h1>

            <div className="w-full mb-8">
                {testimonials.map((t, i) => (
                    <Card key={i} className={cn("animate-in fade-in duration-500", i === activeIndex ? "block" : "hidden")}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full border border-border overflow-hidden">
                                    <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="font-semibold">{t.name}</div>
                                    <div className="text-xs text-green-500 font-medium">🔥 {t.streak} day streak</div>
                                </div>
                            </div>
                            <p className="text-lg leading-relaxed italic">&quot;{t.text}&quot;</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex gap-2 mb-6">
                {testimonials.map((_, i) => (
                    <button key={i} onClick={() => setActiveIndex(i)} className={cn("h-2 rounded-full transition-all cursor-pointer", i === activeIndex ? "w-6 bg-primary" : "w-2 bg-border")} />
                ))}
            </div>

            <ContinueButton onClick={onNext} />
        </Container>
    );
}

function GoalSelectionScreen({ onNext, selected, onToggle }: { onNext: () => void; selected: string[]; onToggle: (id: string) => void }) {
    return (
        <Container>
            <div className="text-5xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-center mb-3">What are you<br />working towards?</h1>
            <p className="text-muted-foreground text-center mb-6">We&apos;ll match you with the right groups</p>

            <div className="grid grid-cols-2 gap-3 w-full mb-6">
                {goalTypes.map(item => {
                    const isSelected = selected.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => onToggle(item.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 cursor-pointer transition-all",
                                isSelected ? "border-primary bg-primary/10 scale-[1.02]" : "border-border bg-card hover:border-muted-foreground/40"
                            )}
                        >
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check size={12} className="text-primary-foreground" />
                                </div>
                            )}
                            <span className="text-3xl mb-2">{item.emoji}</span>
                            <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-muted-foreground")}>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {selected.length > 0 && <p className="text-green-500 text-sm font-semibold mb-4">✨ {selected.length} selected</p>}
            <ContinueButton onClick={onNext} disabled={selected.length === 0} />
        </Container>
    );
}

function AppPreviewGroupsScreen({ onNext }: { onNext: () => void }) {
    return (
        <Container>
            <Badge variant="outline" className="mb-3 text-primary border-primary/30">App Preview</Badge>
            <h1 className="text-2xl font-bold text-center mb-2">Find your tribe</h1>
            <p className="text-muted-foreground text-center mb-6">Join small groups of like-minded people</p>

            <div className="w-full space-y-3 mb-6">
                {sampleGroups.map((group, i) => (
                    <Card key={i} className="animate-in fade-in duration-400" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
                        <CardContent className="p-4 flex items-center gap-3.5">
                            <div className="w-13 h-13 rounded-xl bg-primary/10 flex items-center justify-center text-3xl shrink-0">{group.emoji}</div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold mb-0.5">{group.name}</div>
                                <div className="text-xs text-muted-foreground">{group.members} members • {group.streak}</div>
                            </div>
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Join</Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mb-6">Small groups (5-30 people) = more accountability</p>
            <ContinueButton onClick={onNext} />
        </Container>
    );
}

function AppPreviewCheckInScreen({ onNext }: { onNext: () => void }) {
    const [liked, setLiked] = useState(false);
    return (
        <Container>
            <Badge variant="outline" className="mb-3 text-primary border-primary/30">App Preview</Badge>
            <h1 className="text-2xl font-bold text-center mb-2">Daily check-ins</h1>
            <p className="text-muted-foreground text-center mb-6">Share your progress, get support</p>

            <Card className="w-full mb-6">
                <div className="flex items-center gap-3 p-4 border-b border-border">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img src="/images/avatars/vladimir.png" alt="Alex M." className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-sm">Alex M.</div>
                        <div className="text-xs text-muted-foreground">Just now • Day 12</div>
                    </div>
                    <Badge variant="secondary" className="text-green-500 text-xs">🔥 12</Badge>
                </div>
                <CardContent className="p-4">
                    <p className="text-sm leading-relaxed mb-4">Did a 20 min workout before work! 💪 Small win but staying consistent. Thanks for the push yesterday @Sarah!</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setLiked(!liked)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border",
                                liked ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border text-muted-foreground"
                            )}
                        >
                            {liked ? "🔥" : "👍"} {liked ? "5" : "4"}
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-muted border border-border text-muted-foreground">💬 2</button>
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center mb-6">Your group sees when you&apos;re inactive 👀</p>
            <ContinueButton onClick={onNext} />
        </Container>
    );
}

function AppPreviewStreakScreen({ onNext }: { onNext: () => void }) {
    return (
        <Container>
            <Badge variant="outline" className="mb-3 text-primary border-primary/30">App Preview</Badge>
            <h1 className="text-2xl font-bold text-center mb-2">Watch yourself grow</h1>
            <p className="text-muted-foreground text-center mb-6">Track streaks & climb the leaderboard</p>

            <Card className="w-full mb-4 text-center">
                <CardContent className="p-6">
                    <div className="text-7xl font-extrabold text-primary mb-2">23</div>
                    <div className="text-muted-foreground font-medium">🔥 Day Streak</div>
                </CardContent>
            </Card>

            <Card className="w-full mb-6 overflow-hidden">
                <div className="px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">🏆 Group Leaderboard</div>
                {[
                    { rank: 1, name: "Sarah K.", streak: 47, you: false },
                    { rank: 2, name: "You", streak: 23, you: true },
                    { rank: 3, name: "Marcus T.", streak: 19, you: false },
                ].map((member, i) => (
                    <div key={i} className={cn("flex items-center gap-3 px-4 py-3", member.you && "bg-primary/5", i < 2 && "border-b border-border")}>
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-background"
                            style={{ background: member.rank === 1 ? "#FFD700" : member.rank === 2 ? "#C0C0C0" : "#CD7F32" }}
                        >
                            {member.rank}
                        </div>
                        <div className={cn("flex-1", member.you && "font-semibold")}>{member.name}</div>
                        <div className="text-sm text-green-500 font-semibold">🔥 {member.streak}</div>
                    </div>
                ))}
            </Card>

            <ContinueButton onClick={onNext} />
        </Container>
    );
}

function CommunityQuestionScreen({ onNext }: { onNext: () => void }) {
    return (
        <Container>
            <div className="text-5xl mb-4">🤝</div>
            <h1 className="text-2xl font-bold text-center mb-3">Ready to join a<br />supportive community?</h1>
            <p className="text-muted-foreground text-center mb-8">People who cheer you on & keep you accountable</p>
            <div className="flex gap-4 w-full">
                {[
                    { id: "definitely", label: "Let's do this!", emoji: "🙌" },
                    { id: "maybe", label: "Tell me more", emoji: "🤔" },
                ].map(option => (
                    <button
                        key={option.id}
                        onClick={() => setTimeout(onNext, 300)}
                        className="flex-1 p-8 rounded-2xl border-2 border-border bg-card cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
                    >
                        <div className="text-5xl mb-3">{option.emoji}</div>
                        <div className="text-lg font-semibold">{option.label}</div>
                    </button>
                ))}
            </div>
        </Container>
    );
}

function InterestsScreen({ onNext, selected, onToggle }: { onNext: () => void; selected: string[]; onToggle: (id: string) => void }) {
    return (
        <Container>
            <div className="text-5xl mb-4">✨</div>
            <h1 className="text-2xl font-bold text-center mb-3">Final step!<br />Pick your interests</h1>
            <p className="text-muted-foreground text-center mb-6">We&apos;ll recommend groups you&apos;ll love</p>

            <div className="grid grid-cols-4 gap-2.5 w-full mb-6">
                {interests.map(item => {
                    const isSelected = selected.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => onToggle(item.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all",
                                isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-muted-foreground/40"
                            )}
                        >
                            <span className="text-2xl mb-1">{item.emoji}</span>
                            <span className={cn("text-[11px] font-semibold", isSelected ? "text-primary" : "text-muted-foreground")}>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {selected.length > 0 && <p className="text-green-500 text-sm font-semibold mb-4">✨ {selected.length} selected</p>}
            <ContinueButton onClick={onNext} disabled={selected.length === 0} />
        </Container>
    );
}

function NameScreen({ onNext, name, onChange }: { onNext: () => void; name: string; onChange: (n: string) => void }) {
    const isValid = name.trim().length >= 2;
    return (
        <Container>
            <div className="text-6xl mb-6">👋</div>
            <h1 className="text-2xl font-bold text-center mb-3">What should we<br />call you?</h1>
            <p className="text-muted-foreground text-center mb-8">This is how you&apos;ll appear in groups</p>
            <Input
                type="text"
                value={name}
                onChange={e => onChange(e.target.value)}
                placeholder="Your name"
                autoFocus
                className={cn("w-full h-14 text-xl text-center font-semibold rounded-xl mb-4 border-2", isValid ? "border-primary" : "border-border")}
            />
            {isValid && <p className="text-green-500 font-semibold mb-6">Nice to meet you, {name}! 🎉</p>}
            <ContinueButton onClick={onNext} disabled={!isValid} />
        </Container>
    );
}

function ReadyScreen({ onComplete, name }: { onComplete: () => void; name: string }) {
    return (
        <Container>
            <div className="text-7xl mb-6 animate-pulse">🎉</div>
            <h1 className="text-3xl font-bold text-center mb-3">Welcome, {name}!</h1>
            <p className="text-lg text-muted-foreground text-center mb-8">
                Your accountability journey starts now.<br />Let&apos;s find your perfect group.
            </p>

            <Card className="w-full mb-8">
                <CardContent className="p-5">
                    <div className="text-sm font-semibold text-muted-foreground mb-3">✨ What happens next:</div>
                    {["Browse groups that match your interests", "Join one that feels right", "Post your first check-in today"].map((item, i) => (
                        <div key={i} className={cn("flex items-center gap-2.5 text-sm text-muted-foreground", i < 2 && "mb-2.5")}>
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                            {item}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <ContinueButton onClick={onComplete} label="Find my group →" />
        </Container>
    );
}

/* ──────────────────── MAIN ──────────────────── */

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
            const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
            if (count) setUserCount(count);
        };
        fetchUserCount();
    }, []);

    const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
        setter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const nextStep = () => setStep(step + 1);
    const handleComplete = () => router.push("/login?next=/");
    const totalSteps = 15;

    const screens = [
        <HumanWelcomeScreen key="welcome" onNext={nextStep} userCount={userCount} />,
        <DraggableSliderScreen key="slider" onNext={nextStep} value={sliderValue} onChange={setSliderValue} />,
        <AnimatedStatScreen key="stat1" onNext={nextStep} emoji="📉" stat="92%" headline="of resolutions fail by February" description="The #1 reason? No accountability. No one watching. No consequences for quitting." color="#FF6B6B" />,
        <MomentumKillersScreen key="momentum" onNext={nextStep} selected={momentumKillersSelected} onToggle={toggle(setMomentumKillersSelected)} />,
        <AnimatedStatScreen key="stat2" onNext={nextStep} emoji="🔬" stat="65%" headline="more likely to succeed with a partner" description="And 95% more likely with regular check-ins. Science says accountability works." color="#00D9A5" />,
        <TestimonialScreen key="testimonials" onNext={nextStep} />,
        <GoalSelectionScreen key="goals" onNext={nextStep} selected={goalTypesSelected} onToggle={toggle(setGoalTypesSelected)} />,
        <ConsistencyScaleScreen key="scale" onNext={nextStep} value={consistencyScore} onChange={setConsistencyScore} />,
        <AppPreviewGroupsScreen key="preview-groups" onNext={nextStep} />,
        <AppPreviewCheckInScreen key="preview-checkin" onNext={nextStep} />,
        <AppPreviewStreakScreen key="preview-streak" onNext={nextStep} />,
        <CommunityQuestionScreen key="community" onNext={nextStep} />,
        <InterestsScreen key="interests" onNext={nextStep} selected={selectedInterests} onToggle={toggle(setSelectedInterests)} />,
        <NameScreen key="name" onNext={nextStep} name={name} onChange={setName} />,
        <ReadyScreen key="ready" onComplete={handleComplete} name={name} />,
    ];

    if (step >= screens.length) return <ReadyScreen key="ready" onComplete={handleComplete} name={name} />;

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <ProgressBar current={step} total={totalSteps} />
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                {screens[step]}
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <OnboardingContent />
        </Suspense>
    );
}
