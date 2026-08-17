"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getPublicProfiles } from "./profile";
import {
    MAX_DURATION_DAYS,
    MIN_DURATION_DAYS,
    STANDARD_PENALTY,
    cadenceSpec,
    cleanHandle,
    socialPlatform,
    socialUrl as buildSocialUrl,
} from "@/utils/contract-shared";
import { heatScore } from "@/utils/ranking";

// ============================================
// TYPES
// ============================================

export type SignContractInput = {
    category: string;
    discipline: string;
    fullName: string;
    photoUrl: string;
    socialPlatform: string;
    socialHandle: string;
    commitment: string;
    cadence: string;
    proofDescription: string;
    /** The signer's word to themselves that they will not break this. */
    promise: string;
    durationDays: number | null; // null = lifetime
    strokes: number[][][];
    timezone: string;
};

export type ContractRecord = {
    id: string;
    userId: string;
    signerName: string;
    photoUrl: string;
    socialUrl: string;
    socialPlatform: string;
    socialHandle: string;
    category: string;
    discipline: string;
    commitment: string;
    cadence: string;
    proofDescription: string;
    durationDays: number | null;
    endsAt: string | null;
    forfeit: string;
    /** What they promised themselves at signing. Quoted back if they fail. */
    promise: string;
    status: "active" | "breached" | "honored" | "redeemed" | "void";
    effectiveAt: string;
    breachedAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
    strokes: number[][][];
};

export type CommentRecord = {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto: string;
    content: string;
    createdAt: string;
    replies: CommentRecord[];
};

export type CheckinRecord = {
    id: string;
    contractId: string;
    userId: string;
    content: string;
    images: string[];
    comments: CommentRecord[];
    likes: number;
    dislikes: number;
    myReaction: -1 | 0 | 1;
    createdAt: string;
    /** Time-weighted engagement, for the feed's "popular" sort. */
    heat: number;
    /** Which day of this signer's run the post belongs to. The first post is day 1. */
    dayNumber?: number;
    // Present on feeds, where entries come from many contracts
    signerName?: string;
    photoUrl?: string;
    discipline?: string;
    category?: string;
    commitment?: string;
    cadence?: string;
    streak?: number;
};

const VALID_CADENCES = ["daily", "weekdays", "three_per_week", "weekly"];
const VALID_CATEGORIES = ["build", "train", "learn", "create", "discipline"];

// ============================================
// HELPERS
// ============================================

// Rows can be written through the API directly, where only RLS runs — so
// anything we render as a link or an image src is re-checked on the way out.
// A javascript: URL in social_url would otherwise become a live XSS payload.
function safeHttps(url: unknown): string {
    return typeof url === "string" && url.startsWith("https://") && url.length <= 500 ? url : "";
}

function mapContract(c: any): ContractRecord {
    return {
        id: c.id,
        userId: c.user_id,
        signerName: c.signer_name || "Unnamed signer",
        photoUrl: safeHttps(c.photo_url),
        socialUrl: safeHttps(c.social_url),
        socialPlatform: c.social_platform || "",
        socialHandle: c.social_handle || "",
        category: c.category,
        discipline: c.discipline || "",
        commitment: c.commitment,
        cadence: c.cadence,
        proofDescription: c.proof_description || "",
        durationDays: c.duration_days ?? null,
        endsAt: c.ends_at ?? null,
        forfeit: c.forfeit,
        promise: c.promise || "",
        status: c.status,
        effectiveAt: c.effective_at,
        breachedAt: c.breached_at,
        resolvedAt: c.resolved_at,
        createdAt: c.created_at,
        strokes: Array.isArray(c.signature_strokes) ? c.signature_strokes : [],
    };
}

function assertValidTimezone(tz: string): string {
    try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return tz;
    } catch {
        return "UTC";
    }
}

// Windows are measured in plain elapsed time from the contract's anchor,
// so no timezone arithmetic is needed. The clock starts the moment you
// sign; a rolling cadence restarts it the moment you post.
function windowMs(cadence: string): number {
    return cadenceSpec(cadence).windowHours * 3_600_000;
}

function validateStrokes(strokes: unknown): asserts strokes is number[][][] {
    if (!Array.isArray(strokes) || strokes.length === 0 || strokes.length > 120) {
        throw new Error("A signature is required");
    }
    for (const stroke of strokes) {
        if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length > 3000) {
            throw new Error("Invalid signature data");
        }
        for (const point of stroke) {
            if (
                !Array.isArray(point) ||
                point.length !== 2 ||
                !Number.isFinite(point[0]) ||
                !Number.isFinite(point[1])
            ) {
                throw new Error("Invalid signature data");
            }
        }
    }
    if (JSON.stringify(strokes).length > 80_000) {
        throw new Error("Signature is too complex — please clear and sign again");
    }
}

// ============================================
// SIGNING
// ============================================

export async function signContract(input: SignContractInput) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to sign a contract");
    }

    // Terms validation
    if (!VALID_CATEGORIES.includes(input.category)) throw new Error("Choose a category");
    const discipline = (input.discipline || "").trim();
    if (discipline.length < 2) throw new Error("Name what you are working on");
    if (discipline.length > 40) throw new Error("Focus must be under 40 characters");

    // Identity
    const fullName = (input.fullName || "").trim().replace(/\s+/g, " ");
    if (fullName.length < 5 || !fullName.includes(" ")) throw new Error("Enter your full name, first and last");
    if (fullName.length > 80) throw new Error("Full name must be under 80 characters");
    const photoUrl = (input.photoUrl || "").trim();
    if (!photoUrl.startsWith("https://") || photoUrl.length > 500) {
        throw new Error("A photo of you is required");
    }
    const platform = socialPlatform(input.socialPlatform || "");
    if (!platform) throw new Error("Choose where people can find you");
    const socialHandle = cleanHandle(platform.id, input.socialHandle || "");
    if (socialHandle.length < 2 || socialHandle.length > 60 || /\s/.test(socialHandle)) {
        throw new Error("Add your handle");
    }
    if (platform.id === "website" && !socialHandle.includes(".")) {
        throw new Error("Enter a full website address");
    }
    const resolvedSocialUrl = buildSocialUrl(platform.id, socialHandle);

    // Terms
    const commitment = (input.commitment || "").trim();
    const proofDescription = (input.proofDescription || "").trim();
    if (commitment.length < 10) throw new Error("Write your commitment in full. At least 10 characters");
    if (commitment.length > 500) throw new Error("Commitment must be under 500 characters");
    if (proofDescription.length < 5) throw new Error("Say exactly what you will post as proof");
    if (proofDescription.length > 200) throw new Error("Proof description must be under 200 characters");
    const promise = (input.promise || "").trim();
    if (promise.length < 10) throw new Error("Write your promise to yourself. At least 10 characters");
    if (promise.length > 300) throw new Error("Your promise must be under 300 characters");
    if (!VALID_CADENCES.includes(input.cadence)) throw new Error("Invalid cadence");

    // Term: null means lifetime, otherwise one month at minimum
    let durationDays: number | null = null;
    if (input.durationDays !== null && input.durationDays !== undefined) {
        durationDays = Math.floor(Number(input.durationDays));
        if (!Number.isFinite(durationDays)) throw new Error("Invalid duration");
        if (durationDays < MIN_DURATION_DAYS) {
            throw new Error(`The shortest contract is ${MIN_DURATION_DAYS} days`);
        }
        if (durationDays > MAX_DURATION_DAYS) {
            throw new Error("Choose Lifetime instead of a duration this long");
        }
    }
    validateStrokes(input.strokes);
    const timezone = assertValidTimezone(input.timezone || "UTC");

    // One lock-in per person
    const { data: existing } = await supabase
        .from("contracts")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

    if (existing) throw new Error("You already have a live contract. One lock-in per person.");

    // The contract is anchored to the signing instant: the first window
    // starts now, not at some future midnight.
    const effectiveAt = new Date();
    const endsAt =
        durationDays === null
            ? null
            : new Date(effectiveAt.getTime() + durationDays * 86_400_000);

    const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .insert({
            user_id: user.id,
            category: input.category,
            discipline,
            commitment,
            cadence: input.cadence,
            proof_description: proofDescription,
            duration_days: durationDays,
            ends_at: endsAt ? endsAt.toISOString() : null,
            forfeit: STANDARD_PENALTY,
            promise,
            signature_strokes: input.strokes,
            signer_name: fullName,
            photo_url: photoUrl,
            social_url: resolvedSocialUrl,
            social_platform: platform.id,
            social_handle: socialHandle,
            timezone,
            status: "active",
            effective_at: effectiveAt.toISOString(),
        })
        .select("id")
        .single();

    if (contractError) {
        if (contractError.code === "23505") {
            throw new Error("You already have a live contract. One lock-in per person.");
        }
        console.error("Error creating contract:", contractError);
        throw new Error("Failed to record the contract");
    }

    await supabase.from("contract_events").insert({
        contract_id: contract.id,
        type: "signed",
        detail: `Locked in by ${fullName}. In effect from ${effectiveAt.toISOString()}.`,
    });

    revalidatePath("/");
    revalidatePath(`/c/${input.category}`);
    return { success: true, contractId: contract.id, effectiveAt: effectiveAt.toISOString() };
}

// ============================================
// PROOF
// ============================================

export async function uploadProofImage(formData: FormData): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("You must be logged in to upload a photo");

    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
        throw new Error("Please upload a JPEG, PNG, GIF, or WebP image");
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Photo too large. Maximum size is 5MB");
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
        .from("post-images")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) {
        console.error("Error uploading proof photo:", error);
        throw new Error(
            `Failed to upload the photo: ${error.message}. ` +
            "If this mentions a missing bucket or a policy, run migrations/add_storage_buckets.sql in Supabase."
        );
    }

    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(data.path);
    return urlData.publicUrl;
}

export async function createCheckin(contractId: string, content: string, images: string[] = []) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("You must be logged in");

    const trimmed = (content || "").trim();
    if (trimmed.length < 3) throw new Error("Write what you actually did");
    if (trimmed.length > 2000) throw new Error("Proof must be under 2,000 characters");
    if (!Array.isArray(images) || images.length > 4) throw new Error("Maximum 4 photos per proof");
    for (const url of images) {
        if (typeof url !== "string" || url.length > 500 || !url.startsWith("https://")) {
            throw new Error("Invalid photo");
        }
    }

    // Must be your own live contract
    const { data: contract } = await supabase
        .from("contracts")
        .select("id, user_id, status, category")
        .eq("id", contractId)
        .single();

    if (!contract || contract.user_id !== user.id) throw new Error("Not your contract");
    if (contract.status !== "active") throw new Error("This contract is no longer live");

    // Rate limit: 30 second cooldown
    const { data: last } = await supabase
        .from("checkins")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (last) {
        const elapsed = Date.now() - new Date(last.created_at).getTime();
        if (elapsed < 30_000) {
            throw new Error(`Please wait ${Math.ceil((30_000 - elapsed) / 1000)} seconds before filing again`);
        }
    }

    const { error } = await supabase.from("checkins").insert({
        contract_id: contractId,
        user_id: user.id,
        content: trimmed,
        images,
    });

    if (error) {
        console.error("Error filing proof:", error);
        throw new Error("Failed to file proof");
    }

    revalidatePath("/");
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath(`/c/${contract.category}`);
    return { success: true };
}

// ============================================
// READING
// ============================================

/**
 * The public record: every contract, newest first.
 */
export async function getWallContracts(limit: number = 60): Promise<ContractRecord[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error || !data) {
        if (error) console.error("Error fetching the record:", error);
        return [];
    }

    return data.map(mapContract);
}

export async function getContract(id: string): Promise<{
    contract: ContractRecord;
    streak: number;
    checkins: CheckinRecord[];
    isOwner: boolean;
    /** What people said to a signer who gave up. Empty on a live contract. */
    wallComments: CommentRecord[];
} | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: contract, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !contract) return null;

    const { data: checkins } = await supabase
        .from("checkins")
        .select(
            "id, contract_id, user_id, content, images, created_at, " +
            "checkin_comments(id, user_id, author_name, author_photo, content, created_at, parent_id), " +
            "checkin_reactions(user_id, value, created_at)"
        )
        .eq("contract_id", id)
        .order("created_at", { ascending: false })
        .limit(200);

    const streak = computeStreak(
        (checkins || []).map((c: any) => c.created_at),
        contract.cadence
    );

    // Newest first out of the query, so the last row is the opening post.
    const firstPostAt = ((checkins || []).at(-1) as any)?.created_at as string | undefined;

    const entries: CheckinRecord[] = (checkins || []).map((c: any) => ({
        id: c.id,
        contractId: c.contract_id,
        userId: c.user_id,
        content: c.content,
        images: (Array.isArray(c.images) ? c.images : []).map(safeHttps).filter(Boolean).slice(0, 4),
        comments: mapComments(c.checkin_comments),
        ...mapReactions(c.checkin_reactions, user?.id || null),
        createdAt: c.created_at,
        heat: checkinHeat(c),
        dayNumber: contractDay(firstPostAt, c.created_at),
        streak,
    }));

    await applyLiveProfiles(entries);

    // The wall only exists once someone has failed.
    let wallComments: CommentRecord[] = [];
    if (contract.status === "breached") {
        const { data: wall } = await supabase
            .from("contract_comments")
            .select("id, user_id, author_name, author_photo, content, created_at, parent_id")
            .eq("contract_id", id)
            .order("created_at", { ascending: true })
            .limit(300);
        wallComments = mapComments(wall);
    }

    return {
        contract: mapContract(contract),
        streak,
        checkins: entries,
        isOwner: user?.id === contract.user_id,
        wallComments,
    };
}

/**
 * Like or dislike a post. value: 1 like, -1 dislike, 0 remove.
 */
export async function reactToCheckin(checkinId: string, value: -1 | 0 | 1) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("You must be logged in");
    if (![-1, 0, 1].includes(value)) throw new Error("Invalid reaction");

    if (value === 0) {
        await supabase
            .from("checkin_reactions")
            .delete()
            .eq("checkin_id", checkinId)
            .eq("user_id", user.id);
    } else {
        const { error } = await supabase
            .from("checkin_reactions")
            .upsert(
                { checkin_id: checkinId, user_id: user.id, value },
                { onConflict: "checkin_id,user_id" }
            );
        if (error) {
            console.error("Error reacting:", error);
            throw new Error("Failed to react");
        }
    }

    revalidatePath("/");
    return { success: true };
}

/**
 * Comment on a post, or reply to a comment (one level deep). The
 * author's name and photo are snapshotted from their own contract if
 * they have one, otherwise from their profile.
 */
export async function addComment(checkinId: string, content: string, parentId?: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("You must be logged in to comment");

    const trimmed = (content || "").trim();
    if (trimmed.length < 1) throw new Error("Write something");
    if (trimmed.length > 500) throw new Error("Comments must be under 500 characters");

    // Rate limit: 10 second cooldown
    const { data: last } = await supabase
        .from("checkin_comments")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (last) {
        const elapsed = Date.now() - new Date(last.created_at).getTime();
        if (elapsed < 10_000) {
            throw new Error(`Please wait ${Math.ceil((10_000 - elapsed) / 1000)} seconds`);
        }
    }

    // Replies attach to a top-level comment on the same post; replying
    // to a reply threads under its parent.
    let resolvedParentId: string | null = null;
    if (parentId) {
        const { data: parent } = await supabase
            .from("checkin_comments")
            .select("id, checkin_id, parent_id")
            .eq("id", parentId)
            .single();
        if (!parent || parent.checkin_id !== checkinId) throw new Error("Comment not found");
        resolvedParentId = parent.parent_id || parent.id;
    }

    const [{ data: ownContract }, { data: profile }] = await Promise.all([
        supabase
            .from("contracts")
            .select("signer_name, photo_url")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    ]);

    const authorName = ownContract?.signer_name || profile?.display_name || "Someone";
    const authorPhoto = ownContract?.photo_url || profile?.avatar_url || "";

    const { error } = await supabase.from("checkin_comments").insert({
        checkin_id: checkinId,
        user_id: user.id,
        author_name: authorName,
        author_photo: authorPhoto,
        parent_id: resolvedParentId,
        content: trimmed,
    });

    if (error) {
        console.error("Error adding comment:", error);
        throw new Error("Failed to comment");
    }

    revalidatePath("/");
    return { success: true };
}

/**
 * Say it to their face: a public comment on a FAILED contract. This is the
 * humiliation the signer agreed to, so it only opens once the contract is
 * actually failed — live contracts take comments on their posts, not here.
 */
export async function addWallComment(contractId: string, content: string, parentId?: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("You must be logged in to comment");

    const trimmed = (content || "").trim();
    if (trimmed.length < 1) throw new Error("Write something");
    if (trimmed.length > 500) throw new Error("Comments must be under 500 characters");

    const { data: contract } = await supabase
        .from("contracts")
        .select("id, status")
        .eq("id", contractId)
        .single();
    if (!contract) throw new Error("Contract not found");
    if (contract.status !== "breached") throw new Error("They haven't failed. Yet.");

    // Rate limit: 10 second cooldown, shared with post comments.
    const { data: last } = await supabase
        .from("contract_comments")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (last) {
        const elapsed = Date.now() - new Date(last.created_at).getTime();
        if (elapsed < 10_000) {
            throw new Error(`Please wait ${Math.ceil((10_000 - elapsed) / 1000)} seconds`);
        }
    }

    // Replies thread one level deep, same as on posts.
    let resolvedParentId: string | null = null;
    if (parentId) {
        const { data: parent } = await supabase
            .from("contract_comments")
            .select("id, contract_id, parent_id")
            .eq("id", parentId)
            .single();
        if (!parent || parent.contract_id !== contractId) throw new Error("Comment not found");
        resolvedParentId = parent.parent_id || parent.id;
    }

    const [{ data: ownContract }, { data: profile }] = await Promise.all([
        supabase
            .from("contracts")
            .select("signer_name, photo_url")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    ]);

    const { error } = await supabase.from("contract_comments").insert({
        contract_id: contractId,
        user_id: user.id,
        author_name: ownContract?.signer_name || profile?.display_name || "Someone",
        author_photo: ownContract?.photo_url || profile?.avatar_url || "",
        parent_id: resolvedParentId,
        content: trimmed,
    });

    if (error) {
        console.error("Error adding wall comment:", error);
        throw new Error("Failed to comment");
    }

    revalidatePath(`/contracts/${contractId}`);
    return { success: true };
}

export type DeadlineState =
    | { state: "none" }
    | { state: "not_started"; contractId: string; deadline: string }
    | {
          // Posts are still owed inside the current window.
          state: "due";
          contractId: string;
          deadline: string;
          done: number;
          required: number;
          rolling: boolean;
          windowHours: number;
          intro: boolean;
          lastPostAt: string | null;
      }
    | {
          // The quota is met; the deadline is when the next window opens.
          state: "safe";
          contractId: string;
          deadline: string;
          done: number;
          required: number;
          windowHours: number;
      };

/**
 * How long the current user has left before they breach.
 *
 * The clock is elapsed time, not calendar time. A rolling cadence (daily)
 * gives you `windowHours` from signing, and `windowHours` again from every
 * post after that. A fixed cadence runs back-to-back windows from the
 * signing instant and counts the posts inside the current one.
 *
 * `intro` marks a contract that has never been posted to: the signer
 * still owes the introduction that opens their record.
 */
export async function getMyDeadline(): Promise<DeadlineState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { state: "none" };

    const { data: contract } = await supabase
        .from("contracts")
        .select("id, cadence, effective_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

    if (!contract) return { state: "none" };

    const now = Date.now();
    const anchor = new Date(contract.effective_at).getTime();

    // Contracts signed before the same-day rule may still be dated ahead.
    if (anchor > now) {
        return {
            state: "not_started",
            contractId: contract.id,
            deadline: new Date(anchor).toISOString(),
        };
    }

    const spec = cadenceSpec(contract.cadence);
    const span = windowMs(contract.cadence);

    // One query gives both the total (has this record been opened?) and
    // the most recent post (where a rolling window restarts).
    const { data: latest, count: everPosted } = await supabase
        .from("checkins")
        .select("created_at", { count: "exact" })
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: false })
        .limit(1);

    const lastPostAt = latest?.[0]?.created_at || null;
    const intro = (everPosted || 0) === 0;

    if (spec.rolling) {
        // 24 hours from signing, or from your last post — whichever is later.
        const from = lastPostAt ? Math.max(anchor, new Date(lastPostAt).getTime()) : anchor;
        return {
            state: "due",
            contractId: contract.id,
            deadline: new Date(from + span).toISOString(),
            done: 0,
            required: spec.required,
            rolling: true,
            windowHours: spec.windowHours,
            intro,
            lastPostAt,
        };
    }

    // Fixed windows run back-to-back from the anchor.
    const windowStart = anchor + Math.floor((now - anchor) / span) * span;
    const windowEnd = windowStart + span;

    const { count } = await supabase
        .from("checkins")
        .select("id", { count: "exact", head: true })
        .eq("contract_id", contract.id)
        .gte("created_at", new Date(windowStart).toISOString());

    const done = count || 0;
    if (done >= spec.required) {
        return {
            state: "safe",
            contractId: contract.id,
            deadline: new Date(windowEnd).toISOString(),
            done,
            required: spec.required,
            windowHours: spec.windowHours,
        };
    }

    return {
        state: "due",
        contractId: contract.id,
        deadline: new Date(windowEnd).toISOString(),
        done,
        required: spec.required,
        rolling: false,
        windowHours: spec.windowHours,
        intro,
        lastPostAt,
    };
}

export async function getMyContracts(): Promise<ContractRecord[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapContract);
}

/**
 * A register's page: its live contracts and its recent proof.
 */
export async function getCategoryContracts(category: string): Promise<ContractRecord[]> {
    if (!VALID_CATEGORIES.includes(category)) return [];
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error || !data) return [];
    return data.map(mapContract);
}

function mapComments(rows: any): CommentRecord[] {
    if (!Array.isArray(rows)) return [];
    const byDate = (a: CommentRecord, b: CommentRecord) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    const all = rows.map((r: any) => ({
        id: r.id,
        authorId: r.user_id || "",
        authorName: r.author_name || "Someone",
        authorPhoto: safeHttps(r.author_photo),
        content: r.content,
        createdAt: r.created_at,
        parentId: r.parent_id || null,
        replies: [] as CommentRecord[],
    }));

    const topLevel = all.filter((c) => !c.parentId);
    const byId = new Map(topLevel.map((c) => [c.id, c]));
    for (const reply of all) {
        if (reply.parentId) byId.get(reply.parentId)?.replies.push(reply);
    }
    topLevel.forEach((c) => c.replies.sort(byDate));
    return topLevel.sort(byDate);
}

/**
 * Show people as they are now. The contract keeps the photo they signed
 * with, but posts and comments follow whatever picture they use today.
 */
async function applyLiveProfiles(entries: CheckinRecord[]) {
    const ids = new Set<string>();
    const walk = (comments: CommentRecord[]) => {
        for (const comment of comments) {
            if (comment.authorId) ids.add(comment.authorId);
            walk(comment.replies);
        }
    };
    for (const entry of entries) {
        if (entry.userId) ids.add(entry.userId);
        walk(entry.comments);
    }
    if (ids.size === 0) return;

    const profiles = await getPublicProfiles([...ids]);

    const paint = (comments: CommentRecord[]) => {
        for (const comment of comments) {
            const live = profiles.get(comment.authorId);
            if (live?.avatarUrl) comment.authorPhoto = live.avatarUrl;
            paint(comment.replies);
        }
    };
    for (const entry of entries) {
        const live = profiles.get(entry.userId);
        if (live?.avatarUrl) entry.photoUrl = live.avatarUrl;
        paint(entry.comments);
    }
}

/** Raw rows in, one number out. Reaction times only exist here. */
function checkinHeat(c: any): number {
    const reactions = Array.isArray(c.checkin_reactions) ? c.checkin_reactions : [];
    return heatScore({
        createdAt: c.created_at,
        reactions: reactions.map((r: any) => ({ value: r.value, createdAt: r.created_at })),
        comments: mapComments(c.checkin_comments),
    });
}

function mapReactions(rows: any, currentUserId: string | null) {
    let likes = 0;
    let dislikes = 0;
    let myReaction: -1 | 0 | 1 = 0;
    if (Array.isArray(rows)) {
        for (const r of rows) {
            if (r.value === 1) likes++;
            else if (r.value === -1) dislikes++;
            if (currentUserId && r.user_id === currentUserId) myReaction = r.value;
        }
    }
    return { likes, dislikes, myReaction };
}

function mapFeedCheckin(c: any, currentUserId: string | null): CheckinRecord {
    return {
        id: c.id,
        contractId: c.contract_id,
        userId: c.user_id,
        content: c.content,
        images: (Array.isArray(c.images) ? c.images : []).map(safeHttps).filter(Boolean).slice(0, 4),
        comments: mapComments(c.checkin_comments),
        ...mapReactions(c.checkin_reactions, currentUserId),
        createdAt: c.created_at,
        heat: checkinHeat(c),
        signerName: c.contracts?.signer_name || "Unnamed signer",
        photoUrl: safeHttps(c.contracts?.photo_url),
        discipline: c.contracts?.discipline || "",
        category: c.contracts?.category || "",
        commitment: c.contracts?.commitment || "",
        cadence: c.contracts?.cadence || "daily",
    };
}

const FEED_SELECT =
    "id, contract_id, user_id, content, images, created_at, " +
    "contracts!inner(category, signer_name, discipline, commitment, cadence, photo_url, timezone), " +
    "checkin_comments(id, user_id, author_name, author_photo, content, created_at, parent_id), " +
    "checkin_reactions(user_id, value, created_at)";

// ============================================
// STREAKS
// ============================================

/**
 * Consecutive on-time posts, counting back from the most recent one. A gap
 * longer than the cadence's own window breaks the chain — the same clock
 * the deadline runs on, so a streak means "never let the window lapse".
 */
function computeStreak(checkinDatesIso: string[], cadence: string): number {
    const times = checkinDatesIso
        .map((iso) => new Date(iso).getTime())
        .filter((t) => Number.isFinite(t))
        .sort((a, b) => b - a);
    if (times.length === 0) return 0;

    const span = windowMs(cadence);
    let streak = 1;
    for (let i = 1; i < times.length; i++) {
        if (times[i - 1] - times[i] > span) break;
        streak++;
    }
    return streak;
}

// Attach a streak to each feed entry, one query for all contracts shown.
/** Which UTC day a timestamp falls on, counted from the epoch. */
function utcDay(iso: string): number {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? Math.floor(t / 86_400_000) : 0;
}

/** Which day of the run a post falls on, counting the first post as day 1. */
function contractDay(firstIso: string | undefined, iso: string): number {
    if (!firstIso) return 1;
    return Math.max(0, utcDay(iso) - utcDay(firstIso)) + 1;
}

/**
 * Streaks and day numbers, both read off one query: every post date for the
 * contracts on show. Rows are newest first, so the last one for a contract
 * is that signer's first post.
 */
async function attachHistory(supabase: any, entries: CheckinRecord[], cadences: Map<string, string>) {
    const contractIds = [...new Set(entries.map((e) => e.contractId))];
    if (contractIds.length === 0) return;

    const { data } = await supabase
        .from("checkins")
        .select("contract_id, created_at")
        .in("contract_id", contractIds)
        .order("created_at", { ascending: false })
        .limit(3000);

    const datesByContract = new Map<string, string[]>();
    for (const row of data || []) {
        const list = datesByContract.get(row.contract_id) || [];
        list.push(row.created_at);
        datesByContract.set(row.contract_id, list);
    }

    const streaks = new Map<string, number>();
    const firstPosts = new Map<string, string>();
    for (const id of contractIds) {
        const dates = datesByContract.get(id) || [];
        streaks.set(id, computeStreak(dates, cadences.get(id) || "daily"));
        // Newest first, so the oldest row is the opening post.
        if (dates.length > 0) firstPosts.set(id, dates[dates.length - 1]);
    }
    for (const entry of entries) {
        entry.streak = streaks.get(entry.contractId) ?? 0;
        entry.dayNumber = contractDay(firstPosts.get(entry.contractId), entry.createdAt);
    }
}

async function fetchFeed(category: string | null, limit: number): Promise<CheckinRecord[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
        .from("checkins")
        .select(FEED_SELECT)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (category) query = query.eq("contracts.category", category);

    const { data, error } = await query;

    if (error || !data) {
        if (error) console.error("Error fetching feed:", error);
        return [];
    }

    const entries = data.map((c: any) => mapFeedCheckin(c, user?.id || null));
    const cadences = new Map<string, string>(
        data.map((c: any) => [c.contract_id, c.contracts?.cadence || "daily"])
    );
    await attachHistory(supabase, entries, cadences);
    await applyLiveProfiles(entries);
    return entries;
}

export async function getCategoryFeed(category: string, limit: number = 50): Promise<CheckinRecord[]> {
    if (!VALID_CATEGORIES.includes(category)) return [];
    return fetchFeed(category, limit);
}

/**
 * The front page feed: the latest posts from every category.
 */
export async function getRecentProof(limit: number = 40): Promise<CheckinRecord[]> {
    return fetchFeed(null, limit);
}

/**
 * Breached contracts for the front page: the humiliations.
 */
export async function getBreachedContracts(limit: number = 20): Promise<ContractRecord[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("status", "breached")
        .order("breached_at", { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    const contracts = data.map(mapContract);
    const profiles = await getPublicProfiles([...new Set(contracts.map((c) => c.userId))]);
    for (const contract of contracts) {
        const live = profiles.get(contract.userId);
        if (live?.avatarUrl) contract.photoUrl = live.avatarUrl;
    }
    return contracts;
}
