"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// The contract snapshots the name, face and social you signed with, so
// a breach always publishes the person who made the promise. The
// profile below is the living version: how you appear everywhere else.

export type ProfileData = {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    bio: string;
};

export async function getProfile(): Promise<ProfileData | null> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    const metadata = user.user_metadata || {};

    const { data: row } = await supabase
        .from("profiles")
        .select("avatar_url, bio, display_name")
        .eq("id", user.id)
        .maybeSingle();

    return {
        id: user.id,
        email: user.email || "",
        display_name: row?.display_name || metadata.display_name || metadata.full_name || "",
        avatar_url: row?.avatar_url || metadata.avatar_url || null,
        bio: row?.bio || "",
    };
}

/**
 * The living profile of any user: their current picture and bio.
 */
export async function getPublicProfiles(
    userIds: string[]
): Promise<Map<string, { avatarUrl: string; bio: string }>> {
    const map = new Map<string, { avatarUrl: string; bio: string }>();
    if (userIds.length === 0) return map;

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("id, avatar_url, bio")
        .in("id", userIds);

    if (error) {
        console.error(
            "Could not read profiles:",
            error.message,
            "— if this mentions a missing table, column or policy, run migrations/add_profile_bio.sql in Supabase."
        );
    }

    for (const row of data || []) {
        // Written through the app this is always our storage URL, but the
        // column is reachable through the API directly, so re-check it.
        const avatarUrl =
            typeof row.avatar_url === "string" && row.avatar_url.startsWith("https://")
                ? row.avatar_url
                : "";
        map.set(row.id, { avatarUrl, bio: (row.bio || "").slice(0, 300) });
    }
    return map;
}

export async function updateMyProfile(input: { avatarUrl?: string; bio?: string }) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("You must be logged in");

    const update: Record<string, any> = { id: user.id, updated_at: new Date().toISOString() };

    if (input.bio !== undefined) {
        const bio = input.bio.trim();
        if (bio.length > 300) throw new Error("Your bio must be under 300 characters");
        update.bio = bio;
    }

    if (input.avatarUrl !== undefined) {
        if (input.avatarUrl && !input.avatarUrl.startsWith("https://")) {
            throw new Error("Invalid photo");
        }
        update.avatar_url = input.avatarUrl;
        await supabase.auth.updateUser({ data: { avatar_url: input.avatarUrl } });
    }

    const { error } = await supabase.from("profiles").upsert(update);

    if (error) {
        console.error("Error saving profile:", error);
        throw new Error(
            `Failed to save: ${error.message}. ` +
            "If this mentions a missing table or column, run migrations/add_profile_bio.sql in Supabase."
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
