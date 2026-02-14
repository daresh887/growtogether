"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { getProfile, getPublicProfile, getUserStats, getUserGroups, getUserAchievements, getUserPosts, type ProfileData, type UserStats, type UserGroup, type Achievement, type UserPost } from "@/app/actions/profile";

import { colors } from "@/utils/design-tokens";

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

const styles = `
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .fade-up { animation: fadeUp 0.5s ease-out forwards; }
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    .card { background: #141416; border: 1px solid #2A2A2E; border-radius: 16px; transition: border-color 0.2s, transform 0.2s; }
    .card:hover { border-color: #A29BFE; }
    .card-lift:hover { transform: translateY(-2px); }
    .post-content strong { font-weight: 700; color: #FFFFFF; }
    .post-content em { font-style: italic; }
    .post-content u { text-decoration: underline; }
`;

function renderMarkdown(text: string): React.ReactNode {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
        let parts: React.ReactNode[] = [];
        let remaining = line;

        const boldRegex = /\*\*(.+?)\*\*/g;
        const underlineRegex = /__(.+?)__/g;

        let processed = remaining
            .replace(boldRegex, '<strong>$1</strong>')
            .replace(underlineRegex, '<u>$1</u>')
            .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

        const isBullet = line.startsWith('• ');
        if (isBullet) processed = processed.substring(2);

        const element = (
            <span
                key={lineIdx}
                style={isBullet ? { display: 'flex', gap: 8 } : undefined}
                dangerouslySetInnerHTML={{
                    __html: isBullet ? `<span style="color: #6C5CE7">•</span> ${processed}` : processed
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

            // Check if viewing own profile or "me"
            const isOwn = params.id === "me" || !!(user && params.id === user.id);
            setIsOwnProfile(isOwn);

            if (isOwn && user) {
                // Load all profile data
                const [profileData, statsData, groupsData, achievementsData, postsData] = await Promise.all([
                    getProfile(),
                    getUserStats(),
                    getUserGroups(),
                    getUserAchievements(),
                    getUserPosts(10, user.id),
                ]);

                if (profileData) {
                    setProfile(profileData);
                    setStats(statsData);
                    setGroups(groupsData);
                    setAchievements(achievementsData);
                    setPosts(postsData);
                }
            } else {
                // Viewing someone else's profile - fetch from backend
                const userId = params.id as string;
                const publicProfile = await getPublicProfile(userId);

                if (publicProfile) {
                    setProfile(publicProfile);

                    // Fetch their public stats, groups, achievements and posts
                    const [statsData, groupsData, achievementsData, postsData] = await Promise.all([
                        getUserStats(userId),
                        getUserGroups(userId),
                        getUserAchievements(userId),
                        getUserPosts(10, userId),
                    ]);

                    setStats(statsData);
                    setGroups(groupsData);
                    setAchievements(achievementsData);
                    setPosts(postsData);
                }
            }
        } catch (err) {
            console.error("Error loading profile:", err);
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
                color: colors.textPrimary,
            }}>
                <div style={{
                    width: "48px",
                    height: "48px",
                    border: `3px solid ${colors.border}`,
                    borderTopColor: colors.primary,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                }} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div style={{
                minHeight: "100vh",
                background: colors.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.textPrimary,
            }}>
                Profile not found
            </div>
        );
    }

    const earnedCount = achievements.filter(a => a.earned).length;
    const progressPercent = stats ? (stats.xp / stats.xpToNext) * 100 : 0;
    const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    return (
        <div style={{
            minHeight: "100vh",
            background: colors.bg,
            color: colors.textPrimary,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Animated gradient background */}
            <div style={{
                position: "absolute",
                top: "-300px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "800px",
                height: "800px",
                background: `radial-gradient(circle, rgba(108, 92, 231, 0.2) 0%, transparent 60%)`,
                pointerEvents: "none",
                animation: "pulse-bg 8s ease-in-out infinite",
            }} />

            <Navbar />

            {/* Main Content */}
            <div style={{
                maxWidth: "900px",
                margin: "0 auto",
                padding: "32px 24px 120px",
                paddingLeft: "88px",
                position: "relative",
                zIndex: 1,
            }}>
                {/* Profile Hero */}
                <div style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "28px",
                    padding: "40px",
                    marginBottom: "24px",
                    position: "relative",
                    overflow: "hidden",
                }}>
                    {/* Decorative circles */}
                    <div style={{
                        position: "absolute",
                        top: "-50px",
                        right: "-50px",
                        width: "200px",
                        height: "200px",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "50%",
                        opacity: 0.5,
                    }} />
                    <div style={{
                        position: "absolute",
                        top: "-80px",
                        right: "-80px",
                        width: "280px",
                        height: "280px",
                        border: `1px solid ${colors.border}`,
                        borderRadius: "50%",
                        opacity: 0.3,
                    }} />

                    <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                        {/* Avatar with level ring */}
                        <div style={{ position: "relative" }}>
                            <div style={{
                                width: "120px",
                                height: "120px",
                                borderRadius: "50%",
                                background: `conic-gradient(${colors.primary} ${progressPercent}%, ${colors.border} ${progressPercent}%)`,
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <div style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "50%",
                                    background: colors.surface,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "56px",
                                    overflow: "hidden",
                                }}>
                                    {profile.avatar_url ? (
                                        <Image
                                            src={profile.avatar_url}
                                            alt={profile.display_name}
                                            width={112}
                                            height={112}
                                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                        />
                                    ) : (
                                        profile.avatar
                                    )}
                                </div>
                            </div>
                            <div style={{
                                position: "absolute",
                                bottom: "0",
                                right: "0",
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                fontWeight: 800,
                                border: `3px solid ${colors.surface}`,
                            }}>
                                {stats?.level || 1}
                            </div>
                        </div>

                        {/* Profile Info */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "4px" }}>
                                <h1 style={{
                                    fontSize: "32px",
                                    fontWeight: 800,
                                    background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight})`,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}>
                                    {profile.display_name || "User"}
                                </h1>
                                {isOwnProfile && (
                                    <Link
                                        href="/settings"
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: "8px",
                                            border: `1px solid ${colors.border}`,
                                            background: "transparent",
                                            color: colors.textSecondary,
                                            fontSize: "13px",
                                            fontWeight: 500,
                                            textDecoration: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}
                                    >
                                        ⚙️ Edit Profile
                                    </Link>
                                )}
                            </div>
                            <p style={{ color: colors.textMuted, fontSize: "15px", marginBottom: "12px" }}>
                                {profile.username && `@${profile.username}`} {profile.username && "•"} Member since {memberSince}
                            </p>
                            <p style={{ color: colors.textSecondary, fontSize: "15px", lineHeight: 1.6, marginBottom: "16px" }}>
                                {profile.bio || "Building habits, one day at a time. 🚀"}
                            </p>

                            {/* XP Bar */}
                            {stats && (
                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "12px", color: colors.textMuted }}>Level {stats.level}</span>
                                        <span style={{ fontSize: "12px", color: colors.textMuted }}>{stats.xp} / {stats.xpToNext} XP</span>
                                    </div>
                                    <div style={{
                                        height: "6px",
                                        background: colors.border,
                                        borderRadius: "3px",
                                        overflow: "hidden",
                                    }}>
                                        <div style={{
                                            width: `${progressPercent}%`,
                                            height: "100%",
                                            background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryLight})`,
                                            borderRadius: "3px",
                                            transition: "width 0.5s ease",
                                        }} />
                                    </div>
                                </div>
                            )}

                            {/* Stats Row */}
                            <div style={{ display: "flex", gap: "24px" }}>
                                <div>
                                    <div style={{ fontSize: "24px", fontWeight: 800, color: colors.accent }}>{stats?.currentStreak || 0}</div>
                                    <div style={{ fontSize: "12px", color: colors.textMuted }}>🔥 Current Streak</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "24px", fontWeight: 800 }}>{stats?.longestStreak || 0}</div>
                                    <div style={{ fontSize: "12px", color: colors.textMuted }}>⚡ Best Streak</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "24px", fontWeight: 800 }}>{stats?.totalPosts || 0}</div>
                                    <div style={{ fontSize: "12px", color: colors.textMuted }}>📝 Total Posts</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interests */}
                {profile.interests.length > 0 && (
                    <div style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginBottom: "24px",
                    }}>
                        {profile.interests.map((interest) => (
                            <div
                                key={interest}
                                style={{
                                    padding: "10px 18px",
                                    background: "rgba(108, 92, 231, 0.1)",
                                    border: `1px solid ${colors.primary}40`,
                                    borderRadius: "20px",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: colors.primaryLight,
                                    backdropFilter: "blur(10px)",
                                }}
                            >
                                {interest}
                            </div>
                        ))}
                    </div>
                )}

                {/* Goals */}
                {profile.goals && profile.goals.length > 0 && (
                    <div style={{
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "24px",
                        padding: "0",
                        marginBottom: "24px",
                        overflow: "hidden",
                        position: "relative",
                    }}>
                        {/* Gradient header */}
                        <div style={{
                            padding: "24px 28px 20px",
                            background: `linear-gradient(135deg, rgba(108, 92, 231, 0.15) 0%, rgba(0, 217, 165, 0.08) 100%)`,
                            borderBottom: `1px solid ${colors.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "12px",
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "20px",
                                    boxShadow: `0 4px 16px ${colors.primary}40`,
                                }}>
                                    🎯
                                </div>
                                <div>
                                    <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Goals</h2>
                                    <p style={{ fontSize: "12px", color: colors.textMuted, margin: 0, marginTop: "2px" }}>
                                        {profile.goals.length} active goal{profile.goals.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Goal items */}
                        <div style={{ padding: "16px 20px 20px" }}>
                            {profile.goals.map((goal, idx) => (
                                <div
                                    key={idx}
                                    className="card-lift"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "16px",
                                        padding: "16px 20px",
                                        background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(108, 92, 231, 0.04) 100%)`,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: "16px",
                                        marginBottom: idx < profile.goals.length - 1 ? "10px" : "0",
                                        transition: "all 0.25s ease",
                                        position: "relative",
                                    }}
                                >
                                    {/* Step number */}
                                    <div style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primaryLight}30)`,
                                        border: `2px solid ${colors.primary}60`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "13px",
                                        fontWeight: 800,
                                        color: colors.primaryLight,
                                        flexShrink: 0,
                                    }}>
                                        {idx + 1}
                                    </div>
                                    {/* Goal text */}
                                    <span style={{
                                        flex: 1,
                                        fontSize: "15px",
                                        color: colors.textPrimary,
                                        lineHeight: 1.5,
                                        fontWeight: 500,
                                    }}>
                                        {goal}
                                    </span>
                                    {/* Decorative arrow */}
                                    <span style={{ fontSize: "14px", color: colors.textMuted, opacity: 0.4 }}>→</span>
                                </div>
                            ))}
                        </div>

                        {/* Subtle bottom glow */}
                        <div style={{
                            position: "absolute",
                            bottom: "-30px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "60%",
                            height: "60px",
                            background: `radial-gradient(ellipse, ${colors.primary}15 0%, transparent 70%)`,
                            pointerEvents: "none",
                        }} />
                    </div>
                )}

                {/* Achievement Orbit */}
                {achievements.length > 0 && (
                    <div style={{
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "24px",
                        padding: "32px",
                        paddingTop: "32px",
                        paddingBottom: "32px",
                        marginBottom: "24px",
                        position: "relative",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: 700 }}>🏆 Achievements</h2>
                            <span style={{
                                fontSize: "13px",
                                color: colors.accent,
                                background: `${colors.accent}15`,
                                padding: "6px 14px",
                                borderRadius: "20px",
                                fontWeight: 600,
                            }}>
                                {earnedCount}/{achievements.length} unlocked
                            </span>
                        </div>

                        {/* Grid Achievement Display */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                            gap: "12px",
                        }}>
                            {achievements.map((achievement) => (
                                <div
                                    key={achievement.id}
                                    onMouseEnter={() => setHoveredAchievement(achievement.id)}
                                    onMouseLeave={() => setHoveredAchievement(null)}
                                    className="card-lift"
                                    style={{
                                        position: "relative",
                                        padding: "20px 16px",
                                        borderRadius: "16px",
                                        background: achievement.earned
                                            ? `linear-gradient(160deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 167, 38, 0.04) 100%)`
                                            : colors.bg,
                                        border: `1px solid ${achievement.earned ? `${colors.gold}40` : colors.border}`,
                                        textAlign: "center",
                                        cursor: "pointer",
                                        transition: "all 0.3s ease",
                                        opacity: achievement.earned ? 1 : 0.55,
                                        filter: achievement.earned ? "none" : "grayscale(0.8)",
                                    }}
                                >
                                    <div style={{
                                        fontSize: "32px",
                                        marginBottom: "10px",
                                        filter: achievement.earned ? "drop-shadow(0 2px 8px rgba(255,215,0,0.4))" : "none",
                                    }}>
                                        {achievement.emoji}
                                    </div>
                                    <div style={{
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        color: achievement.earned ? colors.textPrimary : colors.textMuted,
                                        lineHeight: 1.3,
                                    }}>
                                        {achievement.name}
                                    </div>
                                    {!achievement.earned && (
                                        <div style={{
                                            marginTop: "6px",
                                            fontSize: "10px",
                                            color: colors.textMuted,
                                            fontWeight: 500,
                                        }}>
                                            🔒 Locked
                                        </div>
                                    )}

                                    {/* Tooltip on hover */}
                                    {hoveredAchievement === achievement.id && (
                                        <div style={{
                                            position: "absolute",
                                            bottom: "calc(100% + 8px)",
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            padding: "12px 16px",
                                            background: colors.bg,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: "12px",
                                            whiteSpace: "nowrap",
                                            zIndex: 50,
                                            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${colors.border}`,
                                            pointerEvents: "none",
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px", color: colors.textPrimary }}>
                                                {achievement.name}
                                            </div>
                                            <div style={{ fontSize: "12px", color: colors.textSecondary, maxWidth: "200px", whiteSpace: "normal", lineHeight: 1.4 }}>
                                                {achievement.desc}
                                            </div>
                                            {achievement.earned && (
                                                <div style={{
                                                    marginTop: "6px",
                                                    fontSize: "10px",
                                                    color: colors.gold,
                                                    fontWeight: 600,
                                                }}>
                                                    ✨ Earned
                                                </div>
                                            )}
                                            {/* Tooltip arrow */}
                                            <div style={{
                                                position: "absolute",
                                                bottom: "-5px",
                                                left: "50%",
                                                transform: "translateX(-50%) rotate(45deg)",
                                                width: "10px",
                                                height: "10px",
                                                background: colors.bg,
                                                borderRight: `1px solid ${colors.border}`,
                                                borderBottom: `1px solid ${colors.border}`,
                                            }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Groups */}
                <div style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "24px",
                    padding: "24px",
                    marginBottom: "24px",
                }}>
                    <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>👥 Groups</h2>
                    {groups.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px", color: colors.textMuted }}>
                            <p>No groups joined yet</p>
                            <Link
                                href="/groups"
                                style={{
                                    display: "inline-block",
                                    marginTop: "12px",
                                    padding: "10px 20px",
                                    background: colors.primary,
                                    color: "#fff",
                                    borderRadius: "10px",
                                    textDecoration: "none",
                                    fontSize: "14px",
                                }}
                            >
                                Explore Groups
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
                            {groups.map((group) => (
                                <Link
                                    key={group.id}
                                    href={`/groups/${group.id}`}
                                    style={{
                                        minWidth: "180px",
                                        padding: "20px",
                                        background: colors.bg,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: "16px",
                                        textDecoration: "none",
                                        color: colors.textPrimary,
                                        transition: "transform 0.2s, border-color 0.2s",
                                    }}
                                >
                                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>{group.emoji}</div>
                                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>{group.name}</div>
                                    <div style={{ fontSize: "12px", color: colors.textMuted, display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span>{group.memberCount} members</span>
                                        {group.role === "admin" && (
                                            <span style={{
                                                padding: "2px 8px",
                                                background: `${colors.primary}30`,
                                                color: colors.primaryLight,
                                                borderRadius: "10px",
                                                fontSize: "10px",
                                                fontWeight: 600,
                                            }}>
                                                ADMIN
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Posts */}
                <div style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                }}>
                    <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>📝 Recent Activity</h2>
                    {posts.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "40px",
                            color: colors.textMuted,
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "24px"
                        }}>
                            <p>No posts yet</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {posts.map((post, idx) => (
                                <article
                                    key={post.id}
                                    className="card card-lift fade-up"
                                    style={{
                                        padding: 24,
                                        animationDelay: `${idx * 0.05}s`,
                                        background: colors.surface,
                                        border: `1px solid ${colors.border}`
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontWeight: 700, fontSize: 14, color: "#fff",
                                            overflow: "hidden"
                                        }}>
                                            {profile.avatar_url ? (
                                                <Image src={profile.avatar_url} alt="" width={40} height={40} style={{ objectFit: "cover" }} />
                                            ) : (
                                                profile.avatar
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontWeight: 600, fontSize: 14, color: colors.textPrimary }}>
                                                    {profile.display_name}
                                                </span>
                                                <Link
                                                    href={`/groups/${post.groupId}`}
                                                    style={{
                                                        padding: "2px 8px",
                                                        background: `${colors.bg}`,
                                                        border: `1px solid ${colors.border}`,
                                                        borderRadius: "12px",
                                                        fontSize: "11px",
                                                        color: colors.textMuted,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        textDecoration: "none",
                                                        transition: "all 0.2s"
                                                    }}
                                                >
                                                    {post.emoji} {post.group}
                                                </Link>
                                            </div>
                                            <span style={{ fontSize: 12, color: colors.textMuted }}>{post.time}</span>
                                        </div>
                                    </div>

                                    {/* Mood Badge and Day Count */}
                                    {(post.mood || post.dayCount) && (
                                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                            {post.mood && (
                                                <span style={{
                                                    padding: "4px 10px", borderRadius: 12,
                                                    background: colors.accentBg, color: colors.accent,
                                                    fontSize: 11, fontWeight: 500
                                                }}>
                                                    {MOODS.find(m => m.label === post.mood)?.emoji} {post.mood}
                                                </span>
                                            )}
                                            {post.dayCount && (
                                                <span style={{
                                                    padding: "4px 10px", borderRadius: 12,
                                                    background: colors.goldBg, color: colors.gold,
                                                    fontSize: 11, fontWeight: 500
                                                }}>
                                                    🔥 Day {post.dayCount}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Post Content */}
                                    <div className="post-content" style={{ fontSize: 15, lineHeight: 1.7, color: colors.textSecondary, marginBottom: post.images?.length > 0 ? 16 : 20 }}>
                                        {renderMarkdown(post.content)}
                                    </div>

                                    {/* Image Gallery */}
                                    {post.images && post.images.length > 0 && (
                                        <div style={{
                                            display: "grid",
                                            gridTemplateColumns: post.images.length === 1 ? "1fr" : "1fr 1fr",
                                            gap: 8,
                                            marginBottom: 20,
                                            borderRadius: 12,
                                            overflow: "hidden"
                                        }}>
                                            {post.images.slice(0, 4).map((img: string, i: number) => (
                                                <div key={i} style={{
                                                    position: "relative",
                                                    paddingTop: post.images.length === 1 ? "56.25%" : "100%"
                                                }}>
                                                    <img
                                                        src={img}
                                                        alt=""
                                                        style={{
                                                            position: "absolute",
                                                            top: 0, left: 0,
                                                            width: "100%", height: "100%",
                                                            objectFit: "cover",
                                                            cursor: "pointer"
                                                        }}
                                                        onClick={() => window.open(img, "_blank")}
                                                    />
                                                    {i === 3 && post.images.length > 4 && (
                                                        <div style={{
                                                            position: "absolute", top: 0, left: 0,
                                                            width: "100%", height: "100%",
                                                            background: "rgba(0,0,0,0.6)",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            color: "#fff", fontSize: 20, fontWeight: 600
                                                        }}>
                                                            +{post.images.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.textMuted, fontSize: 13 }}>
                                            <span>❤️</span>
                                            <span>{post.totalReactions || 0}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.textMuted, fontSize: 13 }}>
                                            <span>💬</span>
                                            <span>{post.comments?.length || 0} comments</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes pulse-bg {
                    0%, 100% { opacity: 0.8; transform: translateX(-50%) scale(1); }
                    50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 1023px) {
                    .profile-content { padding-left: 24px !important; }
                }
                ${styles}
            `}</style>
        </div>
    );
}
