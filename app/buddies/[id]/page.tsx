"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
    getBuddyPair,
    createBuddyCheckin,
    updateSharedGoal,
    endBuddyPair,
    type BuddyPairDetail,
} from "@/app/actions/buddies";
import { styleById, cadenceById } from "@/utils/buddy-constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import { Loader2, Flame, ArrowLeft, Send, Pencil, Check, HeartCrack } from "lucide-react";

const MOODS = ["💪", "🔥", "😊", "😮‍💨", "😤", "🧘"];

function AvatarCircle({ person, size = 56, ring }: {
    person: { displayName: string; avatarUrl: string | null; avatarEmoji: string };
    size?: number;
    ring?: string;
}) {
    return (
        <div
            className={cn("rounded-full bg-muted border-2 flex items-center justify-center overflow-hidden shrink-0", ring || "border-border")}
            style={{ width: size, height: size, fontSize: size * 0.5 }}
        >
            {person.avatarUrl
                ? <img src={person.avatarUrl} alt={person.displayName} className="w-full h-full object-cover" />
                : <span>{person.avatarEmoji}</span>}
        </div>
    );
}

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function BuddyPairPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [pair, setPair] = useState<BuddyPairDetail | null>(null);

    const [content, setContent] = useState("");
    const [mood, setMood] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState<string | null>(null);

    const [editingGoal, setEditingGoal] = useState(false);
    const [goalDraft, setGoalDraft] = useState("");
    const [savingGoal, setSavingGoal] = useState(false);

    const [confirmEnd, setConfirmEnd] = useState(false);
    const [ending, setEnding] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await getBuddyPair(id);
            setPair(data);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const postCheckin = async () => {
        if (!content.trim()) return;
        setPosting(true);
        setPostError(null);
        try {
            await createBuddyCheckin(id, content, mood || undefined);
            setContent("");
            setMood(null);
            await load();
        } catch (e: any) {
            setPostError(e.message || "Failed to post check-in");
        } finally {
            setPosting(false);
        }
    };

    const saveGoal = async () => {
        setSavingGoal(true);
        try {
            await updateSharedGoal(id, goalDraft);
            setEditingGoal(false);
            await load();
        } catch (e) {
            console.error(e);
        } finally {
            setSavingGoal(false);
        }
    };

    const handleEnd = async () => {
        setEnding(true);
        try {
            await endBuddyPair(id);
            router.push("/buddies");
        } catch (e) {
            console.error(e);
            setEnding(false);
            setConfirmEnd(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="max-w-3xl mx-auto px-4 py-8 pb-28 lg:pl-24 flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </main>
            </div>
        );
    }

    if (!pair) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="max-w-3xl mx-auto px-4 py-8 pb-28 lg:pl-24 text-center pt-24">
                    <div className="text-5xl mb-4">🔍</div>
                    <h1 className="text-xl font-bold mb-2">Partnership not found</h1>
                    <p className="text-muted-foreground mb-6">This buddy space doesn&apos;t exist or you&apos;re not part of it.</p>
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href="/buddies"><ArrowLeft size={16} className="mr-2" /> Back to buddies</Link>
                    </Button>
                </main>
            </div>
        );
    }

    const daysTogether = Math.max(1, Math.floor((Date.now() - new Date(pair.createdAt).getTime()) / 86400000) + 1);
    const partnerStyle = pair.partner.buddyProfile ? styleById(pair.partner.buddyProfile.style) : null;
    const partnerCadence = pair.partner.buddyProfile ? cadenceById(pair.partner.buddyProfile.cadence) : null;
    const isEnded = pair.status === "ended";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-3xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                <Link href="/buddies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
                    <ArrowLeft size={15} /> All buddies
                </Link>

                {/* Pair header */}
                <Card className="mb-5 overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-green-500 via-amber-400 to-amber-500" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center gap-0 mb-4">
                            <AvatarCircle person={pair.me} size={64} ring="border-green-500" />
                            <div className="text-2xl -mx-1 z-10 bg-card rounded-full p-1 border border-border">🤝</div>
                            <AvatarCircle person={pair.partner} size={64} ring="border-amber-400" />
                        </div>
                        <h1 className="text-xl font-extrabold text-center mb-1">
                            You &amp; <Link href={`/profile/${pair.partner.id}`} className="hover:text-amber-400 transition-colors">{pair.partner.displayName}</Link>
                        </h1>
                        <p className="text-center text-sm text-muted-foreground mb-4">
                            Buddies for {daysTogether} {daysTogether === 1 ? "day" : "days"}
                            {partnerStyle && <> · {partnerStyle.emoji} {partnerStyle.label}</>}
                            {partnerCadence && <> · {partnerCadence.emoji} {partnerCadence.short}</>}
                        </p>

                        {/* Shared goal */}
                        <div className="max-w-md mx-auto">
                            {editingGoal ? (
                                <div className="flex gap-2">
                                    <Input
                                        value={goalDraft}
                                        onChange={e => setGoalDraft(e.target.value)}
                                        maxLength={200}
                                        placeholder="Your shared goal"
                                        className="h-10 rounded-lg"
                                        autoFocus
                                    />
                                    <Button size="sm" disabled={savingGoal} onClick={saveGoal} className="h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-black">
                                        {savingGoal ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setGoalDraft(pair.sharedGoal); setEditingGoal(true); }}
                                    className="w-full group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border hover:border-amber-400/50 transition-colors cursor-pointer"
                                >
                                    <span className="text-sm">
                                        🎯 {pair.sharedGoal || <span className="text-muted-foreground italic">Set a shared goal…</span>}
                                    </span>
                                    <Pencil size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Streaks side by side */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                    {[
                        { label: "You", person: pair.me, color: "text-green-500", badgeOk: pair.me.checkedInToday },
                        { label: pair.partner.displayName, person: pair.partner, color: "text-amber-400", badgeOk: pair.partner.checkedInToday },
                    ].map((side, i) => (
                        <Card key={i}>
                            <CardContent className="py-5 text-center">
                                <div className={cn("text-4xl font-extrabold mb-1 flex items-center justify-center gap-1.5", side.color)}>
                                    <Flame size={26} /> {side.person.streak}
                                </div>
                                <div className="text-xs text-muted-foreground font-medium mb-2 truncate px-2">{side.label}</div>
                                {side.badgeOk ? (
                                    <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 text-[10px]">✓ Checked in today</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-muted-foreground text-[10px]">Not yet today</Badge>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Composer */}
                {!isEnded && (
                    <Card className="mb-6">
                        <CardContent className="p-5">
                            <div className="text-sm font-semibold text-muted-foreground mb-3">
                                {pair.me.checkedInToday ? "Add another update" : `Check in with ${pair.partner.displayName}`}
                            </div>
                            <Textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="What did you do today? Wins, struggles, excuses — your buddy sees it all."
                                rows={3}
                                maxLength={2000}
                                className="rounded-xl resize-none mb-3"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex gap-1">
                                    {MOODS.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setMood(mood === m ? null : m)}
                                            className={cn(
                                                "w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-all cursor-pointer",
                                                mood === m ? "border-amber-400 bg-amber-500/15 scale-110" : "border-transparent hover:bg-muted"
                                            )}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                                <Button
                                    disabled={posting || !content.trim()}
                                    onClick={postCheckin}
                                    className="rounded-xl font-semibold bg-amber-500 hover:bg-amber-400 text-black"
                                >
                                    {posting ? <Loader2 size={15} className="animate-spin" /> : <><Send size={15} className="mr-1.5" /> Check in</>}
                                </Button>
                            </div>
                            {postError && <p className="text-destructive text-sm mt-2">{postError}</p>}
                        </CardContent>
                    </Card>
                )}

                {/* Check-in feed */}
                <div className="space-y-3 mb-10">
                    {pair.checkins.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                            <div className="text-4xl mb-3">📝</div>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                No check-ins yet. Post the first one — momentum starts with whoever moves first.
                            </p>
                        </div>
                    ) : pair.checkins.map(c => {
                        const isMine = c.userId === pair.me.id;
                        const person = isMine ? pair.me : pair.partner;
                        return (
                            <div key={c.id} className={cn("flex gap-3", isMine && "flex-row-reverse")}>
                                <AvatarCircle person={person} size={36} />
                                <div className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-3 border",
                                    isMine
                                        ? "bg-green-500/10 border-green-500/20 rounded-tr-sm"
                                        : "bg-card border-border rounded-tl-sm"
                                )}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn("text-xs font-bold", isMine ? "text-green-500" : "text-amber-400")}>
                                            {isMine ? "You" : person.displayName}
                                        </span>
                                        {c.mood && <span className="text-sm">{c.mood}</span>}
                                        <span className="text-[10px] text-muted-foreground">{relativeTime(c.createdAt)}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* End partnership */}
                {!isEnded && (
                    <div className="text-center">
                        <button
                            onClick={() => setConfirmEnd(true)}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                            <HeartCrack size={13} /> End this partnership
                        </button>
                    </div>
                )}
            </main>

            <ConfirmationDialog
                open={confirmEnd}
                onOpenChange={setConfirmEnd}
                title={`End partnership with ${pair.partner.displayName}?`}
                description="Your check-in history stays, but streaks stop and you'll both be free to match with someone new. This can't be undone."
                confirmText="End partnership"
                variant="destructive"
                loading={ending}
                onConfirm={handleEnd}
            />
        </div>
    );
}
