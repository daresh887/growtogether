"use client";

import { getGroups } from "@/app/actions/groups";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const CATEGORIES = [
    { id: "all", label: "All", emoji: "🌟" },
    { id: "fitness", label: "Fitness", emoji: "💪" },
    { id: "learning", label: "Learning", emoji: "📚" },
    { id: "coding", label: "Coding", emoji: "💻" },
    { id: "art", label: "Art", emoji: "🎨" },
    { id: "writing", label: "Writing", emoji: "✍️" },
    { id: "music", label: "Music", emoji: "🎵" },
    { id: "business", label: "Business", emoji: "💼" },
    { id: "wellness", label: "Wellness", emoji: "🧘" },
];

import { colors } from "@/utils/design-tokens";

export default function GroupsPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"most-active" | "newest" | "members" | "alphabetical">("most-active");
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    useEffect(() => {
        async function fetchGroups() {
            setLoading(true);
            try {
                const data = await getGroups({
                    category: selectedCategory,
                    search: searchQuery,
                    sort: sortBy
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

    const hasActiveFilters = selectedCategory !== "all" || searchQuery.trim() !== "";

    const clearFilters = () => {
        setSelectedCategory("all");
        setSearchQuery("");
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: colors.bg,
            color: colors.textPrimary,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Gradient backgrounds */}
            <div style={{
                position: "absolute",
                top: "-200px",
                right: "-200px",
                width: "600px",
                height: "600px",
                background: `radial-gradient(circle, rgba(108, 92, 231, 0.12) 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />
            <div style={{
                position: "absolute",
                bottom: "-150px",
                left: "-150px",
                width: "500px",
                height: "500px",
                background: `radial-gradient(circle, rgba(0, 217, 165, 0.08) 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />

            <Navbar />

            {/* Main Content */}
            <div style={{
                maxWidth: "1200px",
                margin: "0 auto",
                padding: "32px 24px 120px",
                paddingLeft: "88px",
            }}>
                {/* Header */}
                <div style={{ marginBottom: "32px" }}>
                    <h1 style={{
                        fontSize: "36px",
                        fontWeight: 800,
                        marginBottom: "8px",
                        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}>
                        Explore Groups
                    </h1>
                    <p style={{ color: colors.textSecondary, fontSize: "16px" }}>
                        Find your accountability tribe
                    </p>
                </div>

                {/* Search & Filters */}
                <div style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "20px",
                    padding: "24px",
                    marginBottom: "24px",
                }}>
                    {/* Search Bar */}
                    <div style={{ marginBottom: "20px", position: "relative" }}>
                        <div style={{
                            position: "absolute",
                            left: "16px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "18px",
                            color: colors.textMuted,
                        }}>
                            🔍
                        </div>
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "14px 16px 14px 48px",
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "14px",
                                color: colors.textPrimary,
                                fontSize: "15px",
                                outline: "none",
                                transition: "border-color 0.2s",
                            }}
                        />
                    </div>

                    {/* Category Pills */}
                    <div style={{
                        display: "flex",
                        gap: "10px",
                        overflowX: "auto",
                        paddingBottom: "8px",
                        marginBottom: "16px",
                    }}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    padding: "10px 18px",
                                    borderRadius: "14px",
                                    border: `2px solid ${selectedCategory === cat.id ? colors.primary : colors.border}`,
                                    background: selectedCategory === cat.id
                                        ? `linear-gradient(135deg, ${colors.primary}20, ${colors.primaryLight}10)`
                                        : colors.bg,
                                    color: selectedCategory === cat.id ? colors.primaryLight : colors.textSecondary,
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    transition: "all 0.2s",
                                }}
                            >
                                <span style={{ fontSize: "16px" }}>{cat.emoji}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Sort Options */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ fontSize: "13px", color: colors.textMuted }}>Sort:</span>
                            {(["most-active", "newest", "members", "alphabetical"] as const).map(option => (
                                <button
                                    key={option}
                                    onClick={() => setSortBy(option)}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: sortBy === option ? colors.primary : "transparent",
                                        color: sortBy === option ? "#fff" : colors.textMuted,
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                    }}
                                >
                                    {option === "most-active" && <><span style={{ fontSize: "14px" }}>🔥</span> Most Active</>}
                                    {option === "newest" && "Newest"}
                                    {option === "members" && "Most Members"}
                                    {option === "alphabetical" && "A-Z"}
                                </button>
                            ))}
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: "10px",
                                    border: `1px solid ${colors.accent}50`,
                                    background: `${colors.accent}10`,
                                    color: colors.accent,
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                ✕ Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Results count */}
                <div style={{ marginBottom: "20px", fontSize: "14px", color: colors.textMuted }}>
                    {loading ? "Loading..." : `${groups.length} group${groups.length !== 1 ? "s" : ""} found`}
                </div>

                {/* Groups Grid */}
                {loading ? (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "20px",
                    }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div
                                key={i}
                                style={{
                                    padding: "28px",
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "20px",
                                    height: "200px",
                                    animation: "pulse 1.5s infinite",
                                }}
                            />
                        ))}
                    </div>
                ) : groups.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "80px 24px",
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "20px",
                    }}>
                        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔍</div>
                        <p style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No groups found</p>
                        <p style={{ fontSize: "14px", color: colors.textMuted, marginBottom: "24px" }}>
                            Try adjusting your filters or create a new group
                        </p>
                        <Link
                            href="/groups/create"
                            style={{
                                display: "inline-block",
                                padding: "12px 28px",
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                                color: "#fff",
                                borderRadius: "12px",
                                textDecoration: "none",
                                fontWeight: 700,
                                fontSize: "14px",
                            }}
                        >
                            Create a Group
                        </Link>
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "20px",
                    }}>
                        {groups.map(group => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                onMouseEnter={() => setHoveredCard(group.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                style={{
                                    display: "block",
                                    padding: "28px",
                                    background: hoveredCard === group.id ? colors.surfaceHover : colors.surface,
                                    border: `1px solid ${hoveredCard === group.id ? colors.primary : colors.border}`,
                                    borderRadius: "20px",
                                    textDecoration: "none",
                                    color: colors.textPrimary,
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    transform: hoveredCard === group.id ? "translateY(-4px)" : "translateY(0)",
                                    boxShadow: hoveredCard === group.id
                                        ? `0 12px 40px ${colors.primary}25`
                                        : "none",
                                    position: "relative",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Hover glow */}
                                {hoveredCard === group.id && (
                                    <div style={{
                                        position: "absolute",
                                        top: "0",
                                        right: "0",
                                        width: "150px",
                                        height: "150px",
                                        background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
                                        pointerEvents: "none",
                                    }} />
                                )}

                                <div style={{ position: "relative", zIndex: 1 }}>
                                    <div style={{
                                        width: "56px",
                                        height: "56px",
                                        borderRadius: "16px",
                                        background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primaryLight}20)`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "32px",
                                        marginBottom: "16px",
                                        overflow: "hidden"
                                    }}>
                                        {(group.settings?.iconUrl || group.theme?.iconUrl) ? (
                                            <img
                                                src={group.settings?.iconUrl || group.theme?.iconUrl}
                                                alt={group.name}
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                        ) : (
                                            group.emoji
                                        )}
                                    </div>

                                    <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
                                        {group.name}
                                    </h3>
                                    <p style={{
                                        fontSize: "14px",
                                        color: colors.textSecondary,
                                        marginBottom: "20px",
                                        lineHeight: 1.5,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                    }}>
                                        {group.description}
                                    </p>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{
                                            fontSize: "12px",
                                            padding: "6px 12px",
                                            background: `${colors.primary}15`,
                                            color: colors.primaryLight,
                                            borderRadius: "10px",
                                            fontWeight: 600,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}>
                                            {CATEGORIES.find(c => c.id === group.category)?.emoji} {group.category}
                                        </span>
                                        <span style={{ fontSize: "13px", color: colors.textMuted, display: "flex", alignItems: "center", gap: "6px" }}>
                                            👥 {group.memberCount}
                                        </span>
                                    </div>
                                    {group.recentPostCount > 0 && (
                                        <div style={{
                                            marginTop: "12px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "6px 12px",
                                            background: `linear-gradient(135deg, ${colors.accent}12, ${colors.accent}06)`,
                                            border: `1px solid ${colors.accent}25`,
                                            borderRadius: "10px",
                                            width: "fit-content",
                                        }}>
                                            <span style={{ fontSize: "12px" }}>🔥</span>
                                            <span style={{ fontSize: "12px", fontWeight: 600, color: colors.accent }}>
                                                {group.recentPostCount} post{group.recentPostCount !== 1 ? "s" : ""} in last 3 days
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Create Button */}
            <Link
                href="/groups/create"
                style={{
                    position: "fixed",
                    bottom: "100px",
                    right: "32px",
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    border: "none",
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                    color: "#fff",
                    fontSize: "28px",
                    boxShadow: `0 8px 32px ${colors.primary}50`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    zIndex: 100,
                }}
            >
                +
            </Link>

            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @media (max-width: 1023px) {
                    .groups-content { padding-left: 24px !important; }
                }
            `}</style>
        </div >
    );
}
