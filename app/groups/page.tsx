"use client";

import { getGroups } from "@/app/actions/groups";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Users,
    Plus,
    X,
    Loader2,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { id: "all", label: "All" },
    { id: "fitness", label: "Fitness" },
    { id: "studying", label: "Studying" },
    { id: "coding", label: "Coding" },
    { id: "hustling", label: "Hustling" },
    { id: "art", label: "Art" },
    { id: "writing", label: "Writing" },
    { id: "music", label: "Music" },
    { id: "self-improvement", label: "Self Improvement" },
];

const SORT_OPTIONS = [
    { value: "most-active" as const, label: "Most Active" },
    { value: "newest" as const, label: "Newest" },
    { value: "members" as const, label: "Most Members" },
    { value: "alphabetical" as const, label: "A–Z" },
];

export default function GroupsPage() {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] =
        useState<"most-active" | "newest" | "members" | "alphabetical">("most-active");
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchGroups() {
            setLoading(true);
            try {
                const data = await getGroups({
                    category: selectedCategory,
                    search: searchQuery,
                    sort: sortBy,
                });
                setGroups(data);
            } catch (error) {
                console.error("Failed to fetch groups:", error);
            } finally {
                setLoading(false);
            }
        }

        const timeoutId = setTimeout(() => {
            fetchGroups();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [selectedCategory, searchQuery, sortBy]);

    const hasActiveFilters =
        selectedCategory !== "all" || searchQuery.trim() !== "";

    const clearFilters = () => {
        setSelectedCategory("all");
        setSearchQuery("");
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Explore Groups
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Find your accountability group
                        </p>
                    </div>
                    <Button size="sm" asChild>
                        <Link href="/groups/create">
                            <Plus size={16} className="mr-1" />
                            Create
                        </Link>
                    </Button>
                </div>

                {/* Search & Filters */}
                <Card className="mb-6">
                    <CardContent className="p-4 space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                placeholder="Search groups..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Categories */}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                                        selectedCategory === cat.id
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Sort + Clear */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground mr-1">
                                    Sort:
                                </span>
                                {SORT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSortBy(opt.value)}
                                        className={cn(
                                            "px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                                            sortBy === opt.value
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                                >
                                    <X size={12} />
                                    Clear
                                </button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Count */}
                <p className="text-xs text-muted-foreground mb-4">
                    {loading
                        ? "Loading..."
                        : `${groups.length} group${groups.length !== 1 ? "s" : ""} found`}
                </p>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : groups.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <Search className="mx-auto h-8 w-8 mb-3 text-muted-foreground opacity-50" />
                            <p className="font-medium mb-1">No groups found</p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Try adjusting your filters or create a new group
                            </p>
                            <Button size="sm" asChild>
                                <Link href="/groups/create">Create a Group</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                        {groups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                className="block"
                            >
                                <Card className="h-full hover:bg-card/80 transition-colors">
                                    <CardContent className="p-5">
                                        {/* Icon + Title */}
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0 overflow-hidden">
                                                {group.settings?.iconUrl ||
                                                    group.theme?.iconUrl ? (
                                                    <img
                                                        src={
                                                            group.settings?.iconUrl ||
                                                            group.theme?.iconUrl
                                                        }
                                                        alt={group.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    group.emoji
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm leading-tight truncate">
                                                    {group.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    <Users
                                                        size={11}
                                                        className="inline mr-1 -mt-px"
                                                    />
                                                    {group.memberCount} members
                                                </p>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                            {group.description}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {group.category}
                                            </Badge>
                                            {group.recentPostCount > 0 && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <TrendingUp size={11} className="text-primary" />
                                                    {group.recentPostCount} recent
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
