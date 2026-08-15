"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import {
    getMyBuddyProfile,
    getBuddyRecommendations,
    getBuddyRequests,
    getMyBuddies,
    upsertBuddyProfile,
    sendBuddyRequest,
    cancelBuddyRequest,
    respondToBuddyRequest,
    type BuddyProfileData,
    type BuddyMatch,
    type BuddyRequestItem,
    type BuddyPairSummary,
} from "@/app/actions/buddies";
import {
    BUDDY_STYLES,
    BUDDY_CADENCES,
    BUDDY_REGIONS,
    BUDDY_FOCUS_AREAS,
    BUDDY_INTENSITIES,
    ONBOARDING_PREFS_KEY,
    styleById,
    cadenceById,
} from "@/utils/buddy-constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Loader2, Check, ArrowLeft, ArrowRight, Handshake, Pencil, Flame, Send, X, Users, Sparkles } from "lucide-react";

/* ============================================
   COMPATIBILITY RING — the signature element
   ============================================ */

function MatchRing({ score, size = 64 }: { score: number; size?: number }) {
    const stroke = 5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const filled = (score / 100) * circumference;
    const color = score >= 70 ? "#fbbf24" : score >= 45 ? "#60a5fa" : "#6b7280";

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={`${filled} ${circumference}`}
                    className="transition-[stroke-dasharray] duration-700"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-sm font-extrabold" style={{ color }}>{score}%</span>
            </div>
        </div>
    );
}

function Avatar({ person, size = 48 }: { person: { displayName: string; avatarUrl: string | null; avatarEmoji: string }; size?: number }) {
    return (
        <div
            className="rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0"
            style={{ width: size, height: size, fontSize: size * 0.5 }}
        >
            {person.avatarUrl
                ? <img src={person.avatarUrl} alt={person.displayName} className="w-full h-full object-cover" />
                : <span>{person.avatarEmoji}</span>}
        </div>
    );
}

/* ============================================
   SETUP WIZARD — "what do you look for in a buddy?"
   ============================================ */

type WizardState = {
    focusAreas: string[];
    goal: string;
    cadence: string;
    intensity: number;
    style: string;
    lookingFor: string[];
    region: string;
    pitch: string;
};

const DEFAULT_WIZARD: WizardState = {
    focusAreas: [],
    goal: "",
    cadence: "daily",
    intensity: 3,
    style: "hype",
    lookingFor: [],
    region: "europe",
    pitch: "",
};

function SetupWizard({ initial, isEdit, onDone, onCancel }: {
    initial: WizardState;
    isEdit: boolean;
    onDone: () => void;
    onCancel?: () => void;
}) {
    const [step, setStep] = useState(0);
    const [state, setState] = useState<WizardState>(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleIn = (key: "focusAreas" | "lookingFor", id: string) =>
        setState(s => ({
            ...s,
            [key]: s[key].includes(id) ? s[key].filter(x => x !== id) : [...s[key], id],
        }));

    const canContinue = [
        state.focusAreas.length > 0 && state.goal.trim().length >= 3,
        true,
        state.lookingFor.length > 0,
        true,
    ][step];

    const finish = async () => {
        setSaving(true);
        setError(null);
        try {
            await upsertBuddyProfile({ ...state, isLooking: true, goal: state.goal.trim(), pitch: state.pitch.trim() });
            onDone();
        } catch (e: any) {
            setError(e.message || "Something went wrong");
            setSaving(false);
        }
    };

    const stepTitles = [
        { title: "What are you working on?", sub: "We'll match you with someone chasing something similar" },
        { title: "Your rhythm", sub: "How often do you want to check in with each other?" },
        { title: "What do you look for in a buddy?", sub: "Pick the accountability style that actually works on you" },
        { title: "Last touch", sub: "Help your future buddy pick you" },
    ];

    return (
        <div className="max-w-lg mx-auto">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {stepTitles.map((_, i) => (
                    <div key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-8 bg-amber-400" : i < step ? "w-4 bg-amber-400/50" : "w-4 bg-border")} />
                ))}
            </div>

            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-1">{stepTitles[step].title}</h2>
                <p className="text-muted-foreground text-sm">{stepTitles[step].sub}</p>
            </div>

            {/* Step 0: focus + goal */}
            {step === 0 && (
                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-2.5">
                        {BUDDY_FOCUS_AREAS.map(item => {
                            const isSelected = state.focusAreas.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleIn("focusAreas", item.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all",
                                        isSelected ? "border-amber-400 bg-amber-500/10" : "border-border bg-card hover:border-muted-foreground/40"
                                    )}
                                >
                                    <span className="text-2xl mb-1">{item.emoji}</span>
                                    <span className={cn("text-[11px] font-semibold", isSelected ? "text-amber-400" : "text-muted-foreground")}>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-muted-foreground block mb-2">Your #1 goal right now</label>
                        <Input
                            value={state.goal}
                            onChange={e => setState(s => ({ ...s, goal: e.target.value }))}
                            placeholder="e.g. Ship my app by October"
                            maxLength={200}
                            className="h-12 rounded-xl"
                        />
                    </div>
                </div>
            )}

            {/* Step 1: cadence + intensity */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        {BUDDY_CADENCES.map(c => {
                            const isSelected = state.cadence === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setState(s => ({ ...s, cadence: c.id }))}
                                    className={cn(
                                        "flex flex-col items-center p-5 rounded-2xl border-2 cursor-pointer transition-all",
                                        isSelected ? "border-amber-400 bg-amber-500/10 scale-[1.02]" : "border-border bg-card hover:border-muted-foreground/40"
                                    )}
                                >
                                    <span className="text-3xl mb-2">{c.emoji}</span>
                                    <span className={cn("text-sm font-semibold", isSelected ? "text-amber-400" : "text-muted-foreground")}>{c.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-muted-foreground block mb-3">
                            How hard should your buddy push you?
                        </label>
                        <div className="flex gap-1.5">
                            {BUDDY_INTENSITIES.map(lvl => (
                                <button
                                    key={lvl.value}
                                    onClick={() => setState(s => ({ ...s, intensity: lvl.value }))}
                                    className={cn(
                                        "flex-1 py-3 rounded-lg text-sm font-bold border transition-all cursor-pointer",
                                        state.intensity === lvl.value
                                            ? "bg-amber-500/20 border-amber-400 text-amber-400 scale-105"
                                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {lvl.value}
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-sm text-amber-400 font-semibold mt-3">
                            {BUDDY_INTENSITIES.find(l => l.value === state.intensity)?.label}
                        </p>
                    </div>
                </div>
            )}

            {/* Step 2: style you want + style you are */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="space-y-2.5">
                        {BUDDY_STYLES.map(s => {
                            const isSelected = state.lookingFor.includes(s.id);
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => toggleIn("lookingFor", s.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 text-left cursor-pointer transition-all",
                                        isSelected ? "border-amber-400 bg-amber-500/10" : "border-border bg-card hover:border-muted-foreground/40"
                                    )}
                                >
                                    <span className="text-3xl">{s.emoji}</span>
                                    <div className="flex-1">
                                        <div className={cn("font-semibold text-sm", isSelected && "text-amber-400")}>{s.label}</div>
                                        <div className="text-xs text-muted-foreground">{s.blurb}</div>
                                    </div>
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                                            <Check size={12} className="text-black" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-muted-foreground block mb-2">And which one are you?</label>
                        <div className="grid grid-cols-4 gap-2">
                            {BUDDY_STYLES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setState(st => ({ ...st, style: s.id }))}
                                    className={cn(
                                        "flex flex-col items-center p-2.5 rounded-xl border-2 cursor-pointer transition-all",
                                        state.style === s.id ? "border-amber-400 bg-amber-500/10" : "border-border bg-card hover:border-muted-foreground/40"
                                    )}
                                >
                                    <span className="text-xl mb-1">{s.emoji}</span>
                                    <span className={cn("text-[10px] font-semibold text-center leading-tight", state.style === s.id ? "text-amber-400" : "text-muted-foreground")}>{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: region + pitch */}
            {step === 3 && (
                <div className="space-y-5">
                    <div>
                        <label className="text-sm font-semibold text-muted-foreground block mb-2">Your timezone region</label>
                        <div className="grid grid-cols-3 gap-2.5">
                            {BUDDY_REGIONS.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => setState(s => ({ ...s, region: r.id }))}
                                    className={cn(
                                        "flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                                        state.region === r.id ? "border-amber-400 bg-amber-500/10" : "border-border bg-card hover:border-muted-foreground/40"
                                    )}
                                >
                                    <span className="text-2xl mb-1">{r.emoji}</span>
                                    <span className={cn("text-xs font-semibold", state.region === r.id ? "text-amber-400" : "text-muted-foreground")}>{r.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-muted-foreground block mb-2">
                            Your pitch <span className="font-normal">(optional — shown on your match card)</span>
                        </label>
                        <Textarea
                            value={state.pitch}
                            onChange={e => setState(s => ({ ...s, pitch: e.target.value }))}
                            placeholder="e.g. Training for my first half marathon. I never miss a check-in and I expect the same from you."
                            maxLength={300}
                            rows={3}
                            className="rounded-xl resize-none"
                        />
                    </div>
                </div>
            )}

            {error && <p className="text-destructive text-sm text-center mt-4">{error}</p>}

            <div className="flex gap-3 mt-8">
                {step > 0 ? (
                    <Button variant="outline" size="lg" className="rounded-xl h-12" onClick={() => setStep(step - 1)}>
                        <ArrowLeft size={16} />
                    </Button>
                ) : isEdit && onCancel ? (
                    <Button variant="outline" size="lg" className="rounded-xl h-12" onClick={onCancel}>Cancel</Button>
                ) : null}
                {step < 3 ? (
                    <Button
                        size="lg"
                        disabled={!canContinue}
                        onClick={() => setStep(step + 1)}
                        className="flex-1 h-12 rounded-xl font-semibold bg-amber-500 hover:bg-amber-400 text-black"
                    >
                        Continue <ArrowRight size={16} className="ml-1.5" />
                    </Button>
                ) : (
                    <Button
                        size="lg"
                        disabled={saving}
                        onClick={finish}
                        className="flex-1 h-12 rounded-xl font-semibold bg-amber-500 hover:bg-amber-400 text-black"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <>{isEdit ? "Save preferences" : "Show my matches"} <Sparkles size={16} className="ml-1.5" /></>}
                    </Button>
                )}
            </div>
        </div>
    );
}

/* ============================================
   MATCH CARD
   ============================================ */

function MatchCard({ match, onRequest }: { match: BuddyMatch; onRequest: (m: BuddyMatch) => void }) {
    const style = styleById(match.profile.style);
    const cadence = cadenceById(match.profile.cadence);

    return (
        <Card className="hover:border-amber-400/50 transition-colors">
            <CardContent className="p-5">
                <div className="flex items-start gap-4 mb-4">
                    <Avatar person={match.person} size={52} />
                    <div className="flex-1 min-w-0">
                        <Link href={`/profile/${match.person.id}`} className="font-bold hover:text-amber-400 transition-colors">
                            {match.person.displayName}
                        </Link>
                        {match.profile.goal && (
                            <p className="text-sm text-muted-foreground truncate">&ldquo;{match.profile.goal}&rdquo;</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {style && <Badge variant="secondary" className="text-xs">{style.emoji} {style.label}</Badge>}
                            {cadence && <Badge variant="secondary" className="text-xs">{cadence.emoji} {cadence.short}</Badge>}
                        </div>
                    </div>
                    <MatchRing score={match.score} />
                </div>

                {match.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {match.reasons.map((r, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                ✓ {r}
                            </span>
                        ))}
                    </div>
                )}

                {match.profile.pitch && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">{match.profile.pitch}</p>
                )}

                {match.requestStatus === "sent" ? (
                    <Button disabled variant="outline" className="w-full rounded-xl">Request sent ✓</Button>
                ) : match.requestStatus === "received" ? (
                    <Button disabled variant="outline" className="w-full rounded-xl text-amber-400 border-amber-500/30">
                        They already asked you — check Requests
                    </Button>
                ) : (
                    <Button
                        onClick={() => onRequest(match)}
                        className="w-full rounded-xl font-semibold bg-amber-500 hover:bg-amber-400 text-black"
                    >
                        <Handshake size={16} className="mr-2" /> Ask to be buddies
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function BuddiesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<BuddyProfileData | null>(null);
    const [matches, setMatches] = useState<BuddyMatch[]>([]);
    const [requests, setRequests] = useState<{ incoming: BuddyRequestItem[]; outgoing: BuddyRequestItem[] }>({ incoming: [], outgoing: [] });
    const [buddies, setBuddies] = useState<BuddyPairSummary[]>([]);
    const [tab, setTab] = useState<"matches" | "requests" | "buddies">("matches");
    const [editing, setEditing] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Request dialog
    const [requestTarget, setRequestTarget] = useState<BuddyMatch | null>(null);
    const [requestMessage, setRequestMessage] = useState("");
    const [sendingRequest, setSendingRequest] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        try {
            // Same gate as the dashboard: finish profile setup before matching,
            // so matches never see a nameless "User"
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user && !user.user_metadata?.profile_complete) {
                router.push("/setup");
                return;
            }

            const bp = await getMyBuddyProfile();
            setProfile(bp);
            if (bp) {
                const [m, r, b] = await Promise.all([getBuddyRecommendations(), getBuddyRequests(), getMyBuddies()]);
                setMatches(m);
                setRequests(r);
                setBuddies(b);
                if (b.length > 0 && m.length === 0 && r.incoming.length === 0) setTab("buddies");
                else if (r.incoming.length > 0) setTab("requests");
            }
        } catch (e) {
            console.error("Failed to load buddies:", e);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Prefill wizard from onboarding answers, if present
    const wizardInitial = (): WizardState => {
        if (profile) {
            return {
                focusAreas: profile.focusAreas, goal: profile.goal, cadence: profile.cadence,
                intensity: profile.intensity, style: profile.style, lookingFor: profile.lookingFor,
                region: profile.region, pitch: profile.pitch,
            };
        }
        try {
            const raw = localStorage.getItem(ONBOARDING_PREFS_KEY);
            if (raw) {
                const prefs = JSON.parse(raw);
                const validFocus = BUDDY_FOCUS_AREAS.map(f => f.id as string);
                const validStyles = BUDDY_STYLES.map(s => s.id as string);
                const validCadences = BUDDY_CADENCES.map(c => c.id as string);
                return {
                    ...DEFAULT_WIZARD,
                    focusAreas: (prefs.interests || []).filter((i: string) => validFocus.includes(i)),
                    lookingFor: (prefs.buddyStyles || []).filter((s: string) => validStyles.includes(s)),
                    cadence: validCadences.includes(prefs.cadence) ? prefs.cadence : "daily",
                };
            }
        } catch { /* ignore bad localStorage */ }
        return DEFAULT_WIZARD;
    };

    const submitRequest = async () => {
        if (!requestTarget) return;
        setSendingRequest(true);
        setRequestError(null);
        try {
            await sendBuddyRequest(requestTarget.person.id, requestMessage);
            setMatches(ms => ms.map(m => m.person.id === requestTarget.person.id ? { ...m, requestStatus: "sent" as const } : m));
            setRequestTarget(null);
            setRequestMessage("");
            getBuddyRequests().then(setRequests).catch(() => { });
        } catch (e: any) {
            setRequestError(e.message || "Failed to send request");
        } finally {
            setSendingRequest(false);
        }
    };

    const handleRespond = async (req: BuddyRequestItem, accept: boolean) => {
        setBusyId(req.id);
        try {
            await respondToBuddyRequest(req.id, accept);
            await loadAll();
            if (accept) setTab("buddies");
        } catch (e) {
            console.error(e);
        } finally {
            setBusyId(null);
        }
    };

    const handleCancel = async (req: BuddyRequestItem) => {
        setBusyId(req.id);
        try {
            await cancelBuddyRequest(req.id);
            setRequests(r => ({ ...r, outgoing: r.outgoing.filter(o => o.id !== req.id) }));
        } catch (e) {
            console.error(e);
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="max-w-4xl mx-auto px-4 py-8 pb-28 lg:pl-24 flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </main>
            </div>
        );
    }

    const needsSetup = !profile || editing;
    const requestCount = requests.incoming.length;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                {needsSetup ? (
                    <>
                        {!editing && (
                            <div className="text-center mb-10 max-w-lg mx-auto">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold mb-4">
                                    🤝 1:1 Accountability
                                </div>
                                <h1 className="text-3xl font-extrabold mb-2">Find your accountability buddy</h1>
                                <p className="text-muted-foreground">
                                    Groups give you a crowd. A buddy gives you <span className="text-foreground font-semibold">one person who notices</span> when
                                    you go quiet. Answer four quick questions and we&apos;ll find your best matches.
                                </p>
                            </div>
                        )}
                        <SetupWizard
                            initial={wizardInitial()}
                            isEdit={editing}
                            onCancel={editing ? () => setEditing(false) : undefined}
                            onDone={() => { setEditing(false); setLoading(true); loadAll(); }}
                        />
                    </>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl font-extrabold flex items-center gap-2">
                                    <span className="text-amber-400">🤝</span> Accountability Buddy
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">One person. Mutual check-ins. No hiding.</p>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-lg shrink-0" onClick={() => setEditing(true)}>
                                <Pencil size={14} className="mr-1.5" /> Preferences
                            </Button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6">
                            {([
                                { id: "matches", label: "Matches", count: matches.length },
                                { id: "requests", label: "Requests", count: requestCount },
                                { id: "buddies", label: "My Buddies", count: buddies.length },
                            ] as const).map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-semibold border transition-all cursor-pointer",
                                        tab === t.id
                                            ? "bg-amber-500/15 border-amber-400 text-amber-400"
                                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {t.label}
                                    {t.count > 0 && (
                                        <span className={cn(
                                            "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                                            tab === t.id ? "bg-amber-400 text-black" : "bg-muted text-muted-foreground"
                                        )}>
                                            {t.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Matches */}
                        {tab === "matches" && (
                            matches.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {matches.map(m => (
                                        <MatchCard key={m.person.id} match={m} onRequest={mm => { setRequestTarget(mm); setRequestError(null); }} />
                                    ))}
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="py-14 text-center">
                                        <div className="text-5xl mb-4">🔭</div>
                                        <h3 className="font-bold text-lg mb-2">No matches yet</h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                                            You&apos;re early — nobody else is currently looking for a buddy with your focus.
                                            Check back soon, or join a group in the meantime.
                                        </p>
                                        <Button asChild variant="outline" className="rounded-xl">
                                            <Link href="/groups"><Users size={16} className="mr-2" /> Explore groups</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            )
                        )}

                        {/* Requests */}
                        {tab === "requests" && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Incoming</h3>
                                    {requests.incoming.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
                                            No incoming requests right now.
                                        </p>
                                    ) : requests.incoming.map(req => (
                                        <Card key={req.id} className="mb-3">
                                            <CardContent className="p-5">
                                                <div className="flex items-start gap-3.5">
                                                    <Avatar person={req.person} size={44} />
                                                    <div className="flex-1 min-w-0">
                                                        <Link href={`/profile/${req.person.id}`} className="font-bold hover:text-amber-400 transition-colors">
                                                            {req.person.displayName}
                                                        </Link>
                                                        {req.profile?.goal && (
                                                            <p className="text-xs text-muted-foreground">Working on: {req.profile.goal}</p>
                                                        )}
                                                        {req.message && (
                                                            <p className="text-sm mt-2 p-3 bg-muted/50 rounded-lg border border-border leading-relaxed">
                                                                &ldquo;{req.message}&rdquo;
                                                            </p>
                                                        )}
                                                        <div className="flex gap-2 mt-3">
                                                            <Button
                                                                size="sm"
                                                                disabled={busyId === req.id}
                                                                onClick={() => handleRespond(req, true)}
                                                                className="rounded-lg font-semibold bg-amber-500 hover:bg-amber-400 text-black"
                                                            >
                                                                {busyId === req.id ? <Loader2 size={14} className="animate-spin" /> : <><Handshake size={14} className="mr-1.5" /> Accept</>}
                                                            </Button>
                                                            <Button size="sm" variant="outline" disabled={busyId === req.id} onClick={() => handleRespond(req, false)} className="rounded-lg">
                                                                Decline
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Sent by you</h3>
                                    {requests.outgoing.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
                                            You haven&apos;t sent any requests yet.
                                        </p>
                                    ) : requests.outgoing.map(req => (
                                        <Card key={req.id} className="mb-3">
                                            <CardContent className="p-4 flex items-center gap-3.5">
                                                <Avatar person={req.person} size={40} />
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-semibold text-sm">{req.person.displayName}</span>
                                                    <p className="text-xs text-muted-foreground">Waiting for their answer…</p>
                                                </div>
                                                <Button size="sm" variant="ghost" disabled={busyId === req.id} onClick={() => handleCancel(req)} className="text-muted-foreground hover:text-destructive">
                                                    <X size={14} className="mr-1" /> Cancel
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* My Buddies */}
                        {tab === "buddies" && (
                            buddies.length > 0 ? (
                                <div className="space-y-3">
                                    {buddies.map(b => (
                                        <Link key={b.id} href={`/buddies/${b.id}`}>
                                            <Card className="hover:border-amber-400/50 hover:translate-x-1 transition-all cursor-pointer mb-3">
                                                <CardContent className="p-5 flex items-center gap-4">
                                                    <Avatar person={b.partner} size={52} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold">{b.partner.displayName}</div>
                                                        {b.sharedGoal && <p className="text-sm text-muted-foreground truncate">🎯 {b.sharedGoal}</p>}
                                                        <div className="flex items-center gap-3 mt-1 text-xs">
                                                            <span className="text-green-500 font-semibold flex items-center gap-1">
                                                                <Flame size={12} /> You: {b.myStreak}
                                                            </span>
                                                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                                                                <Flame size={12} /> Them: {b.partnerStreak}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {b.checkedInToday ? (
                                                        <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 shrink-0">✓ Checked in</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 shrink-0 animate-pulse">Check in today</Badge>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="py-14 text-center">
                                        <div className="text-5xl mb-4">🤝</div>
                                        <h3 className="font-bold text-lg mb-2">No buddy yet</h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                                            When someone accepts your request (or you accept theirs), your shared
                                            accountability space shows up here.
                                        </p>
                                        <Button onClick={() => setTab("matches")} className="rounded-xl font-semibold bg-amber-500 hover:bg-amber-400 text-black">
                                            <Sparkles size={16} className="mr-2" /> Browse matches
                                        </Button>
                                    </CardContent>
                                </Card>
                            )
                        )}
                    </>
                )}
            </main>

            {/* Send request dialog */}
            <Dialog open={!!requestTarget} onOpenChange={open => { if (!open) setRequestTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ask {requestTarget?.person.displayName} to be your buddy</DialogTitle>
                        <DialogDescription>
                            A short personal note makes them far more likely to say yes.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={requestMessage}
                        onChange={e => setRequestMessage(e.target.value)}
                        placeholder={`e.g. Hey! We're both working on ${requestTarget?.profile.goal || "similar goals"} — want to keep each other on track?`}
                        maxLength={500}
                        rows={4}
                        className="rounded-xl resize-none"
                    />
                    {requestError && <p className="text-destructive text-sm">{requestError}</p>}
                    <Button
                        disabled={sendingRequest}
                        onClick={submitRequest}
                        className="w-full rounded-xl font-semibold bg-amber-500 hover:bg-amber-400 text-black"
                    >
                        {sendingRequest ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} className="mr-2" /> Send request</>}
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}
