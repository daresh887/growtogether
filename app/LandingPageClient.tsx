"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// DATA
// ============================================

const testimonials = [
    { name: "Sarah K.", streak: 47, text: "Finally finished my side project!", avatar: "👩‍💼" },
    { name: "Marcus T.", streak: 89, text: "Lost 30 lbs with my group!", avatar: "👨‍🎨" },
    { name: "Elena R.", streak: 156, text: "Learned Spanish in 6 months!", avatar: "👩‍💻" },
];

const sampleGroups = [
    { name: "Morning Runners", emoji: "🏃", members: 24, color: "text-red-400", bg: "bg-red-500/10" },
    { name: "Code Every Day", emoji: "💻", members: 156, color: "text-primary", bg: "bg-primary/10" },
    { name: "Learn Spanish", emoji: "🇪🇸", members: 89, color: "text-green-400", bg: "bg-green-500/10" },
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
            if (start >= target) { setCount(target); clearInterval(timer); }
            else { setCount(Math.floor(start)); }
        }, 16);
        return () => clearInterval(timer);
    }, [hasStarted, target, duration]);

    return <>{count}{suffix}</>;
}

function TypewriterText({ texts, speed = 50, pause = 3000 }: { texts: string[]; speed?: number; pause?: number }) {
    const [textIndex, setTextIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentText = texts[textIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (charIndex < currentText.length) setCharIndex(charIndex + 1);
                else setTimeout(() => setIsDeleting(true), pause);
            } else {
                if (charIndex > 0) setCharIndex(charIndex - 1);
                else { setIsDeleting(false); setTextIndex((textIndex + 1) % texts.length); }
            }
        }, isDeleting ? speed / 2 : speed);
        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, textIndex, texts, speed, pause]);

    return (
        <span>
            {texts[textIndex].slice(0, charIndex)}
            <span className="border-r-2 border-current animate-pulse ml-0.5" />
        </span>
    );
}

// ============================================
// SECTION COMPONENTS
// ============================================

function HeroSection({ userCount }: { userCount: number }) {
    return (
        <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
            {/* Live counter badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20 mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-500 font-medium">
                    <AnimatedCounter target={userCount} /> people growing together right now
                </span>
            </div>

            {/* Main headline */}
            <h1 className="text-[clamp(36px,8vw,72px)] font-extrabold leading-[1.1] tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                Stop quitting.<br />
                <span className="text-primary">
                    Start finishing.
                </span>
            </h1>

            {/* Dynamic subtitle */}
            <p className="text-[clamp(16px,3vw,22px)] text-muted-foreground max-w-xl mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                Join small accountability groups for{" "}
                <span className="text-primary font-semibold">
                    <TypewriterText
                        texts={["fitness", "studying", "locking in", "getting shredded", "hustling", "self improvement", "shipping apps", "being consistent", "learning languages", "reading books"]}
                        pause={3000}
                    />
                </span>
            </p>

            <p className="text-sm text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                Real people. Daily check-ins. No more quitting alone.
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-3 flex-wrap justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                <Button asChild size="lg" className="px-8 py-6 text-base font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:-translate-y-0.5">
                    <Link href="/onboarding">
                        Start Free <ArrowRight size={18} className="ml-2" />
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-8 py-6 text-base rounded-xl">
                    <Link href="/login">Log in</Link>
                </Button>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="w-6 h-10 rounded-xl border-2 border-border flex justify-center pt-2">
                    <div className="w-1 h-2 rounded bg-muted-foreground animate-pulse" />
                </div>
            </div>
        </section>
    );
}

function HowItWorksSection() {
    const steps = [
        { number: "01", emoji: "👥", title: "Join a group", desc: "Find people with your exact goal. Small groups (5-30) mean real connection.", color: "text-primary border-primary" },
        { number: "02", emoji: "📝", title: "Check in daily", desc: "Post your progress. Share wins, struggles, questions. Get support.", color: "text-green-400 border-green-400" },
        { number: "03", emoji: "🔥", title: "Build your streak", desc: "Your group sees when you're active. Streak = visible consistency.", color: "text-yellow-400 border-yellow-400" },
        { number: "04", emoji: "🏆", title: "Level up together", desc: "Compete on leaderboards. Celebrate wins. Never feel alone again.", color: "text-red-400 border-red-400" },
    ];

    return (
        <section className="py-20 px-6 max-w-6xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-[clamp(28px,5vw,44px)] font-extrabold mb-3">How it works</h2>
                <p className="text-muted-foreground text-lg">4 simple steps to actually finish what you start</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {steps.map((step, i) => (
                    <Card key={i} className="group hover:-translate-y-2 transition-all duration-300 hover:border-primary/50">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-4xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">{step.emoji}</span>
                                <span className={cn("text-sm font-bold opacity-70", step.color.split(" ")[0])}>{step.number}</span>
                            </div>
                            <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{step.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}

function AppPreviewSection() {
    const [activeTab, setActiveTab] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    return (
        <section className="py-20 px-6 bg-muted/30">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">What you get</p>
                    <h2 className="text-[clamp(28px,5vw,44px)] font-extrabold mb-3">See the real app</h2>
                    <p className="text-muted-foreground text-lg">Interactive previews of what you&apos;ll use daily</p>
                </div>

                {/* Tab buttons */}
                <div className="flex justify-center gap-2 mb-8 flex-wrap">
                    {["Groups", "Check-ins", "Streaks"].map((tab, i) => (
                        <Button
                            key={tab}
                            onClick={() => setActiveTab(i)}
                            variant={activeTab === i ? "default" : "outline"}
                            size="sm"
                            className={cn("rounded-lg", activeTab === i && "scale-105")}
                        >
                            {tab}
                        </Button>
                    ))}
                </div>

                {/* Preview content */}
                <Card className="min-h-[400px]">
                    <CardContent className="p-8">
                        {activeTab === 0 && (
                            <div className="animate-in fade-in duration-500">
                                <h3 className="text-lg font-semibold mb-5 text-muted-foreground">Find your perfect group</h3>
                                <div className="space-y-3">
                                    {sampleGroups.map((group, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 p-5 bg-muted/50 rounded-2xl border border-border hover:border-primary/50 hover:translate-x-2 transition-all cursor-pointer"
                                        >
                                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-3xl", group.bg)}>
                                                {group.emoji}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold mb-1">{group.name}</div>
                                                <div className="text-xs text-muted-foreground">{group.members} members · 🔥 Active</div>
                                            </div>
                                            <Badge variant="secondary" className={cn("font-semibold", group.color)}>Join</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 1 && (
                            <div className="animate-in fade-in duration-500">
                                <h3 className="text-lg font-semibold mb-5 text-muted-foreground">Daily check-ins with your group</h3>
                                <Card>
                                    <CardContent className="p-0">
                                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-xl">👨‍💻</div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">Alex M.</div>
                                                <div className="text-xs text-muted-foreground">Just now · Day 23</div>
                                            </div>
                                            <Badge variant="secondary" className="text-green-500">🔥 23</Badge>
                                        </div>
                                        <div className="p-5">
                                            <p className="text-sm leading-relaxed mb-5">
                                                Did a 30 min workout before work! 💪 Small win but staying consistent.
                                            </p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setIsLiked(!isLiked)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer",
                                                        isLiked ? "border-primary bg-primary/10 text-primary scale-105" : "border-border text-muted-foreground"
                                                    )}
                                                >
                                                    {isLiked ? "🔥" : "👍"} {isLiked ? "8" : "7"}
                                                </button>
                                                <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground cursor-pointer">
                                                    💬 3
                                                </button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {activeTab === 2 && (
                            <div className="animate-in fade-in duration-500">
                                <h3 className="text-lg font-semibold mb-5 text-muted-foreground">Track your progress</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Card>
                                        <CardContent className="py-8 text-center">
                                            <div className="text-5xl font-extrabold text-primary mb-2">
                                                <AnimatedCounter target={23} />
                                            </div>
                                            <div className="text-muted-foreground font-medium">🔥 Day Streak</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-0">
                                            <div className="px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
                                                🏆 Leaderboard
                                            </div>
                                            {[
                                                { rank: 1, name: "Sarah K.", streak: 47 },
                                                { rank: 2, name: "You", streak: 23 },
                                                { rank: 3, name: "Marcus", streak: 19 },
                                            ].map((m, i) => (
                                                <div key={i} className={cn("flex items-center gap-2.5 px-4 py-2.5", m.rank === 2 && "bg-primary/5 rounded")}>
                                                    <span className={cn(
                                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                        m.rank === 1 ? "bg-yellow-500 text-black" : m.rank === 2 ? "bg-gray-400 text-black" : "bg-amber-700 text-white"
                                                    )}>
                                                        {m.rank}
                                                    </span>
                                                    <span className={cn("flex-1 text-sm", m.rank === 2 && "font-semibold")}>{m.name}</span>
                                                    <span className="text-xs text-green-400 font-semibold">🔥 {m.streak}</span>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}

function StatsSection({ userCount }: { userCount: number }) {
    const stats = [
        { value: 92, suffix: "%", label: "of people fail alone", color: "text-red-400" },
        { value: 65, suffix: "%", label: "more likely to succeed with a partner", color: "text-primary" },
        { value: 23, suffix: "", label: "average day streak", prefix: "🔥 ", color: "text-green-400" },
        { value: userCount, suffix: "+", label: "active members", color: "text-violet-400" },
    ];

    return (
        <section className="py-20 px-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                {stats.map((stat, i) => (
                    <Card key={i}>
                        <CardContent className="py-8 px-6">
                            <div className={cn("text-4xl font-extrabold mb-2", stat.color)}>
                                {stat.prefix}<AnimatedCounter target={stat.value} suffix={stat.suffix} />
                            </div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}

function TestimonialsSection() {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setActiveIndex(prev => (prev + 1) % testimonials.length), 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-20 px-6 bg-muted/30">
            <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-[clamp(28px,5vw,44px)] font-extrabold mb-12">This could be you!</h2>

                <div className="relative min-h-[200px]">
                    {testimonials.map((t, i) => (
                        <div
                            key={i}
                            className={cn(
                                "absolute inset-x-0 top-0 transition-all duration-500",
                                i === activeIndex ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                            )}
                        >
                            <div className="text-6xl mb-4">{t.avatar}</div>
                            <p className="text-2xl italic mb-4">&quot;{t.text}&quot;</p>
                            <div className="text-muted-foreground">
                                <strong>{t.name}</strong> · 🔥 {t.streak} day streak
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center gap-2 mt-8">
                    {testimonials.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            className={cn(
                                "h-2.5 rounded-full transition-all cursor-pointer",
                                i === activeIndex ? "w-8 bg-primary" : "w-2.5 bg-border"
                            )}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

function CTASection() {
    return (
        <section className="py-24 px-6 text-center relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-[clamp(32px,6vw,56px)] font-extrabold mb-4 tracking-tight">
                    Ready to actually finish?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
                    Join thousands who stopped quitting and started growing together.
                </p>
                <Button asChild size="lg" className="px-12 py-7 text-lg font-bold rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:-translate-y-1">
                    <Link href="/onboarding">
                        Get Started Free <Rocket size={20} className="ml-2" />
                    </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">No credit card required · Free forever</p>
            </div>
        </section>
    );
}

// ============================================
// MAIN CLIENT COMPONENT
// ============================================

export default function LandingPageClient({ userCount }: { userCount: number }) {
    return (
        <div className="bg-background text-foreground min-h-screen">
            <HeroSection userCount={userCount} />
            <HowItWorksSection />
            <AppPreviewSection />
            <StatsSection userCount={userCount} />
            <TestimonialsSection />
            <CTASection />
        </div>
    );
}
