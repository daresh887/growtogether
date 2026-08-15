"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export type BuddyProfileData = {
    userId: string;
    isLooking: boolean;
    focusAreas: string[];
    goal: string;
    cadence: string;
    style: string;
    lookingFor: string[];
    intensity: number;
    region: string;
    pitch: string;
};

export type BuddyProfileInput = Omit<BuddyProfileData, "userId">;

export type PublicPerson = {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    avatarEmoji: string;
};

export type BuddyMatch = {
    person: PublicPerson;
    profile: BuddyProfileData;
    score: number;
    reasons: string[];
    requestStatus: "none" | "sent" | "received";
};

export type BuddyRequestItem = {
    id: string;
    direction: "incoming" | "outgoing";
    person: PublicPerson;
    profile: BuddyProfileData | null;
    message: string;
    createdAt: string;
};

export type BuddyPairSummary = {
    id: string;
    partner: PublicPerson;
    sharedGoal: string;
    createdAt: string;
    myStreak: number;
    partnerStreak: number;
    lastCheckinAt: string | null;
    checkedInToday: boolean;
};

export type BuddyCheckin = {
    id: string;
    userId: string;
    content: string;
    mood: string | null;
    createdAt: string;
};

export type BuddyPairDetail = {
    id: string;
    status: string;
    sharedGoal: string;
    createdAt: string;
    me: PublicPerson & { streak: number; checkedInToday: boolean };
    partner: PublicPerson & { streak: number; checkedInToday: boolean; buddyProfile: BuddyProfileData | null };
    checkins: BuddyCheckin[];
};

// ============================================
// HELPERS
// ============================================

function mapBuddyProfile(row: any): BuddyProfileData {
    return {
        userId: row.user_id,
        isLooking: row.is_looking,
        focusAreas: row.focus_areas || [],
        goal: row.goal || "",
        cadence: row.cadence || "daily",
        style: row.style || "hype",
        lookingFor: row.looking_for || [],
        intensity: row.intensity || 3,
        region: row.region || "europe",
        pitch: row.pitch || "",
    };
}

async function getPeople(supabase: any, userIds: string[]): Promise<Map<string, PublicPerson>> {
    const map = new Map<string, PublicPerson>();
    if (userIds.length === 0) return map;
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, avatar")
        .in("id", userIds);
    for (const p of profiles || []) {
        map.set(p.id, {
            id: p.id,
            displayName: p.display_name || "User",
            avatarUrl: p.avatar_url || null,
            avatarEmoji: p.avatar || "🧑‍💻",
        });
    }
    return map;
}

function fallbackPerson(id: string): PublicPerson {
    return { id, displayName: "User", avatarUrl: null, avatarEmoji: "🧑‍💻" };
}

// Consecutive-day streak from a user's check-in timestamps (newest first ok)
function computeStreak(dates: string[]): number {
    if (dates.length === 0) return 0;
    const days = new Set(dates.map(d => d.split("T")[0]));
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const cursor = new Date(today);
    // Streak may start today or yesterday (not broken until a full day is missed)
    if (!days.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (days.has(cursor.toISOString().split("T")[0])) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

const STYLE_LABELS: Record<string, string> = {
    straight: "straight shooter",
    hype: "hype partner",
    analyst: "analytical planner",
    zen: "calm & steady",
};

const CADENCE_LABELS: Record<string, string> = {
    daily: "daily check-ins",
    weekdays: "weekday check-ins",
    few_week: "a few check-ins a week",
    weekly: "weekly check-ins",
};

const FOCUS_LABELS: Record<string, string> = {
    fitness: "Fitness", learning: "Learning", coding: "Coding", art: "Art",
    writing: "Writing", music: "Music", hustling: "Hustling",
    "self-improvement": "Self Improvement", languages: "Languages",
    reading: "Reading", cooking: "Cooking", other: "Other",
};

const CADENCE_ORDER = ["daily", "weekdays", "few_week", "weekly"];

/**
 * Compatibility score between two buddy profiles, 0–100, with
 * human-readable reasons for the top contributing factors.
 */
function scoreMatch(me: BuddyProfileData, them: BuddyProfileData): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Shared focus areas — the strongest signal (up to 40)
    const shared = me.focusAreas.filter(f => them.focusAreas.includes(f));
    if (shared.length > 0) {
        score += Math.min(40, 20 + shared.length * 10);
        const labels = shared.slice(0, 2).map(f => FOCUS_LABELS[f] || f);
        reasons.push(`Both into ${labels.join(" & ")}`);
    }

    // Check-in rhythm (up to 20)
    const ci = CADENCE_ORDER.indexOf(me.cadence);
    const cj = CADENCE_ORDER.indexOf(them.cadence);
    const cadenceGap = ci >= 0 && cj >= 0 ? Math.abs(ci - cj) : 3;
    if (cadenceGap === 0) {
        score += 20;
        reasons.push(`You both want ${CADENCE_LABELS[me.cadence] || "the same rhythm"}`);
    } else if (cadenceGap === 1) {
        score += 10;
        reasons.push("Similar check-in rhythm");
    }

    // Style fit: is their style what I asked for, and vice versa (up to 25)
    const theyFitMe = me.lookingFor.length === 0 || me.lookingFor.includes(them.style);
    const iFitThem = them.lookingFor.length === 0 || them.lookingFor.includes(me.style);
    if (theyFitMe) {
        score += 15;
        if (me.lookingFor.includes(them.style)) {
            reasons.push(`They're the ${STYLE_LABELS[them.style] || "type"} you asked for`);
        }
    }
    if (iFitThem) score += 10;

    // Intensity closeness (up to 10)
    const intensityGap = Math.abs(me.intensity - them.intensity);
    score += Math.max(0, 10 - intensityGap * 3);
    if (intensityGap === 0 && me.intensity >= 4) reasons.push("Both want to be pushed hard");
    else if (intensityGap <= 1) reasons.push("Matching intensity");

    // Timezone region (up to 5)
    if (me.region === them.region) {
        score += 5;
        reasons.push("Same timezone region");
    }

    return { score: Math.min(100, Math.round(score)), reasons: reasons.slice(0, 3) };
}

// ============================================
// BUDDY PROFILE
// ============================================

export async function getMyBuddyProfile(): Promise<BuddyProfileData | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("buddy_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

    return data ? mapBuddyProfile(data) : null;
}

export async function upsertBuddyProfile(input: BuddyProfileInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");

    if (input.goal.length > 200) throw new Error("Goal must be under 200 characters");
    if (input.pitch.length > 300) throw new Error("Pitch must be under 300 characters");
    if (input.focusAreas.length > 12) throw new Error("Too many focus areas");

    const { error } = await supabase
        .from("buddy_profiles")
        .upsert({
            user_id: user.id,
            is_looking: input.isLooking,
            focus_areas: input.focusAreas,
            goal: input.goal.trim(),
            cadence: input.cadence,
            style: input.style,
            looking_for: input.lookingFor,
            intensity: input.intensity,
            region: input.region,
            pitch: input.pitch.trim(),
            updated_at: new Date().toISOString(),
        });

    if (error) {
        console.error("Error saving buddy profile:", error);
        throw new Error("Failed to save buddy preferences. Make sure the add_buddies.sql migration has been run.");
    }

    revalidatePath("/buddies");
    return { success: true };
}

// ============================================
// MATCHING
// ============================================

export async function getBuddyRecommendations(): Promise<BuddyMatch[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: myRow } = await supabase
        .from("buddy_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
    if (!myRow) return [];
    const me = mapBuddyProfile(myRow);

    // Everyone else who is looking
    const { data: candidates, error } = await supabase
        .from("buddy_profiles")
        .select("*")
        .eq("is_looking", true)
        .neq("user_id", user.id);

    if (error || !candidates) {
        console.error("Error fetching buddy candidates:", error);
        return [];
    }

    // Exclude people I'm already paired with; flag pending requests
    const { data: pairs } = await supabase
        .from("buddy_pairs")
        .select("user_a, user_b")
        .eq("status", "active")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    const pairedIds = new Set((pairs || []).map((p: any) => (p.user_a === user.id ? p.user_b : p.user_a)));

    const { data: requests } = await supabase
        .from("buddy_requests")
        .select("sender_id, receiver_id, status")
        .eq("status", "pending")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const sentTo = new Set<string>();
    const receivedFrom = new Set<string>();
    for (const r of requests || []) {
        if (r.sender_id === user.id) sentTo.add(r.receiver_id);
        else receivedFrom.add(r.sender_id);
    }

    const eligible = candidates.filter((c: any) => !pairedIds.has(c.user_id));
    const people = await getPeople(supabase, eligible.map((c: any) => c.user_id));

    const matches: BuddyMatch[] = eligible.map((row: any) => {
        const profile = mapBuddyProfile(row);
        const { score, reasons } = scoreMatch(me, profile);
        return {
            person: people.get(row.user_id) || fallbackPerson(row.user_id),
            profile,
            score,
            reasons,
            requestStatus: sentTo.has(row.user_id) ? "sent" : receivedFrom.has(row.user_id) ? "received" : "none",
        };
    });

    return matches.sort((a, b) => b.score - a.score);
}

// ============================================
// REQUESTS
// ============================================

export async function sendBuddyRequest(receiverId: string, message: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");
    if (receiverId === user.id) throw new Error("You can't buddy up with yourself");
    if (message.length > 500) throw new Error("Message must be under 500 characters");

    // Refuse if already actively paired with this person
    const { data: existingPair } = await supabase
        .from("buddy_pairs")
        .select("id")
        .eq("status", "active")
        .or(`and(user_a.eq.${user.id},user_b.eq.${receiverId}),and(user_a.eq.${receiverId},user_b.eq.${user.id})`)
        .limit(1);
    if (existingPair && existingPair.length > 0) throw new Error("You're already buddies with this person");

    const { error } = await supabase
        .from("buddy_requests")
        .insert({ sender_id: user.id, receiver_id: receiverId, message: message.trim() });

    if (error) {
        if (error.code === "23505") throw new Error("You already sent this person a request");
        console.error("Error sending buddy request:", error);
        throw new Error("Failed to send request");
    }

    revalidatePath("/buddies");
    return { success: true };
}

export async function cancelBuddyRequest(requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");

    const { error } = await supabase
        .from("buddy_requests")
        .delete()
        .eq("id", requestId)
        .eq("sender_id", user.id);

    if (error) throw new Error("Failed to cancel request");
    revalidatePath("/buddies");
    return { success: true };
}

export async function respondToBuddyRequest(requestId: string, accept: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");

    const { data: request } = await supabase
        .from("buddy_requests")
        .select("*")
        .eq("id", requestId)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .single();

    if (!request) throw new Error("Request not found");

    const { error: updateError } = await supabase
        .from("buddy_requests")
        .update({ status: accept ? "accepted" : "declined" })
        .eq("id", requestId);

    if (updateError) throw new Error("Failed to respond to request");

    if (!accept) {
        revalidatePath("/buddies");
        return { success: true, pairId: null };
    }

    // Pull both goals to seed a shared goal for the pair space
    const { data: goalRows } = await supabase
        .from("buddy_profiles")
        .select("user_id, goal")
        .in("user_id", [user.id, request.sender_id]);
    const goals = (goalRows || []).map((g: any) => g.goal).filter(Boolean);

    const { data: pair, error: pairError } = await supabase
        .from("buddy_pairs")
        .insert({
            user_a: request.sender_id,
            user_b: user.id,
            shared_goal: goals.join(" + "),
        })
        .select("id")
        .single();

    if (pairError) {
        console.error("Error creating buddy pair:", pairError);
        throw new Error("Failed to create buddy pair");
    }

    revalidatePath("/buddies");
    return { success: true, pairId: pair.id as string };
}

export async function getBuddyRequests(): Promise<{ incoming: BuddyRequestItem[]; outgoing: BuddyRequestItem[] }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { incoming: [], outgoing: [] };

    const { data: requests } = await supabase
        .from("buddy_requests")
        .select("*")
        .eq("status", "pending")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

    if (!requests || requests.length === 0) return { incoming: [], outgoing: [] };

    const otherIds = requests.map((r: any) => (r.sender_id === user.id ? r.receiver_id : r.sender_id));
    const people = await getPeople(supabase, otherIds);

    const { data: buddyProfiles } = await supabase
        .from("buddy_profiles")
        .select("*")
        .in("user_id", otherIds);
    const bpMap = new Map<string, BuddyProfileData>();
    for (const bp of buddyProfiles || []) bpMap.set(bp.user_id, mapBuddyProfile(bp));

    const items: BuddyRequestItem[] = requests.map((r: any) => {
        const otherId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
        return {
            id: r.id,
            direction: r.sender_id === user.id ? "outgoing" as const : "incoming" as const,
            person: people.get(otherId) || fallbackPerson(otherId),
            profile: bpMap.get(otherId) || null,
            message: r.message || "",
            createdAt: r.created_at,
        };
    });

    return {
        incoming: items.filter(i => i.direction === "incoming"),
        outgoing: items.filter(i => i.direction === "outgoing"),
    };
}

// ============================================
// PAIRS & CHECK-INS
// ============================================

export async function getMyBuddies(): Promise<BuddyPairSummary[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: pairs } = await supabase
        .from("buddy_pairs")
        .select("*")
        .eq("status", "active")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("created_at", { ascending: false });

    if (!pairs || pairs.length === 0) return [];

    const partnerIds = pairs.map((p: any) => (p.user_a === user.id ? p.user_b : p.user_a));
    const people = await getPeople(supabase, partnerIds);

    const { data: checkins } = await supabase
        .from("buddy_checkins")
        .select("pair_id, user_id, created_at")
        .in("pair_id", pairs.map((p: any) => p.id))
        .order("created_at", { ascending: false });

    const today = new Date().toISOString().split("T")[0];

    return pairs.map((p: any) => {
        const partnerId = p.user_a === user.id ? p.user_b : p.user_a;
        const pairCheckins = (checkins || []).filter((c: any) => c.pair_id === p.id);
        const mine = pairCheckins.filter((c: any) => c.user_id === user.id).map((c: any) => c.created_at);
        const theirs = pairCheckins.filter((c: any) => c.user_id === partnerId).map((c: any) => c.created_at);
        return {
            id: p.id,
            partner: people.get(partnerId) || fallbackPerson(partnerId),
            sharedGoal: p.shared_goal || "",
            createdAt: p.created_at,
            myStreak: computeStreak(mine),
            partnerStreak: computeStreak(theirs),
            lastCheckinAt: pairCheckins[0]?.created_at || null,
            checkedInToday: mine.some((d: string) => d.startsWith(today)),
        };
    });
}

export async function getBuddyPair(pairId: string): Promise<BuddyPairDetail | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: pair } = await supabase
        .from("buddy_pairs")
        .select("*")
        .eq("id", pairId)
        .single();
    if (!pair) return null;
    if (pair.user_a !== user.id && pair.user_b !== user.id) return null;

    const partnerId = pair.user_a === user.id ? pair.user_b : pair.user_a;
    const people = await getPeople(supabase, [user.id, partnerId]);

    const { data: partnerBp } = await supabase
        .from("buddy_profiles")
        .select("*")
        .eq("user_id", partnerId)
        .single();

    const { data: checkins } = await supabase
        .from("buddy_checkins")
        .select("*")
        .eq("pair_id", pairId)
        .order("created_at", { ascending: false })
        .limit(100);

    const all = checkins || [];
    const myDates = all.filter((c: any) => c.user_id === user.id).map((c: any) => c.created_at);
    const theirDates = all.filter((c: any) => c.user_id === partnerId).map((c: any) => c.created_at);
    const today = new Date().toISOString().split("T")[0];

    const mePerson = people.get(user.id) || fallbackPerson(user.id);
    const partnerPerson = people.get(partnerId) || fallbackPerson(partnerId);

    return {
        id: pair.id,
        status: pair.status,
        sharedGoal: pair.shared_goal || "",
        createdAt: pair.created_at,
        me: {
            ...mePerson,
            streak: computeStreak(myDates),
            checkedInToday: myDates.some((d: string) => d.startsWith(today)),
        },
        partner: {
            ...partnerPerson,
            streak: computeStreak(theirDates),
            checkedInToday: theirDates.some((d: string) => d.startsWith(today)),
            buddyProfile: partnerBp ? mapBuddyProfile(partnerBp) : null,
        },
        checkins: all.map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            content: c.content,
            mood: c.mood || null,
            createdAt: c.created_at,
        })),
    };
}

export async function createBuddyCheckin(pairId: string, content: string, mood?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");

    if (!content || content.trim().length === 0) throw new Error("Check-in can't be empty");
    if (content.length > 2000) throw new Error("Check-in must be under 2,000 characters");

    const { error } = await supabase
        .from("buddy_checkins")
        .insert({
            pair_id: pairId,
            user_id: user.id,
            content: content.trim(),
            mood: mood || null,
        });

    if (error) {
        console.error("Error creating check-in:", error);
        throw new Error("Failed to post check-in");
    }

    revalidatePath(`/buddies/${pairId}`);
    return { success: true };
}

export async function updateSharedGoal(pairId: string, goal: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");
    if (goal.length > 200) throw new Error("Goal must be under 200 characters");

    const { error } = await supabase
        .from("buddy_pairs")
        .update({ shared_goal: goal.trim() })
        .eq("id", pairId)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    if (error) throw new Error("Failed to update shared goal");
    revalidatePath(`/buddies/${pairId}`);
    return { success: true };
}

export async function endBuddyPair(pairId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");

    const { error } = await supabase
        .from("buddy_pairs")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", pairId)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    if (error) throw new Error("Failed to end partnership");
    revalidatePath("/buddies");
    return { success: true };
}
