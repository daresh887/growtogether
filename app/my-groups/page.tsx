"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getUserGroups, type UserGroup } from "@/app/actions/profile";

import { colors } from "@/utils/design-tokens";

export default function MyGroupsPage() {
    const router = useRouter();
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
            <div style={{
                minHeight: "100vh",
                background: colors.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.text,
            }}>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "16px"
                }}>
                    <div style={{
                        width: "48px",
                        height: "48px",
                        border: `3px solid ${colors.border}`,
                        borderTopColor: colors.primary,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                    }} />
                    <span style={{ color: colors.textMuted }}>Loading groups...</span>
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
                maxWidth: "1000px",
                margin: "0 auto",
                padding: "32px 24px 120px",
                paddingLeft: "88px",
            }}>
                {/* Header */}
                <div style={{
                    marginBottom: "32px",
                }}>
                    <h1 style={{
                        fontSize: "36px",
                        fontWeight: 800,
                        marginBottom: "8px",
                        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}>
                        My Groups
                    </h1>
                    <p style={{ color: colors.textSecondary, fontSize: "16px" }}>
                        Your accountability communities
                    </p>
                </div>

                {/* Stats Overview */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "16px",
                    marginBottom: "32px",
                }}>
                    {[
                        { label: "Groups Joined", value: groups.length, icon: "👥", color: colors.primary },
                        { label: "Total Streak Days", value: totalStreak, icon: "🔥", color: colors.accent },
                        { label: "Avg. Streak", value: avgStreak, icon: "⚡", color: "#FFD93D" },
                        { label: "Owner Of", value: groups.filter(g => g.isOwner).length, icon: "👑", color: "#FFD93D" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            style={{
                                background: colors.surface,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "16px",
                                padding: "20px",
                                textAlign: "center",
                            }}
                        >
                            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.icon}</div>
                            <div style={{ fontSize: "28px", fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: "12px", color: colors.textMuted }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs */}
                <div style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "24px",
                }}>
                    {[
                        { id: "all", label: "All Groups" },
                        { id: "active", label: "🟢 Active Today" },
                        { id: "admin", label: "👑 Admin" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as any)}
                            style={{
                                padding: "10px 20px",
                                borderRadius: "12px",
                                border: `1px solid ${filter === tab.id ? colors.primary : colors.border}`,
                                background: filter === tab.id
                                    ? `linear-gradient(135deg, ${colors.primary}20, ${colors.primaryLight}10)`
                                    : colors.surface,
                                color: filter === tab.id ? colors.primaryLight : colors.textSecondary,
                                fontSize: "14px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Groups Grid */}
                {groups.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "64px 24px",
                        background: colors.surface,
                        borderRadius: "20px",
                        border: `1px solid ${colors.border}`,
                    }}>
                        <div style={{ fontSize: "64px", marginBottom: "20px" }}>👥</div>
                        <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
                            No Groups Yet
                        </h3>
                        <p style={{ color: colors.textSecondary, marginBottom: "24px" }}>
                            Join your first accountability group to get started
                        </p>
                        <Link
                            href="/groups"
                            style={{
                                display: "inline-flex",
                                padding: "14px 28px",
                                borderRadius: "12px",
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                                color: "#fff",
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: "15px",
                            }}
                        >
                            Explore Groups →
                        </Link>
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "20px",
                    }}>
                        {filteredGroups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                style={{
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: "20px",
                                    padding: "24px",
                                    textDecoration: "none",
                                    color: colors.text,
                                    display: "block",
                                    position: "relative",
                                    overflow: "hidden",
                                    transition: "all 0.3s",
                                }}
                            >
                                {/* Activity indicator */}
                                {group.isActive && (
                                    <div style={{
                                        position: "absolute",
                                        top: "16px",
                                        right: "16px",
                                        width: "10px",
                                        height: "10px",
                                        borderRadius: "50%",
                                        background: colors.accent,
                                        boxShadow: `0 0 10px ${colors.accent}`,
                                        animation: "pulse 2s infinite",
                                    }} />
                                )}

                                {/* Decorative gradient */}
                                <div style={{
                                    position: "absolute",
                                    top: "0",
                                    right: "0",
                                    width: "150px",
                                    height: "150px",
                                    background: `radial-gradient(circle, ${colors.primary}10 0%, transparent 70%)`,
                                    pointerEvents: "none",
                                }} />

                                <div style={{ position: "relative", zIndex: 1 }}>
                                    {/* Header */}
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                                        <div style={{
                                            width: "60px",
                                            height: "60px",
                                            borderRadius: "16px",
                                            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primaryLight}20)`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "32px",
                                            overflow: "hidden"
                                        }}>
                                            {group.iconUrl ? (
                                                <img
                                                    src={group.iconUrl}
                                                    alt={group.name}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                />
                                            ) : (
                                                group.emoji
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{group.name}</h3>
                                                {group.isOwner && (
                                                    <span style={{
                                                        padding: "3px 8px",
                                                        background: "#FFD93D30",
                                                        color: "#FFD93D",
                                                        borderRadius: "8px",
                                                        fontSize: "10px",
                                                        fontWeight: 700,
                                                    }}>
                                                        👑 OWNER
                                                    </span>
                                                )}
                                                {!group.isOwner && group.role === "moderator" && (
                                                    <span style={{
                                                        padding: "3px 8px",
                                                        background: `${colors.primary}30`,
                                                        color: colors.primaryLight,
                                                        borderRadius: "8px",
                                                        fontSize: "10px",
                                                        fontWeight: 700,
                                                    }}>
                                                        🛡️ MOD
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{
                                                fontSize: "13px", color: colors.textSecondary, lineHeight: 1.4,
                                                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
                                                overflow: "hidden", margin: 0,
                                            }}>
                                                {group.description || "An accountability group"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats row */}
                                    <div style={{
                                        display: "flex",
                                        gap: "16px",
                                        paddingTop: "16px",
                                        borderTop: `1px solid ${colors.border}`,
                                    }}>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "8px 14px",
                                            background: `${colors.accent}15`,
                                            borderRadius: "10px",
                                        }}>
                                            <span style={{ fontSize: "16px" }}>🔥</span>
                                            <span style={{ fontWeight: 700, color: colors.accent }}>{group.yourStreak}</span>
                                            <span style={{ fontSize: "12px", color: colors.textMuted }}>streak</span>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span style={{ fontSize: "14px" }}>👥</span>
                                            <span style={{ fontSize: "13px", color: colors.textMuted }}>{group.memberCount}</span>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span style={{ fontSize: "14px" }}>📝</span>
                                            <span style={{ fontSize: "13px", color: colors.textMuted }}>{group.postsToday} today</span>
                                        </div>

                                        <div style={{ marginLeft: "auto", fontSize: "12px", color: colors.textMuted }}>
                                            {group.lastActive}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Empty state for filters */}
                {groups.length > 0 && filteredGroups.length === 0 && (
                    <div style={{
                        textAlign: "center",
                        padding: "64px 24px",
                        background: colors.surface,
                        borderRadius: "20px",
                        border: `1px solid ${colors.border}`,
                    }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
                        <p style={{ color: colors.textSecondary, marginBottom: "16px" }}>No groups match this filter</p>
                        <button
                            onClick={() => setFilter("all")}
                            style={{
                                padding: "10px 20px",
                                borderRadius: "10px",
                                border: "none",
                                background: colors.primary,
                                color: "#fff",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            View All Groups
                        </button>
                    </div>
                )}

                {/* Join More CTA */}
                <Link
                    href="/groups"
                    style={{
                        display: "block",
                        marginTop: "32px",
                        padding: "32px",
                        background: `linear-gradient(135deg, ${colors.surface} 0%, rgba(108, 92, 231, 0.1) 100%)`,
                        border: `1px dashed ${colors.primary}50`,
                        borderRadius: "20px",
                        textDecoration: "none",
                        textAlign: "center",
                        transition: "all 0.3s",
                    }}
                >
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>✨</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: colors.textPrimary, marginBottom: "4px" }}>
                        Find More Groups
                    </div>
                    <div style={{ fontSize: "14px", color: colors.textSecondary }}>
                        Discover new accountability communities
                    </div>
                </Link>
            </div>

            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 768px) {
                    .my-groups-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
