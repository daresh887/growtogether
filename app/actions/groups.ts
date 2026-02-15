"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export type CreateGroupData = {
    name: string;
    description: string;
    emoji: string;
    category: string;
    rules: string[];
    settings: {
        requireDailyPost: boolean;

    };
    contract?: {
        text: string;
        requireSignature: boolean;
    };
    theme?: {
        primaryColor: string;
        glowColor: string;
        cardStyle: "minimal" | "glassy" | "neon" | "gradient";
        bannerType: "solid" | "gradient" | "animated";
        gradientColors: string[];
        iconUrl?: string;
    };
    groupDNA?: {
        vibe: string;
        values: string[];
        motto: string;
    };
};

// ============================================
// GROUP MANAGEMENT
// ============================================

export async function uploadGroupIcon(formData: FormData): Promise<string> {
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
    // Change path to be under user's folder to likely pass RLS policies (owner-only access usually requires root folder to be user_id)
    const fileName = `${user.id}/group-icons/${Date.now()}.${ext}`;

    // Upload to Supabase Storage - using 'avatars' bucket for simplicity as it exists
    // You might want to create a dedicated 'group-assets' bucket in production
    const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: true,
        });

    if (uploadError) {
        console.error("Error uploading group icon:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}. Ensure 'avatars' bucket exists and RLS allows uploads.`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);

    return publicUrl;
}

export async function createGroup(data: CreateGroupData) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to create a group");
    }

    // Input validation
    if (!data.name || data.name.trim().length === 0) throw new Error("Group name is required");
    if (data.name.length > 100) throw new Error("Group name must be under 100 characters");
    if (data.description && data.description.length > 1000) throw new Error("Description must be under 1,000 characters");
    if (data.rules && data.rules.length > 20) throw new Error("Maximum 20 rules allowed");
    if (data.groupDNA?.motto && data.groupDNA.motto.length > 200) throw new Error("Motto must be under 200 characters");

    // 1. Create the group
    const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
            name: data.name.trim(),
            description: (data.description || "").trim(),
            emoji: data.emoji,
            category: data.category,
            created_by: user.id,
            rules: data.rules,
            settings: data.settings,
            contract_text: data.contract?.text || null,
            theme: data.theme || null,
            group_dna: data.groupDNA || null,
        })
        .select()
        .single();

    if (groupError) {
        console.error("Error creating group:", groupError);
        throw new Error("Failed to create group");
    }

    // 2. Add creator as admin
    const { error: memberError } = await supabase
        .from("group_members")
        .insert({
            group_id: group.id,
            user_id: user.id,
            role: "admin",
        });

    if (memberError) {
        console.error("Error adding admin:", memberError);
        throw new Error("Failed to join group as admin");
    }

    revalidatePath("/groups");
    return group;
}

export async function getGroups(filters?: { category?: string; search?: string; sort?: string }) {
    const supabase = await createClient();

    let query = supabase
        .from("groups")
        .select("*, group_members(count)");

    if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
    }

    if (filters?.search) {
        query = query.ilike("name", `%${filters.search}%`);
    }

    // Default stable sort from DB
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching groups:", error);
        return [];
    }

    const mappedGroups = data.map((g: any) => ({
        ...g,
        memberCount: g.group_members?.[0]?.count || 0,
        rules: Array.isArray(g.rules) ? g.rules : (typeof g.rules === 'string' ? JSON.parse(g.rules) : []),
        settings: typeof g.settings === 'object' ? g.settings : (typeof g.settings === 'string' ? JSON.parse(g.settings) : {}),
        recentPostCount: 0,
    }));

    // For most-active sort (or by default), fetch recent post counts per group
    if (!filters?.sort || filters.sort === "most-active") {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const groupIds = mappedGroups.map((g: any) => g.id);

        if (groupIds.length > 0) {
            const { data: postCounts, error: postError } = await supabase
                .from("posts")
                .select("group_id")
                .in("group_id", groupIds)
                .gte("created_at", threeDaysAgo.toISOString());

            if (!postError && postCounts) {
                // Count posts per group
                const countMap: Record<string, number> = {};
                for (const row of postCounts) {
                    countMap[row.group_id] = (countMap[row.group_id] || 0) + 1;
                }
                // Attach counts
                for (const group of mappedGroups) {
                    group.recentPostCount = countMap[group.id] || 0;
                }
            }
        }

        return mappedGroups.sort((a: any, b: any) => {
            // Primary: most recent posts. Secondary: most members. Tertiary: newest
            if (b.recentPostCount !== a.recentPostCount) return b.recentPostCount - a.recentPostCount;
            if (b.memberCount !== a.memberCount) return b.memberCount - a.memberCount;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }

    // Sort in memory to handle member counts
    if (filters?.sort === "members") {
        return mappedGroups.sort((a: any, b: any) => b.memberCount - a.memberCount);
    } else if (filters?.sort === "alphabetical") {
        return mappedGroups.sort((a: any, b: any) => a.name.localeCompare(b.name));
    } else if (filters?.sort === "newest") {
        return mappedGroups.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return mappedGroups;
}

export async function getGroup(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: group, error } = await supabase
        .from("groups")
        .select("*, group_members(count)")
        .eq("id", id)
        .single();

    if (error || !group) return null;

    let isMember = false;
    let userRole: "owner" | "moderator" | "member" | null = null;
    let isOwner = false;

    if (user) {
        // Check if user is the group owner
        isOwner = group.created_by === user.id;

        const { data: member } = await supabase
            .from("group_members")
            .select("id, role")
            .eq("group_id", id)
            .eq("user_id", user.id)
            .single();

        isMember = !!member;

        if (member) {
            if (isOwner) {
                userRole = "owner";
            } else if (member.role === "moderator") {
                userRole = "moderator";
            } else {
                userRole = "member";
            }
        }
    }

    return {
        ...group,
        memberCount: group.group_members?.[0]?.count || 0,
        isMember,
        userRole,
        isOwner,
        currentUserId: user?.id || null,
        rules: Array.isArray(group.rules) ? group.rules : (typeof group.rules === 'string' ? JSON.parse(group.rules) : []),
        settings: typeof group.settings === 'object' ? group.settings : (typeof group.settings === 'string' ? JSON.parse(group.settings) : {})
    };
}

export async function joinGroup(groupId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to join a group");
    }

    const { error } = await supabase
        .from("group_members")
        .insert({
            group_id: groupId,
            user_id: user.id,
            role: "member",
        });

    if (error) {
        if (error.code === '23505') {
            return { success: true, message: "Already a member" };
        }
        console.error("Error joining group:", error);
        throw new Error("Failed to join group");
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

export async function leaveGroup(groupId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to leave a group");
    }

    // Check if user is the group owner
    const { data: group } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .single();

    if (group?.created_by === user.id) {
        throw new Error("As the group owner, you cannot leave. Transfer ownership or delete the group instead.");
    }

    const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Error leaving group:", error);
        throw new Error("Failed to leave group");
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

// ============================================
// LEADERBOARD
// ============================================

export async function getLeaderboard(groupId: string) {
    const supabase = await createClient();

    // Fetch members without FK join (avoids ambiguous FK issues)
    const { data: members, error } = await supabase
        .from("group_members")
        .select("user_id, streak_count, last_posted_at")
        .eq("group_id", groupId)
        .order("streak_count", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }

    if (!members || members.length === 0) return [];

    // Fetch profiles separately
    const userIds = members.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, avatar")
        .in("id", userIds);

    const profileMap = new Map<string, any>();
    if (profiles) {
        for (const p of profiles) {
            profileMap.set(p.id, p);
        }
    }

    const membersWithCounts = await Promise.all(members.map(async (m: any) => {
        const profile = profileMap.get(m.user_id);

        // Fetch total posts count for this user in this group
        const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("group_id", groupId)
            .eq("user_id", m.user_id);

        return {
            userId: m.user_id,
            displayName: profile?.display_name || "User",
            streak: m.streak_count || 0,
            userAvatar: profile?.avatar_url || null,
            userEmoji: profile?.avatar || "🧑‍💻",
            avatar: (profile?.display_name || "U").charAt(0).toUpperCase(),
            lastPostedAt: m.last_posted_at,
            totalPosts: count || 0,
        };
    }));

    return membersWithCounts;
}

// ============================================
// POSTS
// ============================================

// Post types for different content
export type PostType = "update" | "photo" | "goal" | "question" | "celebration";

export interface CreatePostData {
    content: string;
    images?: string[];
    mood?: string;
    postType?: PostType;
    dayCount?: number;
}

export async function uploadPostImage(file: File): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to upload images");
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

    const fileExt = file.name.split('.').pop() || "jpg";
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error("Failed to upload image");
    }

    const { data: urlData } = supabase.storage
        .from('post-images')
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

export async function createPost(groupId: string, content: string, options?: Omit<CreatePostData, 'content'>) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in to post");
    }

    // Input validation
    if (!content || content.trim().length === 0) throw new Error("Post content is required");
    if (content.length > 5000) throw new Error("Post must be under 5,000 characters");
    if (options?.images && options.images.length > 10) throw new Error("Maximum 10 images per post");

    // Rate limiting: check last post time (30 second cooldown)
    const { data: lastPost } = await supabase
        .from("posts")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (lastPost) {
        const timeSinceLastPost = Date.now() - new Date(lastPost.created_at).getTime();
        if (timeSinceLastPost < 30_000) {
            const waitSeconds = Math.ceil((30_000 - timeSinceLastPost) / 1000);
            throw new Error(`Please wait ${waitSeconds} seconds before posting again`);
        }
    }

    // Build insert data with optional fields
    const insertData: Record<string, any> = {
        group_id: groupId,
        user_id: user.id,
        content: content.trim(),
    };

    // Add optional fields if provided (these columns may not exist yet)
    if (options?.images && options.images.length > 0) {
        insertData.images = options.images;
    }
    if (options?.mood) {
        insertData.mood = options.mood;
    }
    if (options?.postType) {
        insertData.post_type = options.postType;
    }
    if (options?.dayCount) {
        insertData.day_count = options.dayCount;
    }

    // 1. Create the post
    const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert(insertData)
        .select()
        .single();

    if (postError) {
        throw new Error("Failed to create post");
    }

    // 2. Update streak
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: member } = await supabase
        .from("group_members")
        .select("last_posted_at, streak_count")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

    let newStreak = 1;
    if (member?.last_posted_at) {
        const lastDate = new Date(member.last_posted_at);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const lastDateStr = lastDate.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDateStr === yesterdayStr) {
            // Posted yesterday - increment streak
            newStreak = (member.streak_count || 0) + 1;
        } else if (lastDateStr === today) {
            // Already posted today - keep streak
            newStreak = member.streak_count || 1;
        }
        // Else: streak resets to 1
    }

    await supabase
        .from("group_members")
        .update({ streak_count: newStreak, last_posted_at: today })
        .eq("group_id", groupId)
        .eq("user_id", user.id);

    revalidatePath(`/groups/${groupId}`);
    return { success: true, streakCount: newStreak };
}

export async function getGroupPosts(
    groupId: string,
    options: { sortBy?: 'recent' | 'popular'; timeFrame?: 'all' | 'week' | 'day' } = {}
) {
    const { sortBy = 'recent', timeFrame = 'all' } = options;
    const supabase = await createClient();

    // Base query - still order by created_at for initial fetch efficiency
    let query = supabase
        .from("posts")
        .select(`
            *,
            profiles!user_id(display_name, avatar_url, avatar),
            post_reactions(emoji, user_id),
            post_comments(
                id,
                content,
                created_at,
                user_id,
                profiles!user_id(display_name, avatar_url, avatar)
            )
        `)
        .eq("group_id", groupId);

    // Time filter at DB level if possible to reduce load
    if (timeFrame === 'week') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        query = query.gte("created_at", date.toISOString());
    } else if (timeFrame === 'day') {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        query = query.gte("created_at", date.toISOString());
    }

    const { data: posts, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("[getGroupPosts] Error fetching posts:", error);
        return [];
    }

    const { data: { user } } = await supabase.auth.getUser();



    const mappedPosts = posts.map((post: any) => {
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
            userEmoji: c.profiles?.avatar || "🧑‍💻",
            content: c.content,
            createdAt: c.created_at
        })).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) || [];

        return {
            id: post.id,
            groupId: post.group_id,
            userId: post.user_id,
            userName: post.profiles?.display_name || "User",
            userAvatar: post.profiles?.avatar_url || null,
            userEmoji: post.profiles?.avatar || "🧑‍💻",
            content: post.content,
            images: post.images || [],
            mood: post.mood || null,
            postType: post.post_type || "update",
            dayCount: post.day_count || null,
            createdAt: post.created_at,
            isPinned: post.is_pinned || false,
            reactions,
            totalReactions,
            userReactions,
            comments
        };
    });

    // Client-side sorting
    if (sortBy === 'popular') {
        return mappedPosts.sort((a: any, b: any) => {
            // Sort by total reactions descendng
            const diff = b.totalReactions - a.totalReactions;
            if (diff !== 0) return diff;
            // Secondary sort by date
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }

    return mappedPosts;
}

// ============================================
// REACTIONS & COMMENTS
// ============================================

export async function toggleReaction(postId: string, emoji: string, groupId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    const { data: existing, error: fetchError } = await supabase
        .from("post_reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error("Error fetching reaction:", fetchError);
        throw new Error("Failed to check reaction status");
    }

    if (existing) {
        const { error: deleteError } = await supabase
            .from("post_reactions")
            .delete()
            .eq("id", existing.id);

        if (deleteError) {
            console.error("Error removing reaction:", deleteError);
            throw new Error("Failed to remove reaction");
        }
    } else {
        const { error: insertError } = await supabase
            .from("post_reactions")
            .insert({
                post_id: postId,
                user_id: user.id,
                emoji
            });

        if (insertError) {
            console.error("Error adding reaction:", insertError);
            throw new Error("Failed to add reaction");
        }
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

export async function addComment(postId: string, content: string, groupId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    // Input validation
    if (!content || content.trim().length === 0) throw new Error("Comment cannot be empty");
    if (content.length > 2000) throw new Error("Comment must be under 2,000 characters");

    // Rate limiting: 10 second cooldown between comments
    const { data: lastComment } = await supabase
        .from("post_comments")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (lastComment) {
        const timeSinceLastComment = Date.now() - new Date(lastComment.created_at).getTime();
        if (timeSinceLastComment < 10_000) {
            const waitSeconds = Math.ceil((10_000 - timeSinceLastComment) / 1000);
            throw new Error(`Please wait ${waitSeconds} seconds before commenting again`);
        }
    }

    const { error } = await supabase
        .from("post_comments")
        .insert({
            post_id: postId,
            user_id: user.id,
            content: content.trim(),
        });

    if (error) {
        throw new Error("Failed to add comment");
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

// ============================================
// ADMIN & MODERATOR MANAGEMENT
// ============================================

export type GroupMember = {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    role: "owner" | "moderator" | "member";
    streak: number;
    joinedAt: string;
};

/**
 * Get all members of a group with their roles (for admin panel)
 */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in");
    }

    // Get group to check ownership
    const { data: group } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .single();

    if (!group) {
        throw new Error("Group not found");
    }

    // Fetch members without relying on FK join (which can fail if FK is missing/ambiguous)
    const { data: members, error } = await supabase
        .from("group_members")
        .select("user_id, role, streak_count, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching members:", error);
        return [];
    }

    if (!members || members.length === 0) {
        return [];
    }

    // Fetch profiles separately
    const userIds = members.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, avatar")
        .in("id", userIds);

    const profileMap = new Map<string, any>();
    if (profiles) {
        for (const p of profiles) {
            profileMap.set(p.id, p);
        }
    }

    return members.map((m: any) => {
        const profile = profileMap.get(m.user_id);
        return {
            userId: m.user_id,
            displayName: profile?.display_name || "User",
            avatarUrl: profile?.avatar_url || null,
            userEmoji: profile?.avatar || "🧑‍💻",
            role: m.user_id === group.created_by ? "owner" : (m.role === "moderator" ? "moderator" : "member"),
            streak: m.streak_count || 0,
            joinedAt: m.created_at,
        };
    });
}

/**
 * Update group information (owner only)
 */
export async function updateGroup(groupId: string, data: {
    name?: string;
    description?: string;
    emoji?: string;
    rules?: string[];
    theme?: {
        primaryColor: string;
        glowColor: string;
        cardStyle: "minimal" | "glassy" | "neon" | "gradient";
        bannerType: "solid" | "gradient" | "animated";
        gradientColors: string[];
    };
    iconUrl?: string;
    groupDNA?: string | {
        vibe: string;
        values: string[];
        motto: string;
    };
}) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in");
    }

    // Verify user is the owner
    const { data: group } = await supabase
        .from("groups")
        .select("created_by, theme")
        .eq("id", groupId)
        .single();

    if (!group || group.created_by !== user.id) {
        throw new Error("Only the group owner can edit group settings");
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.emoji !== undefined) updateData.emoji = data.emoji;
    if (data.rules !== undefined) updateData.rules = data.rules;

    // Handle theme and iconUrl updates
    if (data.theme !== undefined || data.iconUrl !== undefined) {
        // Parse existing theme if needed
        const currentTheme = typeof group.theme === 'string'
            ? JSON.parse(group.theme)
            : (group.theme || {});

        const newTheme = {
            ...currentTheme,
            ...(data.theme || {}),
        };

        if (data.iconUrl !== undefined) {
            newTheme.iconUrl = data.iconUrl;
        }

        updateData.theme = newTheme;
    }

    if (data.groupDNA !== undefined) updateData.group_dna = data.groupDNA;

    const { error } = await supabase
        .from("groups")
        .update(updateData)
        .eq("id", groupId);

    if (error) {
        console.error("Error updating group:", error);
        throw new Error("Failed to update group");
    }

    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    return { success: true };
}

/**
 * Delete a post (owner/mod can delete any, members can delete their own)
 */
export async function deletePost(postId: string, groupId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in");
    }

    // Get the post
    const { data: post } = await supabase
        .from("posts")
        .select("user_id, group_id")
        .eq("id", postId)
        .single();

    if (!post) {
        throw new Error("Post not found");
    }

    // Get group info
    const { data: group } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", post.group_id)
        .single();

    // Get user's membership
    const { data: membership } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", post.group_id)
        .eq("user_id", user.id)
        .single();

    const isOwner = group?.created_by === user.id;
    const isModerator = membership?.role === "moderator";
    const isPostAuthor = post.user_id === user.id;

    // Check permission
    if (!isOwner && !isModerator && !isPostAuthor) {
        throw new Error("You don't have permission to delete this post");
    }

    // Delete related data first
    await supabase.from("post_reactions").delete().eq("post_id", postId);
    await supabase.from("post_comments").delete().eq("post_id", postId);

    // Delete the post
    const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

    if (error) {
        console.error("Error deleting post:", error);
        throw new Error("Failed to delete post");
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

/**
 * Update a member's role (owner only)
 */
export async function updateMemberRole(groupId: string, targetUserId: string, newRole: "moderator" | "member") {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in");
    }

    // Verify user is the owner
    const { data: group } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .single();

    if (!group || group.created_by !== user.id) {
        throw new Error("Only the group owner can manage roles");
    }

    // Can't change owner's role
    if (targetUserId === group.created_by) {
        throw new Error("Cannot change the owner's role");
    }

    const { error } = await supabase
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", groupId)
        .eq("user_id", targetUserId);

    if (error) {
        console.error("Error updating member role:", error);
        throw new Error("Failed to update member role");
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

/**
 * Remove a member from the group (owner only)
 */
export async function removeMember(groupId: string, targetUserId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in");
    }

    // Verify user is the owner
    const { data: group } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .single();

    if (!group || group.created_by !== user.id) {
        throw new Error("Only the group owner can remove members");
    }

    // Can't remove yourself (owner)
    if (targetUserId === user.id) {
        throw new Error("You cannot remove yourself. Transfer ownership or delete the group instead.");
    }

    const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", targetUserId);

    if (error) {
        console.error("Error removing member:", error);
        throw new Error("Failed to remove member");
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

/**
 * Transfer group ownership to another member (owner only)
 */
export async function transferOwnership(groupId: string, newOwnerId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in");
    }

    // Verify user is the current owner
    const { data: group } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .single();

    if (!group || group.created_by !== user.id) {
        throw new Error("Only the current owner can transfer ownership");
    }

    // Verify new owner is a member
    const { data: newOwnerMembership } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", newOwnerId)
        .single();

    if (!newOwnerMembership) {
        throw new Error("New owner must be a member of the group");
    }

    // Update group ownership
    const { error: groupError } = await supabase
        .from("groups")
        .update({ created_by: newOwnerId })
        .eq("id", groupId);

    if (groupError) {
        console.error("Error transferring ownership:", groupError);
        throw new Error("Failed to transfer ownership");
    }

    // Update old owner's role to member
    await supabase
        .from("group_members")
        .update({ role: "member" })
        .eq("group_id", groupId)
        .eq("user_id", user.id);

    // Update new owner's role to admin
    await supabase
        .from("group_members")
        .update({ role: "admin" })
        .eq("group_id", groupId)
        .eq("user_id", newOwnerId);

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
}

/**
 * Delete the entire group (owner only)
 */
export async function deleteGroup(groupId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("You must be logged in");
    }

    // Verify user is the owner
    const { data: group } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .single();

    if (!group || group.created_by !== user.id) {
        throw new Error("Only the group owner can delete the group");
    }

    // Get all post IDs in this group
    const { data: posts } = await supabase
        .from("posts")
        .select("id")
        .eq("group_id", groupId);

    const postIds = posts?.map(p => p.id) || [];

    // Delete children first: reactions → comments → posts → members
    if (postIds.length > 0) {
        await supabase.from("post_reactions").delete().in("post_id", postIds);
        await supabase.from("post_comments").delete().in("post_id", postIds);
    }
    await supabase.from("posts").delete().eq("group_id", groupId);
    await supabase.from("group_members").delete().eq("group_id", groupId);

    // Delete the group itself
    const { error: deleteError } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

    if (deleteError) {
        console.error("Error deleting group:", deleteError);
        throw new Error(`Failed to delete group: ${deleteError.message}`);
    }

    // Verify the group was actually deleted (RLS can silently block deletes)
    const { data: stillExists } = await supabase
        .from("groups")
        .select("id")
        .eq("id", groupId)
        .single();

    if (stillExists) {
        console.error("Group still exists after delete — likely blocked by RLS policy");
        throw new Error(
            "Failed to delete group: missing database permission. " +
            "Please run the add_delete_policies.sql migration in your Supabase SQL editor."
        );
    }

    revalidatePath("/groups");
    revalidatePath("/my-groups");
    return { success: true };
}


// ============================================
// CHEERS & NUDGES
// ============================================


/**
 * Send a cheer to a group member (lightweight encouragement)
 */
export async function cheerMember(groupId: string, targetUserId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");
    if (user.id === targetUserId) throw new Error("You can't cheer yourself");

    // Check both users are members
    const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .in("user_id", [user.id, targetUserId]);

    if (!members || members.length < 2) {
        throw new Error("Both users must be members of the group");
    }

    // Create a cheer post (special post type)
    const { data: cheerData, error } = await supabase
        .from("posts")
        .insert({
            group_id: groupId,
            user_id: user.id,
            content: `cheered for a fellow member! 🎉`,
            post_type: "cheer",
            metadata: { targetUserId },
        })
        .select("id")
        .single();

    if (error) {
        console.error("Error sending cheer:", error);
        throw new Error("Failed to send cheer");
    }

    return { success: true, postId: cheerData?.id };
}

// ============================================
// GROUP CHALLENGES
// ============================================

/**
 * Set a challenge for the group (owner only)
 */
export async function setGroupChallenge(
    groupId: string,
    challenge: { title: string; description?: string; endsAt: string }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");

    // Verify ownership
    const { data: group } = await supabase
        .from("groups")
        .select("created_by, settings")
        .eq("id", groupId)
        .single();

    if (!group || group.created_by !== user.id) {
        throw new Error("Only the group owner can set challenges");
    }

    const currentSettings = typeof group.settings === "object" && group.settings ? group.settings : {};

    const { error } = await supabase
        .from("groups")
        .update({
            settings: {
                ...currentSettings,
                challenge: {
                    title: challenge.title,
                    description: challenge.description || "",
                    endsAt: challenge.endsAt,
                    createdAt: new Date().toISOString(),
                },
            },
        })
        .eq("id", groupId);

    if (error) {
        console.error("Error setting challenge:", error);
        throw new Error("Failed to set challenge");
    }

    return { success: true };
}

/**
 * Clear/remove the group challenge (owner only)
 */
export async function clearGroupChallenge(groupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");

    const { data: group } = await supabase
        .from("groups")
        .select("created_by, settings")
        .eq("id", groupId)
        .single();

    if (!group || group.created_by !== user.id) {
        throw new Error("Only the group owner can manage challenges");
    }

    const currentSettings = typeof group.settings === "object" && group.settings ? group.settings : {};
    const { challenge, ...rest } = currentSettings as any;

    const { error } = await supabase
        .from("groups")
        .update({ settings: rest })
        .eq("id", groupId);

    if (error) throw new Error("Failed to clear challenge");
    return { success: true };
}

