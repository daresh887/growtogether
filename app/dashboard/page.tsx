"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { getProfile, getUserStats, getUserGroups, getActivityFeed, type UserStats, type UserGroup, type ActivityItem, type ProfileData } from "@/app/actions/profile";

import { colors } from "@/utils/design-tokens";

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
            // Check profile and tutorial completion
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
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

            const [profileData, statsData, groupsData, activityData] = await Promise.all([
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
                    <span style={{ color: colors.textMuted }}>Loading dashboard...</span>
                </div>
            </div>
        );
    }

    const displayName = profile?.display_name || profile?.username || "there";

    return (
        <div style={{
            minHeight: "100vh",
            background: colors.bg,
            color: colors.text,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Gradient mesh background */}
            <div style={{
                position: "absolute",
                top: "-200px",
                right: "-200px",
                width: "600px",
                height: "600px",
                background: `radial-gradient(circle, rgba(108, 92, 231, 0.15) 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />
            <div style={{
                position: "absolute",
                bottom: "-100px",
                left: "-100px",
                width: "400px",
                height: "400px",
                background: `radial-gradient(circle, rgba(0, 217, 165, 0.1) 0%, transparent 70%)`,
                pointerEvents: "none",
            }} />

            <Navbar />

            {/* Main Content */}
            <div style={{
                maxWidth: "1200px",
                margin: "0 auto",
                padding: "32px 24px 120px",
                paddingLeft: "88px", // Account for desktop navbar
            }}>
                {/* Welcome Hero */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "24px",
                    marginBottom: "32px",
                }}>
                    <div style={{
                        background: `linear-gradient(135deg, ${colors.surface} 0%, rgba(108, 92, 231, 0.1) 100%)`,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "24px",
                        padding: "32px",
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        <div style={{
                            position: "absolute",
                            top: "20px",
                            right: "20px",
                            fontSize: "80px",
                            opacity: 0.1,
                        }}>
                            👋
                        </div>
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <p style={{ color: colors.textMuted, fontSize: "14px", marginBottom: "4px" }}>
                                Welcome back,
                            </p>
                            <h1 style={{
                                fontSize: "36px",
                                fontWeight: 800,
                                marginBottom: "8px",
                                background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight})`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}>
                                {displayName}! 🌟
                            </h1>
                            <p style={{ color: colors.textSecondary, fontSize: "16px" }}>
                                {stats && stats.currentStreak > 0 ? (
                                    <>You're on a <span style={{ color: colors.accent, fontWeight: 700 }}>{stats.currentStreak}-day streak</span>. Keep it up!</>
                                ) : (
                                    <>Start your accountability journey today!</>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Streak Card */}
                    <div style={{
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "24px",
                        padding: "24px 32px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "160px",
                    }}>
                        <div style={{
                            fontSize: "48px",
                            marginBottom: "4px",
                            animation: "pulse 2s infinite",
                        }}>
                            🔥
                        </div>
                        <div style={{
                            fontSize: "32px",
                            fontWeight: 800,
                            color: colors.accent,
                        }}>
                            {stats?.currentStreak || 0}
                        </div>
                        <div style={{ fontSize: "13px", color: colors.textMuted }}>
                            day streak
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                    marginBottom: "32px",
                }}>
                    {[
                        { label: "Total Posts", value: stats?.totalPosts || 0, icon: "📝", color: colors.primary },
                        { label: "Groups Joined", value: stats?.groupsJoined || 0, icon: "👥", color: colors.accent },
                        { label: "Level", value: stats?.level || 1, icon: "⚡", color: "#FFD93D" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            style={{
                                background: colors.surface,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "16px",
                                padding: "20px",
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                            }}
                        >
                            <div style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "12px",
                                background: `${stat.color}15`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "24px",
                            }}>
                                {stat.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: "24px", fontWeight: 700 }}>{stat.value}</div>
                                <div style={{ fontSize: "13px", color: colors.textMuted }}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Cards - Bento Style */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                    marginBottom: "32px",
                }}>
                    <Link
                        href="/groups"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                            borderRadius: "20px",
                            padding: "28px",
                            textDecoration: "none",
                            color: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            transition: "transform 0.3s, box-shadow 0.3s",
                            boxShadow: "0 8px 32px rgba(108, 92, 231, 0.3)",
                        }}
                    >
                        <div style={{ fontSize: "36px" }}>🔍</div>
                        <div>
                            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>Explore Groups</div>
                            <div style={{ fontSize: "13px", opacity: 0.9 }}>Find your tribe</div>
                        </div>
                        <div style={{ fontSize: "20px", marginTop: "auto" }}>→</div>
                    </Link>

                    <Link
                        href="/groups/create"
                        style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "20px",
                            padding: "28px",
                            textDecoration: "none",
                            color: colors.textPrimary,
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            transition: "transform 0.3s, background 0.3s",
                        }}
                    >
                        <div style={{ fontSize: "36px" }}>✨</div>
                        <div>
                            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>Create Group</div>
                            <div style={{ fontSize: "13px", color: colors.textSecondary }}>Start something new</div>
                        </div>
                        <div style={{ fontSize: "20px", marginTop: "auto", color: colors.textMuted }}>→</div>
                    </Link>

                    <Link
                        href="/my-groups"
                        style={{
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "20px",
                            padding: "28px",
                            textDecoration: "none",
                            color: colors.textPrimary,
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            transition: "transform 0.3s, background 0.3s",
                        }}
                    >
                        <div style={{ fontSize: "36px" }}>📋</div>
                        <div>
                            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>My Groups</div>
                            <div style={{ fontSize: "13px", color: colors.textSecondary }}>View your groups</div>
                        </div>
                        <div style={{ fontSize: "20px", marginTop: "auto", color: colors.textMuted }}>→</div>
                    </Link>
                </div>

                {/* Two Column Layout */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                }}>
                    {/* Your Groups */}
                    <div style={{
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "20px",
                        padding: "24px",
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "20px",
                        }}>
                            <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Your Groups</h2>
                            <Link href="/my-groups" style={{ color: colors.primary, fontSize: "14px", textDecoration: "none" }}>
                                See all →
                            </Link>
                        </div>

                        {groups.length === 0 ? (
                            <div style={{
                                textAlign: "center",
                                padding: "32px 16px",
                                color: colors.textMuted,
                            }}>
                                <div style={{ fontSize: "36px", marginBottom: "12px" }}>👥</div>
                                <p style={{ marginBottom: "16px" }}>You haven't joined any groups yet</p>
                                <Link
                                    href="/groups"
                                    style={{
                                        padding: "10px 20px",
                                        borderRadius: "10px",
                                        background: colors.primary,
                                        color: "#fff",
                                        textDecoration: "none",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                    }}
                                >
                                    Explore Groups
                                </Link>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {groups.slice(0, 3).map((group) => (
                                    <Link
                                        key={group.id}
                                        href={`/groups/${group.id}`}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "14px",
                                            padding: "14px",
                                            background: colors.bg,
                                            borderRadius: "14px",
                                            textDecoration: "none",
                                            color: colors.textPrimary,
                                            transition: "background 0.2s",
                                        }}
                                    >
                                        <div style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: "12px",
                                            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primaryLight}20)`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "24px",
                                        }}>
                                            {group.emoji}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, marginBottom: "2px" }}>{group.name}</div>
                                            <div style={{ fontSize: "12px", color: colors.textMuted }}>
                                                {group.memberCount} members • {group.lastActive}
                                            </div>
                                        </div>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "6px 10px",
                                            background: `${colors.accent}20`,
                                            borderRadius: "20px",
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            color: colors.accent,
                                        }}>
                                            🔥 {group.yourStreak}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Activity Feed */}
                    <div style={{
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "20px",
                        padding: "24px",
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "20px",
                        }}>
                            <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Activity</h2>
                            <div style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: colors.accent,
                                animation: "pulse 2s infinite",
                            }} />
                        </div>

                        {activity.length === 0 ? (
                            <div style={{
                                textAlign: "center",
                                padding: "32px 16px",
                                color: colors.textMuted,
                            }}>
                                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
                                <p>No recent activity in your groups</p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {activity.map((item) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "12px",
                                            padding: "12px",
                                            background: colors.bg,
                                            borderRadius: "12px",
                                        }}
                                    >
                                        <div style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "10px",
                                            background: `${colors.primary}20`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "18px",
                                            flexShrink: 0,
                                        }}>
                                            {item.emoji}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "14px", marginBottom: "2px" }}>
                                                <span style={{ fontWeight: 600 }}>{item.user}</span>
                                                {" "}
                                                <span style={{ color: colors.textSecondary }}>{item.content}</span>
                                            </div>
                                            <div style={{ fontSize: "12px", color: colors.textMuted }}>
                                                {item.group} • {item.time}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Quick Post Button */}
            <button
                onClick={() => router.push("/groups")}
                style={{
                    position: "fixed",
                    bottom: "100px",
                    right: "32px",
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    border: "none",
                    background: `linear-gradient(135deg, ${colors.accent}, #00B894)`,
                    color: "#fff",
                    fontSize: "24px",
                    boxShadow: "0 8px 24px rgba(0, 217, 165, 0.4)",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 100,
                }}
            >
                ✏️
            </button>

            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.05); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 1023px) {
                    .dashboard-content {
                        padding-left: 24px !important;
                    }
                }
            `}</style>
        </div>
    );
}
