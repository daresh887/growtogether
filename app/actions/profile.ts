"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { validateUsername } from "@/utils/identity";
import { cleanHandle, socialPlatform } from "@/utils/contract-shared";

// This is the whole of your public identity: a username, a picture if
// you want one, a bio, and a social link if you choose to add one. The
// real name and the face you signed with are not here — they live
// sealed in contract_identity and surface only on a breach.

export type ProfileData = {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string;
    social_platform: string;
    social_handle: string;
};

export type PublicProfile = {
    username: string;
    avatarUrl: string;
    bio: string;
    socialPlatform: string;
    socialHandle: string;
};

export async function getProfile(): Promise<ProfileData | null> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    const metadata = user.user_metadata || {};

    const { data: row } = await supabase
        .from("profiles")
        .select("avatar_url, bio, display_name, username, social_platform, social_handle")
        .eq("id", user.id)
        .maybeSingle();

    return {
        id: user.id,
        email: user.email || "",
        username: row?.username || "",
        display_name: row?.display_name || metadata.display_name || metadata.full_name || "",
        avatar_url: row?.avatar_url || metadata.avatar_url || null,
        bio: row?.bio || "",
        social_platform: row?.social_platform || "",
        social_handle: row?.social_handle || "",
    };
}

/** Whether a username is free. Case-insensitive, since we store lowercase. */
export async function isUsernameAvailable(raw: string): Promise<boolean> {
    let username: string;
    try {
        username = validateUsername(raw);
    } catch {
        return false;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    // Your own username is available to you — re-saving settings unchanged
    // should not read as a collision.
    return !data || data.id === user?.id;
}

/**
 * The living profile of any user: their current picture and bio.
 */
export async function getPublicProfiles(
    userIds: string[]
): Promise<Map<string, PublicProfile>> {
    const map = new Map<string, PublicProfile>();
    if (userIds.length === 0) return map;

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, social_platform, social_handle")
        .in("id", userIds);

    if (error) {
        console.error(
            "Could not read profiles:",
            error.message,
            "— if this mentions a missing table, column or policy, run migrations/add_pseudonymous_identity.sql in Supabase."
        );
    }

    for (const row of data || []) {
        // Written through the app this is always our storage URL, but the
        // column is reachable through the API directly, so re-check it.
        const avatarUrl =
            typeof row.avatar_url === "string" && row.avatar_url.startsWith("https://")
                ? row.avatar_url
                : "";
        map.set(row.id, {
            username: typeof row.username === "string" ? row.username : "",
            avatarUrl,
            bio: (row.bio || "").slice(0, 300),
            socialPlatform: row.social_platform || "",
            socialHandle: row.social_handle || "",
        });
    }
    return map;
}

export async function updateMyProfile(input: {
    username?: string;
    avatarUrl?: string;
    bio?: string;
    socialPlatform?: string;
    socialHandle?: string;
}) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("You must be logged in");

    const update: Record<string, any> = { id: user.id, updated_at: new Date().toISOString() };

    if (input.username !== undefined) {
        update.username = validateUsername(input.username);
    }

    if (input.bio !== undefined) {
        const bio = input.bio.trim();
        if (bio.length > 300) throw new Error("Your bio must be under 300 characters");
        update.bio = bio;
    }

    if (input.avatarUrl !== undefined) {
        // An empty string is a real choice here: no picture at all.
        if (input.avatarUrl && !input.avatarUrl.startsWith("https://")) {
            throw new Error("Invalid photo");
        }
        update.avatar_url = input.avatarUrl;
        await supabase.auth.updateUser({ data: { avatar_url: input.avatarUrl } });
    }

    // Social is optional and always public. Clearing the handle clears both.
    if (input.socialHandle !== undefined || input.socialPlatform !== undefined) {
        const rawHandle = (input.socialHandle || "").trim();
        if (!rawHandle) {
            update.social_platform = "";
            update.social_handle = "";
        } else {
            const platform = socialPlatform(input.socialPlatform || "");
            if (!platform) throw new Error("Choose where people can find you");
            const handle = cleanHandle(platform.id, rawHandle);
            if (handle.length < 2 || handle.length > 60 || /\s/.test(handle)) {
                throw new Error("Add a valid handle, or leave it empty");
            }
            if (platform.id === "website" && !handle.includes(".")) {
                throw new Error("Enter a full website address");
            }
            update.social_platform = platform.id;
            update.social_handle = handle;
        }
    }

    const { error } = await supabase.from("profiles").upsert(update);

    if (error) {
        if (error.code === "23505") {
            throw new Error("That username is taken. Pick another one");
        }
        console.error("Error saving profile:", error);
        throw new Error(
            `Failed to save: ${error.message}. ` +
            "If this mentions a missing table or column, run migrations/add_pseudonymous_identity.sql in Supabase."
        );
    }

    // Your picture appears on the feed, on contract pages and under every
    // comment you have written, so refresh everything below the root layout.
    revalidatePath("/", "layout");
    return { success: true };
}

export async function uploadProfileImage(formData: FormData): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to upload an image");
    }

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

    const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
        console.error("Error uploading image:", uploadError);
        throw new Error(
            `Failed to upload the photo: ${uploadError.message}. ` +
            "If this mentions a missing bucket or a policy, run migrations/add_storage_buckets.sql in Supabase."
        );
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(data.path);

    // Remember it so the next lock-in can prefill
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

    return publicUrl;
}
