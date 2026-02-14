"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export type ProfileUpdateData = {
    display_name?: string;
    username?: string;
    bio?: string;
    avatar?: string; // emoji or URL
    avatar_url?: string; // uploaded image URL
    interests?: string[];
    goals?: string[];
};

export type ProfileData = {
    id: string;
    email: string;
    display_name: string;
    username: string;
    bio: string;
    avatar: string;
    avatar_url: string | null;
    interests: string[];
    goals: string[];
    created_at: string;
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Get the current user's profile
 */
export async function getProfile(): Promise<ProfileData | null> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    const metadata = user.user_metadata || {};

    return {
        id: user.id,
        email: user.email || "",
        display_name: metadata.display_name || metadata.full_name || "",
        username: metadata.username || "",
        bio: metadata.bio || "",
        avatar: metadata.avatar || "🧑‍💻",
        avatar_url: metadata.avatar_url || null,
        interests: metadata.interests || [],
        goals: metadata.goals || [],
        created_at: user.created_at,
    };
}

/**
 * Update the current user's profile
 */
export async function updateProfile(data: ProfileUpdateData) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to update your profile");
    }

    // Input validation
    if (data.display_name && data.display_name.length > 50) throw new Error("Display name must be under 50 characters");
    if (data.username && data.username.length > 30) throw new Error("Username must be under 30 characters");
    if (data.bio && data.bio.length > 500) throw new Error("Bio must be under 500 characters");
    if (data.interests && data.interests.length > 20) throw new Error("Maximum 20 interests allowed");
    if (data.goals && data.goals.length > 20) throw new Error("Maximum 20 goals allowed");

    const { error } = await supabase.auth.updateUser({
        data: {
            display_name: data.display_name,
            username: data.username,
            bio: data.bio,
            avatar: data.avatar,
            avatar_url: data.avatar_url,
            interests: data.interests,
            goals: data.goals,
        },
    });

    if (error) {
        console.error("Error updating profile:", error);
        throw new Error("Failed to update profile");
    }

    // Sync to public.profiles table
    const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
            id: user.id,
            display_name: data.display_name,
            avatar_url: data.avatar_url,
            avatar: data.avatar,
            bio: data.bio,
            interests: data.interests,
            goals: data.goals,
            updated_at: new Date().toISOString(),
        });

    if (profileError) {
        console.error("Error syncing to public profiles:", profileError);
        // We log but don't throw, to allow auth update to succeed even if sync fails
    }

    revalidatePath("/profile");
    revalidatePath("/settings");
    return { success: true };
}

/**
 * Upload a profile image to Supabase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadProfileImage(formData: FormData): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to upload an image");
    }

    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("No file provided");
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
        throw new Error("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.");
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error("File too large. Maximum size is 5MB.");
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: true,
        });

    if (uploadError) {
        console.error("Error uploading image:", uploadError);
        throw new Error("Failed to upload image. Make sure the 'avatars' bucket exists in Supabase Storage.");
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);

    // Update user metadata with the new avatar URL
    await supabase.auth.updateUser({
        data: {
            avatar_url: publicUrl,
        },
    });

    // Sync to public.profiles table
    await supabase
        .from("profiles")
        .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    revalidatePath("/profile");
    revalidatePath("/settings");

    return publicUrl;
}

/**
 * Delete the current profile image
 */
export async function deleteProfileImage(): Promise<void> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to delete your profile image");
    }

    const metadata = user.user_metadata || {};
    const avatarUrl = metadata.avatar_url;

    if (avatarUrl) {
        // Extract the path from the URL
        const urlParts = avatarUrl.split("/avatars/");
        if (urlParts[1]) {
            await supabase.storage
                .from("avatars")
                .remove([urlParts[1]]);
        }
    }

    // Clear the avatar_url from user metadata
    await supabase.auth.updateUser({
        data: {
            avatar_url: null,
        },
    });

    // Sync to public.profiles table
    await supabase
        .from("profiles")
        .update({
            avatar_url: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    revalidatePath("/profile");
    revalidatePath("/settings");
}

/**
 * Get a user's public profile by ID
 */
export async function getPublicProfile(userId: string): Promise<ProfileData | null> {
    const supabase = await createClient();

    // Query the public profiles table
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error || !data) {
        console.error("Error fetching public profile:", error);
        return null;
    }

    return {
        id: data.id,
        email: "", // Don't expose email
        display_name: data.display_name || "User",
        username: data.username || "",
        bio: data.bio || "",
        avatar: data.avatar || "🧑‍💻",
        avatar_url: data.avatar_url || null,
        interests: data.interests || [],
        goals: data.goals || [],
        created_at: data.created_at || new Date().toISOString(),
    };
}

// ============================================
// USER STATS & DATA
// ============================================

export type UserStats = {
    currentStreak: number;
    longestStreak: number;
    totalPosts: number;
    groupsJoined: number;
    level: number;
    xp: number;
    xpToNext: number;
};

/**
 * Get the current user's stats
 */
/**
 * Get a user's stats (current user or specified userId)
 */
export async function getUserStats(userId?: string): Promise<UserStats> {
    const supabase = await createClient();
    let targetUserId = userId;

    if (!targetUserId) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            return { currentStreak: 0, longestStreak: 0, totalPosts: 0, groupsJoined: 0, level: 1, xp: 0, xpToNext: 500 };
        }
        targetUserId = user.id;
    }

    // Get max streak from group_members
    const { data: memberships } = await supabase
        .from("group_members")
        .select("streak_count")
        .eq("user_id", targetUserId);

    const streaks = memberships?.map((m: any) => m.streak_count || 0) || [];
    const currentStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

    // Get total posts count
    const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", targetUserId);

    // Groups joined count
    const groupsJoined = memberships?.length || 0;

    // Calculate level based on posts (simple formula: level = posts / 20 + 1)
    const totalPosts = postCount || 0;
    const level = Math.floor(totalPosts / 20) + 1;
    const xpPerLevel = 500;
    const xp = (totalPosts % 20) * 25;
    const xpToNext = xpPerLevel;

    return {
        currentStreak,
        longestStreak: currentStreak, // Would need separate tracking for longest
        totalPosts,
        groupsJoined,
        level,
        xp,
        xpToNext,
    };
}

export type UserGroup = {
    id: string;
    name: string;
    emoji: string;
    description: string;
    memberCount: number;
    yourStreak: number;
    lastActive: string;
    role: "admin" | "moderator" | "member";
    isOwner: boolean;
    category: string;
    postsToday: number;
    isActive: boolean;
    iconUrl?: string; // Added iconUrl
};

/**
 * Get groups the current user is a member of
 */
/**
 * Get groups a user is a member of (current user or specified userId)
 */
export async function getUserGroups(userId?: string): Promise<UserGroup[]> {
    const supabase = await createClient();
    let targetUserId = userId;

    if (!targetUserId) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return [];
        targetUserId = user.id;
    }

    const { data: memberships, error: memberError } = await supabase
        .from("group_members")
        .select(`
            role,
            streak_count,
            last_posted_at,
            groups (
                id,
                name,
                emoji,
                description,
                category,
                created_at,
                created_by,
                theme
            )
        `)
        .eq("user_id", targetUserId);

    if (memberError || !memberships) {
        console.error("Error fetching user groups:", memberError);
        return [];
    }

    const today = new Date().toISOString().split('T')[0];

    const groups = await Promise.all(
        memberships.map(async (m: any) => {
            const group = m.groups;
            if (!group) return null;

            // Get member count for this group
            const { count: memberCount } = await supabase
                .from("group_members")
                .select("*", { count: "exact", head: true })
                .eq("group_id", group.id);

            // Get posts today for this group
            const { count: postsToday } = await supabase
                .from("posts")
                .select("*", { count: "exact", head: true })
                .eq("group_id", group.id)
                .gte("created_at", `${today}T00:00:00`);

            // Check if user posted today
            const isActive = m.last_posted_at?.startsWith(today) || false;

            // Get last activity time
            const { data: lastPost } = await supabase
                .from("posts")
                .select("created_at")
                .eq("group_id", group.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            const lastActiveDate = lastPost?.created_at ? new Date(lastPost.created_at) : new Date(group.created_at);
            const lastActive = getRelativeTime(lastActiveDate);

            // Check ownership
            const isOwner = group.created_by === targetUserId;

            // Parse theme if needed (though usually object from supabase)
            const theme = typeof group.theme === 'string' ? JSON.parse(group.theme) : group.theme;
            const iconUrl = theme?.iconUrl;

            return {
                id: group.id,
                name: group.name,
                emoji: group.emoji || "👥",
                description: group.description || "",
                memberCount: memberCount || 0,
                yourStreak: m.streak_count || 0,
                lastActive,
                role: isOwner ? "admin" : (m.role === "moderator" ? "moderator" : m.role) as "admin" | "moderator" | "member",
                isOwner,
                category: group.category || "general",
                postsToday: postsToday || 0,
                isActive,
                iconUrl,
            };
        })
    );

    return groups.filter(Boolean) as UserGroup[];
}

export type Achievement = {
    id: string;
    emoji: string;
    name: string;
    desc: string;
    earned: boolean;
    orbit: number;
};

/**
 * Get user achievements based on their stats
 */
/**
 * Get user achievements based on their stats
 */
export async function getUserAchievements(userId?: string): Promise<Achievement[]> {
    const stats = await getUserStats(userId);
    const groups = await getUserGroups(userId);

    return [
        { id: "1", emoji: "🔥", name: "Week Warrior", desc: "7-day streak", earned: stats.currentStreak >= 7, orbit: 1 },
        { id: "2", emoji: "💪", name: "First Post", desc: "Share your first update", earned: stats.totalPosts >= 1, orbit: 1 },
        { id: "3", emoji: "🌟", name: "Rising Star", desc: "Make 10 posts", earned: stats.totalPosts >= 10, orbit: 1 },
        { id: "4", emoji: "🏆", name: "Month Master", desc: "30-day streak", earned: stats.currentStreak >= 30, orbit: 2 },
        { id: "5", emoji: "👥", name: "Social Butterfly", desc: "Join 5 groups", earned: groups.length >= 5, orbit: 2 },
        { id: "6", emoji: "💬", name: "Active Member", desc: "Join 3 groups", earned: groups.length >= 3, orbit: 2 },
        { id: "7", emoji: "🚀", name: "Centurion", desc: "100 posts", earned: stats.totalPosts >= 100, orbit: 3 },
        { id: "8", emoji: "⚡", name: "Power User", desc: "50 posts", earned: stats.totalPosts >= 50, orbit: 3 },
    ];
}

export type UserPost = {
    id: string;
    group: string;
    groupId: string;
    emoji: string;
    content: string;
    images: string[];
    mood: string | null;
    postType: "update" | "photo" | "goal" | "question" | "celebration";
    dayCount: number | null;
    reactions: Record<string, number>;
    totalReactions: number;
    userReactions: string[];
    comments: {
        id: string;
        userId: string;
        userName: string;
        userAvatar: string | null;
        content: string;
        createdAt: string;
    }[];
    time: string;
    createdAt: string;
};

/**
 * Get recent posts by a user (defaults to current user if no ID provided)
 */
export async function getUserPosts(limit: number = 5, userId?: string): Promise<UserPost[]> {
    const supabase = await createClient();
    let targetUserId = userId;

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!targetUserId) {
        if (error || !user) {
            return [];
        }
        targetUserId = user.id;
    }

    const { data: posts, error: postError } = await supabase
        .from("posts")
        .select(`
            *,
            groups (name, emoji),
            post_reactions (emoji, user_id),
            post_comments (
                id,
                content,
                created_at,
                user_id,
                profiles!user_id (display_name, avatar_url)
            )
        `)
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (postError || !posts) {
        console.error("Error fetching user posts:", postError);
        return [];
    }

    return posts.map((post: any) => {
        // Count reactions
        const reactions: Record<string, number> = {};
        const userReactions: string[] = [];
        let totalReactions = 0;

        post.post_reactions?.forEach((r: any) => {
            reactions[r.emoji] = (reactions[r.emoji] || 0) + 1;
            totalReactions++;
            if (user && r.user_id === user.id) {
                userReactions.push(r.emoji);
            }
        });

        // Map comments
        const comments = post.post_comments?.map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            userName: c.profiles?.display_name || "User",
            userAvatar: c.profiles?.avatar_url || null,
            content: c.content,
            createdAt: c.created_at
        })).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) || [];

        return {
            id: post.id,
            group: post.groups?.name || "Unknown Group",
            groupId: post.group_id,
            emoji: post.groups?.emoji || "👥",
            content: post.content,
            images: post.images || [],
            mood: post.mood || null,
            postType: post.post_type || "update",
            dayCount: post.day_count || null,
            reactions,
            totalReactions,
            userReactions,
            comments,
            time: getRelativeTime(new Date(post.created_at)),
            createdAt: post.created_at,
        };
    });
}

export type ActivityItem = {
    id: string;
    type: "post" | "reaction" | "join";
    user: string;
    userId: string;
    avatarUrl: string | null;
    group: string;
    groupId: string;
    emoji: string;
    time: string;
    content: string;
};

/**
 * Get activity feed from user's groups
 */
export async function getActivityFeed(limit: number = 10): Promise<ActivityItem[]> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return [];
    }

    // Get user's group IDs
    const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
        return [];
    }

    const groupIds = memberships.map(m => m.group_id);

    // Get recent posts from user's groups
    const { data: posts, error: postError } = await supabase
        .from("posts")
        .select(`
            id,
            content,
            created_at,
            user_id,
            groups (name, emoji)
        `)
        .in("group_id", groupIds)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (postError || !posts) {
        return [];
    }

    return posts.map((post: any) => ({
        id: post.id,
        type: "post" as const,
        user: "Member", // Would need to join with profiles
        userId: post.user_id,
        avatarUrl: null,
        group: post.groups?.name || "Group",
        groupId: post.group_id,
        emoji: post.groups?.emoji || "👥",
        time: getRelativeTime(new Date(post.created_at)),
        content: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : ""),
    }));
}

// Helper function for relative time
function getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

