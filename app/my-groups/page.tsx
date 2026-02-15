"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getUserGroups, type UserGroup } from "@/app/actions/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, Users, FileText, Crown, Shield, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyGroupsPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [filter, setFilter] = useState<"all" | "active" | "admin">("all");

    useEffect(() => {
        setMounted(true);
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const data = await getUserGroups();
            setGroups(data);
        } catch (err) {
            console.error("Error loading groups:", err);
        } finally {
            setLoading(false);
        }
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

    const filteredGroups = groups.filter(group => {
        if (filter === "active") return group.isActive;
        if (filter === "admin") return group.isOwner;
        return true;
    });

    const totalStreak = groups.reduce((sum, g) => sum + g.yourStreak, 0);
    const avgStreak = groups.length > 0 ? Math.round(totalStreak / groups.length) : 0;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">My Groups</h1>
                    <p className="text-muted-foreground mt-1">Your accountability communities</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {[
                        { label: "Groups Joined", value: groups.length, icon: Users },
                        { label: "Total Streak", value: totalStreak, icon: Flame },
                        { label: "Avg. Streak", value: avgStreak, icon: Flame },
                        { label: "Owner Of", value: groups.filter(g => g.isOwner).length, icon: Crown },
                    ].map((stat) => (
                        <Card key={stat.label}>
                            <CardContent className="p-4 text-center">
                                <stat.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <div className="text-xs text-muted-foreground">{stat.label}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 mb-6 bg-card rounded-lg p-1 border border-border">
                    {[
                        { id: "all" as const, label: "All Groups" },
                        { id: "active" as const, label: "Active Today" },
                        { id: "admin" as const, label: "Admin" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={cn(
                                "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer",
                                filter === tab.id
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Groups */}
                {groups.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <Users className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Join your first accountability group to get started
                            </p>
                            <Button asChild>
                                <Link href="/groups">Explore Groups</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {filteredGroups.map((group) => (
                            <Link key={group.id} href={`/groups/${group.id}`} className="block group/card">
                                <Card className="h-full transition-colors hover:border-muted-foreground/50">
                                    <CardContent className="p-5">
                                        {/* Header */}
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-xl overflow-hidden shrink-0">
                                                {group.iconUrl ? (
                                                    <img src={group.iconUrl} alt={group.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    group.emoji
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold truncate">{group.name}</h3>
                                                    {group.isOwner && (
                                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0">
                                                            <Crown size={9} className="mr-0.5" /> Owner
                                                        </Badge>
                                                    )}
                                                    {!group.isOwner && group.role === "moderator" && (
                                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0">
                                                            <Shield size={9} className="mr-0.5" /> Mod
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {group.description || "An accountability group"}
                                                </p>
                                            </div>
                                            {group.isActive && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 mt-1" />
                                            )}
                                        </div>

                                        {/* Stats row */}
                                        <div className="flex items-center gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium text-foreground">
                                                <Flame size={12} className="text-orange-500" /> {group.yourStreak}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users size={12} /> {group.memberCount}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileText size={12} /> {group.postsToday} today
                                            </span>
                                            <span className="ml-auto">{group.lastActive}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Empty filter state */}
                {groups.length > 0 && filteredGroups.length === 0 && (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <Search className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">No groups match this filter</p>
                            <Button variant="outline" onClick={() => setFilter("all")}>
                                View All Groups
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Explore More */}
                <Link href="/groups" className="block mt-8">
                    <Card className="border-dashed hover:border-muted-foreground/50 transition-colors">
                        <CardContent className="py-8 text-center">
                            <Plus className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                            <p className="font-semibold mb-1">Find More Groups</p>
                            <p className="text-sm text-muted-foreground">Discover new accountability communities</p>
                        </CardContent>
                    </Card>
                </Link>
            </main>
        </div>
    );
}
