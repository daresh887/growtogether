"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { getProfile, getPublicProfile, getUserStats, getUserGroups, getUserAchievements, getUserPosts, type ProfileData, type UserStats, type UserGroup, type Achievement, type UserPost } from "@/app/actions/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Settings,
    Flame,
    Zap,
    FileText,
    Heart,
    MessageCircle,
    Trophy,
    Users,
    Target,
    Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOODS = [
    { emoji: "🔥", label: "Crushing it!" },
    { emoji: "💪", label: "Productive" },
    { emoji: "😊", label: "Happy" },
    { emoji: "😌", label: "Calm" },
    { emoji: "😤", label: "Struggling" },
    { emoji: "💭", label: "Reflective" },
    { emoji: "🎉", label: "Celebrating" },
    { emoji: "😴", label: "Tired" },
];

function renderMarkdown(text: string): React.ReactNode {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
        let processed = line
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<u>$1</u>')
            .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        const isBullet = line.startsWith('• ');
        if (isBullet) processed = processed.substring(2);
        const element = (
            <span
                key={lineIdx}
                className={isBullet ? "flex gap-2" : undefined}
                dangerouslySetInnerHTML={{
                    __html: isBullet ? `<span class="text-primary">•</span> ${processed}` : processed
                }}
            />
        );
        if (lineIdx < lines.length - 1) return <span key={`line-${lineIdx}`}>{element}<br /></span>;
        return element;
    });
}

export default function ProfilePage() {
    const params = useParams();
    const supabase = createClient();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [posts, setPosts] = useState<UserPost[]>([]);
    const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadProfile();
    }, [params.id]);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const isOwn = params.id === "me" || !!(user && params.id === user.id);
            setIsOwnProfile(isOwn);

            if (isOwn && user) {
                const [profileData, statsData, groupsData, achievementsData, postsData] = await Promise.all([
                    getProfile(), getUserStats(), getUserGroups(), getUserAchievements(), getUserPosts(10, user.id),
                ]);
                if (profileData) {
                    setProfile(profileData); setStats(statsData); setGroups(groupsData);
                    setAchievements(achievementsData); setPosts(postsData);
                }
            } else {
                const userId = params.id as string;
                const publicProfile = await getPublicProfile(userId);
                if (publicProfile) {
                    setProfile(publicProfile);
                    const [statsData, groupsData, achievementsData, postsData] = await Promise.all([
                        getUserStats(userId), getUserGroups(userId), getUserAchievements(userId), getUserPosts(10, userId),
                    ]);
                    setStats(statsData); setGroups(groupsData); setAchievements(achievementsData); setPosts(postsData);
                }
            }
        } catch (err) { console.error("Error loading profile:", err); }
        finally { setLoading(false); }
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center min-h-[80vh]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3">
                    <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium">Profile not found</p>
                </div>
            </div>
        );
    }

    const earnedCount = achievements.filter(a => a.earned).length;
    const progressPercent = stats ? (stats.xp / stats.xpToNext) * 100 : 0;
    const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                {/* Profile Hero */}
                <Card className="mb-6">
                    <CardContent className="p-6 md:p-8">
                        <div className="flex gap-6 items-start flex-wrap md:flex-nowrap">
                            {/* Avatar with level ring */}
                            <div className="relative shrink-0">
                                <div
                                    className="w-24 h-24 rounded-full p-1 flex items-center justify-center"
                                    style={{ background: `conic-gradient(hsl(var(--primary)) ${progressPercent}%, hsl(var(--border)) ${progressPercent}%)` }}
                                >
                                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-4xl overflow-hidden">
                                        {profile.avatar_url ? (
                                            <Image src={profile.avatar_url} alt={profile.display_name} width={88} height={88} className="object-cover w-full h-full" />
                                        ) : (
                                            profile.avatar
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground border-2 border-card">
                                    {stats?.level || 1}
                                </div>
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-2xl font-bold tracking-tight">{profile.display_name || "User"}</h1>
                                    {isOwnProfile && (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href="/settings"><Settings size={14} className="mr-1" /> Edit</Link>
                                        </Button>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    {profile.username && `@${profile.username}`} {profile.username && "·"} Member since {memberSince}
                                </p>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                    {profile.bio || "Building habits, one day at a time."}
                                </p>

                                {/* XP Bar */}
                                {stats && (
                                    <div className="mb-4">
                                        <div className="flex justify-between mb-1.5">
                                            <span className="text-xs text-muted-foreground">Level {stats.level}</span>
                                            <span className="text-xs text-muted-foreground">{stats.xp} / {stats.xpToNext} XP</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-500"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Stats Row */}
                                <div className="flex gap-6">
                                    <div>
                                        <div className="text-xl font-bold text-orange-500">{stats?.currentStreak || 0}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1"><Flame size={10} /> Current Streak</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold">{stats?.longestStreak || 0}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1"><Zap size={10} /> Best Streak</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold">{stats?.totalPosts || 0}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1"><FileText size={10} /> Total Posts</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Interests */}
                {profile.interests.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-6">
                        {profile.interests.map(interest => (
                            <Badge key={interest} variant="secondary" className="text-xs py-1 px-3">
                                {interest}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Goals */}
                {profile.goals && profile.goals.length > 0 && (
                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Target size={16} /> Goals
                                </h2>
                                <Badge variant="secondary">{profile.goals.length} active</Badge>
                            </div>
                            <div className="space-y-2">
                                {profile.goals.map((goal, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                        <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 text-sm">{goal}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Achievements */}
                {achievements.length > 0 && (
                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Trophy size={16} /> Achievements
                                </h2>
                                <Badge variant="secondary">{earnedCount}/{achievements.length} unlocked</Badge>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {achievements.map(achievement => (
                                    <div
                                        key={achievement.id}
                                        onMouseEnter={() => setHoveredAchievement(achievement.id)}
                                        onMouseLeave={() => setHoveredAchievement(null)}
                                        className={cn(
                                            "relative p-4 rounded-lg border text-center cursor-pointer transition-all",
                                            achievement.earned
                                                ? "border-yellow-500/30 bg-yellow-500/5"
                                                : "border-border bg-muted opacity-50 grayscale"
                                        )}
                                    >
                                        <div className="text-2xl mb-2">{achievement.emoji}</div>
                                        <div className={cn("text-xs font-semibold", achievement.earned ? "text-foreground" : "text-muted-foreground")}>
                                            {achievement.name}
                                        </div>
                                        {!achievement.earned && (
                                            <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-0.5">
                                                <Lock size={8} /> Locked
                                            </div>
                                        )}

                                        {/* Tooltip */}
                                        {hoveredAchievement === achievement.id && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-popover border border-border rounded-lg shadow-lg z-50 pointer-events-none min-w-[160px]">
                                                <div className="font-semibold text-xs mb-1">{achievement.name}</div>
                                                <div className="text-xs text-muted-foreground leading-relaxed">{achievement.desc}</div>
                                                {achievement.earned && (
                                                    <div className="text-[10px] text-yellow-500 font-semibold mt-1.5">✨ Earned</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Groups */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="font-semibold mb-4 flex items-center gap-2">
                            <Users size={16} /> Groups
                        </h2>
                        {groups.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                <p className="text-sm mb-3">No groups joined yet</p>
                                <Button size="sm" asChild>
                                    <Link href="/groups">Explore Groups</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {groups.map(group => (
                                    <Link
                                        key={group.id}
                                        href={`/groups/${group.id}`}
                                        className="min-w-[160px] p-4 rounded-lg border border-border bg-muted hover:border-muted-foreground/50 transition-colors"
                                    >
                                        <div className="text-2xl mb-2">{group.emoji}</div>
                                        <div className="font-semibold text-sm mb-1 truncate">{group.name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                            <span>{group.memberCount} members</span>
                                            {group.role === "admin" && (
                                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Admin</Badge>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Posts */}
                <div>
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText size={16} /> Recent Activity
                    </h2>
                    {posts.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground text-sm">
                                No posts yet
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {posts.map(post => (
                                <Card key={post.id}>
                                    <CardContent className="p-5">
                                        {/* Post Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                                {profile.avatar_url ? (
                                                    <Image src={profile.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
                                                ) : (
                                                    <span className="text-base">{profile.avatar}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">{profile.display_name}</span>
                                                    <Link
                                                        href={`/groups/${post.groupId}`}
                                                        className="text-[11px] text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5 hover:text-foreground transition-colors"
                                                    >
                                                        {post.emoji} {post.group}
                                                    </Link>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{post.time}</span>
                                            </div>
                                        </div>

                                        {/* Mood + Day */}
                                        {(post.mood || post.dayCount) && (
                                            <div className="flex gap-2 mb-3">
                                                {post.mood && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {MOODS.find(m => m.label === post.mood)?.emoji} {post.mood}
                                                    </Badge>
                                                )}
                                                {post.dayCount && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        <Flame size={10} className="mr-1" /> Day {post.dayCount}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="text-sm leading-relaxed text-muted-foreground mb-4 [&_strong]:font-bold [&_strong]:text-foreground">
                                            {renderMarkdown(post.content)}
                                        </div>

                                        {/* Images */}
                                        {post.images && post.images.length > 0 && (
                                            <div className={cn("grid gap-2 mb-4 rounded-lg overflow-hidden", post.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                                                {post.images.slice(0, 4).map((img: string, i: number) => (
                                                    <div key={i} className="relative" style={{ paddingTop: post.images.length === 1 ? "56.25%" : "100%" }}>
                                                        <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover cursor-pointer" onClick={() => window.open(img, "_blank")} />
                                                        {i === 3 && post.images.length > 4 && (
                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xl font-semibold">
                                                                +{post.images.length - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Reactions */}
                                        <div className="flex items-center gap-4 pt-3 border-t border-border">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Heart size={12} /> {post.totalReactions || 0}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <MessageCircle size={12} /> {post.comments?.length || 0} comments
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
