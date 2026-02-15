"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import {
    getProfile,
    getUserStats,
    getUserGroups,
    getActivityFeed,
    type UserStats,
    type UserGroup,
    type ActivityItem,
    type ProfileData,
} from "@/app/actions/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Flame,
    FileText,
    Users,
    Zap,
    Search,
    Plus,
    FolderOpen,
    ArrowRight,
    Loader2,
} from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        setMounted(true);
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                const metadata = user.user_metadata || {};
                if (!metadata.profile_complete) {
                    router.push("/setup");
                    return;
                }
                if (!metadata.tutorial_complete) {
                    router.push("/tutorial");
                    return;
                }
            }

            const [profileData, statsData, groupsData, activityData] =
                await Promise.all([
                    getProfile(),
                    getUserStats(),
                    getUserGroups(),
                    getActivityFeed(5),
                ]);

            if (!profileData) {
                router.push("/login");
                return;
            }

            setProfile(profileData);
            setStats(statsData);
            setGroups(groupsData);
            setActivity(activityData);
        } catch (err) {
            console.error("Error loading dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const displayName =
        profile?.display_name || profile?.username || "there";

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                {/* Header */}
                <div className="mb-8">
                    <p className="text-sm text-muted-foreground mb-1">Welcome back,</p>
                    <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                    {stats && stats.currentStreak > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                            You're on a{" "}
                            <span className="text-primary font-semibold">
                                {stats.currentStreak}-day streak
                            </span>
                            . Keep it up.
                        </p>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {[
                        {
                            label: "Streak",
                            value: stats?.currentStreak || 0,
                            icon: Flame,
                            suffix: "d",
                        },
                        {
                            label: "Posts",
                            value: stats?.totalPosts || 0,
                            icon: FileText,
                        },
                        {
                            label: "Groups",
                            value: stats?.groupsJoined || 0,
                            icon: Users,
                        },
                        {
                            label: "Level",
                            value: stats?.level || 1,
                            icon: Zap,
                        },
                    ].map((stat) => (
                        <Card key={stat.label}>
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                                    <stat.icon size={16} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold leading-none">
                                        {stat.value}
                                        {stat.suffix && (
                                            <span className="text-xs text-muted-foreground ml-0.5">
                                                {stat.suffix}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {stat.label}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <Button className="h-auto py-4 flex-col gap-1" asChild>
                        <Link href="/groups">
                            <Search size={18} />
                            <span className="text-xs font-medium">Explore</span>
                        </Link>
                    </Button>
                    <Button variant="secondary" className="h-auto py-4 flex-col gap-1" asChild>
                        <Link href="/groups/create">
                            <Plus size={18} />
                            <span className="text-xs font-medium">Create</span>
                        </Link>
                    </Button>
                    <Button variant="secondary" className="h-auto py-4 flex-col gap-1" asChild>
                        <Link href="/my-groups">
                            <FolderOpen size={18} />
                            <span className="text-xs font-medium">My Groups</span>
                        </Link>
                    </Button>
                </div>

                {/* Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Your Groups */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Your Groups</CardTitle>
                                <Link
                                    href="/my-groups"
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                >
                                    See all <ArrowRight size={12} />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {groups.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="mx-auto h-8 w-8 mb-3 opacity-50" />
                                    <p className="text-sm mb-3">No groups yet</p>
                                    <Button size="sm" asChild>
                                        <Link href="/groups">Explore Groups</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {groups.slice(0, 3).map((group) => (
                                        <Link
                                            key={group.id}
                                            href={`/groups/${group.id}`}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-lg">
                                                {group.emoji}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {group.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {group.memberCount} members
                                                </p>
                                            </div>
                                            {group.yourStreak > 0 && (
                                                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                                                    🔥 {group.yourStreak}d
                                                </Badge>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Activity Feed */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {activity.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="mx-auto h-8 w-8 mb-3 opacity-50" />
                                    <p className="text-sm">No recent activity</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activity.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                                        >
                                            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-sm shrink-0">
                                                {item.emoji}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm">
                                                    <span className="font-medium">{item.user}</span>{" "}
                                                    <span className="text-muted-foreground">
                                                        {item.content}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {item.group} · {item.time}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
