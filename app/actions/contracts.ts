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
import { validateRealName, validateUsername } from "@/utils/identity";

// ============================================
// TYPES
// ============================================

export type SignContractInput = {
    category: string;
    discipline: string;
    // --- Public identity: what everyone sees from the moment you sign ---
    username: string;
    /** A picture of your choosing. Empty string means no picture at all. */
    avatarUrl: string;
    /** Optional, and editable later in settings. */
    socialPlatform: string;
    socialHandle: string;
    // --- Sealed identity: held back until the contract is breached ---
    realName: string;
    /** A path inside the private `faces` bucket, never a public URL. */
    facePath: string;
    strokes: number[][][];
    // --- Terms ---
    commitment: string;
    cadence: string;
    proofDescription: string;
    /** The signer's word to themselves that they will not break this. */
    promise: string;
    durationDays: number | null; // null = lifetime
    timezone: string;
};

export type ContractRecord = {
    id: string;
    userId: string;
    // --- Public identity ---
    username: string;
    /** The chosen picture. Empty when they opted out of having one. */
    avatarUrl: string;
    socialUrl: string;
    socialPlatform: string;
    socialHandle: string;
    // --- Sealed identity ---
    /** True when this viewer may see what is under the seal: the signer
     *  themselves, or anybody at all once the contract is breached. */
    revealed: boolean;
    /** Null while sealed. */
    realName: string | null;
    /** A short-lived signed URL into the private bucket. Null while sealed. */
    faceUrl: string | null;
    /** Empty while sealed — people sign their own name. */
    strokes: number[][][];
    // --- Terms ---
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
    // Present on feeds, where entries come from many contracts. Always the
    // public identity — the feed never carries a sealed name or face.
    username?: string;
    avatarUrl?: string;
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

/**
 * A contract row on its way out to a page.
 *
 * The sealed half arrives as an embedded `contract_identity` row, which
 * RLS has already decided about: it is present when the viewer owns the
 * contract or the contract is breached, and absent otherwise. Nothing
 * here re-implements that rule — it only reads whether the row came
 * back. The public identity is stitched in afterwards by
 * `applyContractProfiles`, which is why it starts empty.
 */
function mapContract(c: any): ContractRecord {
    const sealed = Array.isArray(c.contract_identity)
        ? c.contract_identity[0]
        : c.contract_identity;
    const revealed = Boolean(sealed);

    return {
        id: c.id,
        userId: c.user_id,
        username: "",
        avatarUrl: "",
        socialUrl: "",
        socialPlatform: "",
        socialHandle: "",
        revealed,
        realName: revealed ? (sealed.real_name || "Unnamed signer") : null,
        // Turned into a signed URL by the caller; the raw path is useless
        // on its own, since the bucket is private.
        faceUrl: revealed ? (sealed.face_path || "") : null,
        strokes:
            revealed && Array.isArray(sealed.signature_strokes)
                ? sealed.signature_strokes
                : [],
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
    };
}

/** Everything a contract row needs, sealed half included. RLS filters it. */
const CONTRACT_SELECT =
    "*, contract_identity(real_name, face_path, signature_strokes)";

/**
 * Stitches the public identity onto contracts, and swaps each revealed
 * face path for a signed URL. One profiles query and one signing call
 * per face, rather than per row.
 */
async function applyContractProfiles(supabase: any, contracts: ContractRecord[]) {
    if (contracts.length === 0) return;

    const profiles = await getPublicProfiles([...new Set(contracts.map((c) => c.userId))]);

    for (const contract of contracts) {
        const profile = profiles.get(contract.userId);
        contract.username = profile?.username || "someone";
        contract.avatarUrl = profile?.avatarUrl || "";
        contract.socialPlatform = profile?.socialPlatform || "";
        contract.socialHandle = profile?.socialHandle || "";
        contract.socialUrl =
            profile?.socialPlatform && profile?.socialHandle
                ? safeHttps(buildSocialUrl(profile.socialPlatform, profile.socialHandle))
                : "";
    }

    await Promise.all(
        contracts.map(async (contract) => {
            if (!contract.faceUrl) return;
            contract.faceUrl = await signedFaceUrl(supabase, contract.faceUrl);
        })
    );
}

/**
 * A time-limited URL for a face in the private bucket. Returns null if
 * signing fails, which is also what a viewer without the right to see it
 * gets — storage RLS applies the same seal as the table.
 */
async function signedFaceUrl(supabase: any, path: string): Promise<string | null> {
    if (!path) return null;
    const { data, error } = await supabase.storage
        .from("faces")
        .createSignedUrl(path, FACE_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
}

/** Long enough to render the page and be cached briefly, short enough
 *  that a copied URL stops working. */
const FACE_URL_TTL_SECONDS = 60 * 60;

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

    // --- Public identity: this is all anyone sees until they fail ---
    const username = validateUsername(input.username);
    const avatarUrl = (input.avatarUrl || "").trim();
    if (avatarUrl && (!avatarUrl.startsWith("https://") || avatarUrl.length > 500)) {
        throw new Error("Invalid profile picture");
    }

    // Social is optional, and editable in settings afterwards.
    let socialPlatformId = "";
    let socialHandleValue = "";
    const rawHandle = (input.socialHandle || "").trim();
    if (rawHandle) {
        const platform = socialPlatform(input.socialPlatform || "");
        if (!platform) throw new Error("Choose where people can find you");
        socialHandleValue = cleanHandle(platform.id, rawHandle);
        if (socialHandleValue.length < 2 || socialHandleValue.length > 60 || /\s/.test(socialHandleValue)) {
            throw new Error("Add a valid handle, or leave it empty");
        }
        if (platform.id === "website" && !socialHandleValue.includes(".")) {
            throw new Error("Enter a full website address");
        }
        socialPlatformId = platform.id;
    }

    // --- Sealed identity: held back until the contract is breached ---
    const realName = validateRealName(input.realName);
    const facePath = (input.facePath || "").trim();
    // The path is produced by uploadFacePhoto, which always scopes it to
    // the caller. Re-check, because this input arrives from the client.
    if (!facePath || facePath.length > 300 || !facePath.startsWith(`${user.id}/`)) {
        throw new Error("A photo of your face is required");
    }

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

    // The public identity has to land before the contract does: the feed,
    // the comment trigger and the contract page all read the username off
    // the profile, so a contract without one would render as "someone".
    const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        username,
        avatar_url: avatarUrl,
        social_platform: socialPlatformId,
        social_handle: socialHandleValue,
        updated_at: new Date().toISOString(),
    });

    if (profileError) {
        if (profileError.code === "23505") {
            throw new Error("That username is taken. Pick another one");
        }
        console.error("Error saving public identity:", profileError);
        throw new Error(
            `Failed to save your username: ${profileError.message}. ` +
            "If this mentions a missing column, run migrations/add_pseudonymous_identity.sql in Supabase."
        );
    }

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

    // The sealed half. If this fails the contract has no stake behind it,
    // so the contract goes with it rather than standing as an empty threat.
    const { error: sealError } = await supabase.from("contract_identity").insert({
        contract_id: contract.id,
        user_id: user.id,
        real_name: realName,
        face_path: facePath,
        signature_strokes: input.strokes,
    });

    if (sealError) {
        await supabase.from("contracts").delete().eq("id", contract.id);
        console.error("Error sealing identity:", sealError);
        throw new Error(
            `Failed to seal your identity: ${sealError.message}. ` +
            "If this mentions a missing table, run migrations/add_pseudonymous_identity.sql in Supabase."
        );
    }

    // Events are public, so this one says nothing the seal is holding.
    await supabase.from("contract_events").insert({
        contract_id: contract.id,
        type: "signed",
        detail: `Locked in by @${username}. In effect from ${effectiveAt.toISOString()}.`,
    });

    revalidatePath("/");
    revalidatePath(`/c/${input.category}`);
    return { success: true, contractId: contract.id, effectiveAt: effectiveAt.toISOString() };
}

// ============================================
// PROOF
// ============================================

/**
 * The face you sign with. Goes to the private `faces` bucket and returns
 * a storage path, not a URL — there is no public URL to leak. It becomes
 * viewable to other people only when the contract is breached, and then
 * only through a short-lived signed URL.
 */
export async function uploadFacePhoto(formData: FormData): Promise<string> {
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

    // The first path segment is the owner, which is what the bucket's
    // policy checks. Derived here, never taken from the filename.
    const ext = safeExtension(file.name);
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
        .from("faces")
        .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
        console.error("Error uploading face photo:", error);
        throw new Error(
            `Failed to upload the photo: ${error.message}. ` +
            "If this mentions a missing bucket or a policy, run migrations/add_pseudonymous_identity.sql in Supabase."
        );
    }

    return data.path;
}

/**
 * A preview of your own sealed face, for the signing ritual and settings.
 * Only ever your own: storage RLS refuses anyone else's while sealed.
 */
export async function getMyFaceUrl(path: string): Promise<string | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !path.startsWith(`${user.id}/`)) return null;
    return signedFaceUrl(supabase, path);
}

/** An extension we are willing to put in a storage key, or "jpg". */
function safeExtension(filename: string): string {
    const raw = (filename || "").split(".").pop() || "";
    return /^[a-zA-Z0-9]{1,5}$/.test(raw) ? raw.toLowerCase() : "jpg";
}

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
        .select(CONTRACT_SELECT)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error || !data) {
        if (error) console.error("Error fetching the record:", error);
        return [];
    }

    const contracts = data.map(mapContract);
    await applyContractProfiles(supabase, contracts);
    return contracts;
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
        .select(CONTRACT_SELECT)
        .eq("id", id)
        .single();

    if (error || !contract) return null;

    const record = mapContract(contract);
    await applyContractProfiles(supabase, [record]);

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
        contract: record,
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

    // You comment as your username, never as the name under the seal. The
    // database trigger stamps these from the profile as well, so this is
    // belt and braces rather than the only guard.
    const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    const authorName = profile?.username || "someone";
    const authorPhoto = profile?.avatar_url || "";

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

    // Humiliating someone does not cost you your own seal: you post to the
    // wall under your username, exactly as you do everywhere else.
    const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    const { error } = await supabase.from("contract_comments").insert({
        contract_id: contractId,
        user_id: user.id,
        author_name: profile?.username || "someone",
        author_photo: profile?.avatar_url || "",
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

    // Your own contracts always come back revealed — the seal is aimed at
    // everyone else, and you need to see what you signed with.
    const { data, error } = await supabase
        .from("contracts")
        .select(CONTRACT_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error || !data) return [];
    const contracts = data.map(mapContract);
    await applyContractProfiles(supabase, contracts);
    return contracts;
}

/**
 * A register's page: its live contracts and its recent proof.
 */
export async function getCategoryContracts(category: string): Promise<ContractRecord[]> {
    if (!VALID_CATEGORIES.includes(category)) return [];
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("contracts")
        .select(CONTRACT_SELECT)
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error || !data) return [];
    const contracts = data.map(mapContract);
    await applyContractProfiles(supabase, contracts);
    return contracts;
}

function mapComments(rows: any): CommentRecord[] {
    if (!Array.isArray(rows)) return [];
    const byDate = (a: CommentRecord, b: CommentRecord) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    const all = rows.map((r: any) => ({
        id: r.id,
        authorId: r.user_id || "",
        authorName: r.author_name || "someone",
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
            if (live) {
                comment.authorPhoto = live.avatarUrl;
                if (live.username) comment.authorName = live.username;
            }
            paint(comment.replies);
        }
    };
    for (const entry of entries) {
        const live = profiles.get(entry.userId);
        if (live) {
            entry.avatarUrl = live.avatarUrl;
            entry.username = live.username || "someone";
        }
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
        // Filled in by applyLiveProfiles — the feed reads identity off the
        // profile, so there is no route by which a sealed name reaches it.
        username: "someone",
        avatarUrl: "",
        discipline: c.contracts?.discipline || "",
        category: c.contracts?.category || "",
        commitment: c.contracts?.commitment || "",
        cadence: c.contracts?.cadence || "daily",
    };
}

const FEED_SELECT =
    "id, contract_id, user_id, content, images, created_at, " +
    "contracts!inner(category, discipline, commitment, cadence, timezone), " +
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
        .select(CONTRACT_SELECT)
        .eq("status", "breached")
        .order("breached_at", { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    // Every row here is breached, so the seal is off: `revealed` comes back
    // true and the real name and face are populated.
    const contracts = data.map(mapContract);
    await applyContractProfiles(supabase, contracts);
    return contracts;
}
