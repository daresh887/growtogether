"use client";

import { getGroup, joinGroup, leaveGroup, createPost, getGroupPosts, toggleReaction, addComment, getLeaderboard, deletePost, getGroupMembers, cheerMember, setGroupChallenge, clearGroupChallenge } from "@/app/actions/groups";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ContractModal from "@/components/ContractModal";
import GroupSettingsModal from "@/components/GroupSettingsModal";

const REACTIONS = ["👍", "❤️", "🔥", "💪", "🎉"];

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

import { colors, shadows, radii } from "@/utils/design-tokens";

function getTimeLeft(endsAt: string): string {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
}

const styles = `
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-up { animation: fadeUp 0.5s ease-out forwards; }
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    .card { background: ${colors.surface}; border: 1px solid ${colors.border}; border-radius: 16px; transition: border-color 0.2s, transform 0.2s; }
    .card:hover { border-color: ${colors.borderLight}; }
    .card-lift:hover { transform: translateY(-2px); }
    .btn-primary { background: ${colors.primary}; color: #fff; font-weight: 600; border: none; border-radius: 10px; transition: all 0.15s ease; }
    .btn-primary:hover { background: ${colors.primaryHover}; transform: scale(1.02); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-ghost { background: transparent; border: 1px solid ${colors.border}; color: ${colors.textSecondary}; border-radius: 10px; transition: all 0.15s ease; }
    .btn-ghost:hover { border-color: ${colors.borderLight}; background: ${colors.surfaceRaised}; color: ${colors.text}; }
    .btn-accent { background: ${colors.accent}; color: #fff; font-weight: 600; border: none; border-radius: 10px; transition: all 0.15s ease; cursor: pointer; }
    .btn-accent:hover { background: ${colors.accentHover}; transform: scale(1.02); }
    input:focus, textarea:focus { outline: none; border-color: ${colors.primary} !important; }
    ::selection { background: rgba(59, 130, 246, 0.3); }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
    .post-content strong { font-weight: 700; color: ${colors.text}; }
    .post-content em { font-style: italic; }
    .post-content u { text-decoration: underline; }
`;

// Simple markdown renderer for post content
function renderMarkdown(text: string): React.ReactNode {
    if (!text) return null;

    // Split by lines first
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
        // Process inline formatting
        let parts: React.ReactNode[] = [];
        let remaining = line;
        let keyIdx = 0;

        // Process bold (**text**)
        const boldRegex = /\*\*(.+?)\*\*/g;
        // Process italic (*text*)
        const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
        // Process underline (__text__)
        const underlineRegex = /__(.+?)__/g;

        // Simple approach: replace each pattern with spans
        let processed = remaining
            .replace(boldRegex, '<strong>$1</strong>')
            .replace(underlineRegex, '<u>$1</u>')
            .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

        // Check if line is a bullet point
        const isBullet = line.startsWith('• ');

        if (isBullet) {
            processed = processed.substring(2); // Remove bullet prefix
        }

        const element = (
            <span
                key={lineIdx}
                style={isBullet ? { display: 'flex', gap: 8 } : undefined}
                dangerouslySetInnerHTML={{
                    __html: isBullet ? `<span style="color: #818CF8">•</span> ${processed}` : processed
                }}
            />
        );

        // Add line break between lines
        if (lineIdx < lines.length - 1) {
            return <span key={`line-${lineIdx}`}>{element}<br /></span>;
        }
        return element;
    });
}

export default function GroupDetailPage() {
    const params = useParams();
    const router = useRouter();
    const groupId = params?.id as string;

    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [userRole, setUserRole] = useState<"owner" | "moderator" | "member" | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [postContent, setPostContent] = useState("");
    const [posts, setPosts] = useState<any[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
    const [activeTab, setActiveTab] = useState<"feed" | "leaderboard" | "rules">("feed");
    const [showContractModal, setShowContractModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [cheeringUser, setCheeringUser] = useState<string | null>(null);
    const [showChallengeForm, setShowChallengeForm] = useState(false);
    const [challengeTitle, setChallengeTitle] = useState("");
    const [challengeDesc, setChallengeDesc] = useState("");
    const [challengeDays, setChallengeDays] = useState(7);
    const [challengeSaving, setChallengeSaving] = useState(false);

    // Enhanced post composer state
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [imageUploading, setImageUploading] = useState(false);
    const [showMoodPicker, setShowMoodPicker] = useState(false);
    const [userStreakCount, setUserStreakCount] = useState<number>(0);
    const [toast, setToast] = useState<{ message: string; type: "error" | "warning" } | null>(null);
    const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
    const [timeFrame, setTimeFrame] = useState<'all' | 'week' | 'day'>('all');
    const [manifestoExpanded, setManifestoExpanded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
    const [pendingImages, setPendingImages] = useState<File[]>([]);
    const [currentCropIndex, setCurrentCropIndex] = useState(0);
    const cropContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [groupData, postsData, leaderboardData] = await Promise.all([
                    getGroup(groupId),
                    getGroupPosts(groupId, { sortBy, timeFrame }),
                    getLeaderboard(groupId)
                ]);
                setGroup(groupData);
                setIsMember(groupData?.isMember || false);
                setUserRole(groupData?.userRole || null);
                setIsOwner(groupData?.isOwner || false);
                setPosts(postsData || []);
                setLeaderboard(leaderboardData || []);

            } catch (error) {
                console.error("Failed to fetch group data:", error);
            } finally {
                setLoading(false);
                setPostsLoading(false);
            }
        }
        if (groupId) fetchData();
    }, [groupId, sortBy, timeFrame]);

    // Load members when Members tab is activated


    const handleJoinToggle = async () => {
        if (isMember) {
            if (isOwner) { setShowSettingsModal(true); return; }
            setJoinLoading(true);
            try {
                await leaveGroup(groupId);
                setIsMember(false);
                setUserRole(null);
                setGroup((p: any) => ({ ...p, memberCount: Math.max(0, p.memberCount - 1) }));
            } catch (e: any) { setToast({ message: e.message || "Failed to leave", type: "error" }); }
            finally { setJoinLoading(false); }
        } else {
            setShowContractModal(true);
        }
    };

    const handleContractSign = async () => {
        setShowContractModal(false);
        setJoinLoading(true);
        try {
            await joinGroup(groupId);
            setIsMember(true);
            setUserRole("member");
            setGroup((p: any) => ({ ...p, memberCount: p.memberCount + 1 }));
        } catch { setToast({ message: "Failed to join", type: "error" }); }
        finally { setJoinLoading(false); }
    };

    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postContent.trim() && uploadedImages.length === 0) return;
        const content = postContent;
        const images = [...uploadedImages];
        const mood = selectedMood;

        // Reset form immediately
        setPostContent("");
        setUploadedImages([]);
        setSelectedMood(null);
        setShowMoodPicker(false);

        try {
            const result = await createPost(groupId, content, {
                images: images.length > 0 ? images : undefined,
                mood: mood || undefined,
            });
            // Update streak count
            if (result.streakCount) {
                setUserStreakCount(result.streakCount);
            }
            const updated = await getGroupPosts(groupId, { sortBy, timeFrame });
            setPosts(updated || []);
        } catch {
            // Restore on error
            setPostContent(content);
            setUploadedImages(images);
            setSelectedMood(mood);
            setToast({ message: "Failed to post", type: "error" });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        if (uploadedImages.length >= 4) {
            setToast({ message: "Maximum 4 images allowed", type: "warning" });
            return;
        }

        // Store files and open cropper for the first one
        const fileArray = Array.from(files).slice(0, 4 - uploadedImages.length);
        setPendingImages(fileArray);
        setCurrentCropIndex(0);

        // Load first image for cropping
        const reader = new FileReader();
        reader.onload = (event) => {
            setCropImage(event.target?.result as string);
            setCropPosition({ x: 0, y: 0 });
            setShowCropper(true);
        };
        reader.readAsDataURL(fileArray[0]);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCropDrag = (e: React.MouseEvent) => {
        if (!cropContainerRef.current) return;
        const container = cropContainerRef.current;
        const rect = container.getBoundingClientRect();

        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = cropPosition.x;
        const startPosY = cropPosition.y;

        const handleMove = (moveE: MouseEvent) => {
            const deltaX = moveE.clientX - startX;
            const deltaY = moveE.clientY - startY;

            // Calculate new position (constrain within bounds)
            const newX = Math.max(-200, Math.min(200, startPosX + deltaX * 0.5));
            const newY = Math.max(-200, Math.min(200, startPosY + deltaY * 0.5));

            setCropPosition({ x: newX, y: newY });
        };

        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    const applyCrop = () => {
        if (!cropImage) return;

        // Create cropped image using canvas
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 800; // Output size
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Calculate crop area based on position
            const scale = Math.max(img.width, img.height) / 400;
            const offsetX = -cropPosition.x * scale;
            const offsetY = -cropPosition.y * scale;

            // Draw the cropped portion
            const cropSize = Math.min(img.width, img.height);
            const srcX = Math.max(0, (img.width - cropSize) / 2 + offsetX);
            const srcY = Math.max(0, (img.height - cropSize) / 2 + offsetY);

            ctx.drawImage(
                img,
                Math.max(0, srcX), Math.max(0, srcY), cropSize, cropSize,
                0, 0, size, size
            );

            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setUploadedImages(prev => [...prev, croppedDataUrl].slice(0, 4));

            // Move to next image or close cropper
            if (currentCropIndex < pendingImages.length - 1) {
                const nextIndex = currentCropIndex + 1;
                setCurrentCropIndex(nextIndex);
                const reader = new FileReader();
                reader.onload = (event) => {
                    setCropImage(event.target?.result as string);
                    setCropPosition({ x: 0, y: 0 });
                };
                reader.readAsDataURL(pendingImages[nextIndex]);
            } else {
                setShowCropper(false);
                setCropImage(null);
                setPendingImages([]);
            }
        };
        img.src = cropImage;
    };

    const skipCrop = () => {
        // Add image without cropping
        if (cropImage) {
            setUploadedImages(prev => [...prev, cropImage].slice(0, 4));
        }

        // Move to next image or close
        if (currentCropIndex < pendingImages.length - 1) {
            const nextIndex = currentCropIndex + 1;
            setCurrentCropIndex(nextIndex);
            const reader = new FileReader();
            reader.onload = (event) => {
                setCropImage(event.target?.result as string);
                setCropPosition({ x: 0, y: 0 });
            };
            reader.readAsDataURL(pendingImages[nextIndex]);
        } else {
            setShowCropper(false);
            setCropImage(null);
            setPendingImages([]);
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Delete this post?")) return;
        const prev = posts;
        setPosts(p => p.filter(x => x.id !== postId));
        try { await deletePost(postId, groupId); }
        catch (e: any) { setPosts(prev); setToast({ message: e.message || "Failed to delete", type: "error" }); }
    };

    const handleReaction = async (postId: string, emoji: string) => {
        setPosts(curr => curr.map(post => {
            if (post.id !== postId) return post;
            const reactions = { ...post.reactions };
            const userReactions = new Set(post.userReactions || []);
            if (userReactions.has(emoji)) {
                reactions[emoji] = Math.max(0, (reactions[emoji] || 0) - 1);
                userReactions.delete(emoji);
            } else {
                reactions[emoji] = (reactions[emoji] || 0) + 1;
                userReactions.add(emoji);
            }
            return { ...post, reactions, userReactions: Array.from(userReactions) };
        }));
        try { await toggleReaction(postId, emoji, groupId); } catch { }
    };

    const handleAddComment = async (postId: string) => {
        const content = newComment[postId]?.trim();
        if (!content) return;
        setNewComment(prev => ({ ...prev, [postId]: "" }));
        try {
            await addComment(postId, content, groupId);
            const updated = await getGroupPosts(groupId, { sortBy, timeFrame });
            setPosts(updated || []);
        } catch { setNewComment(prev => ({ ...prev, [postId]: content })); }
    };

    const formatTime = (date: string) => {
        const d = new Date(date);
        const diff = Date.now() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "now";
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const handleCheer = async (targetUserId: string) => {
        setCheeringUser(targetUserId);
        try {
            await cheerMember(groupId, targetUserId);
            setToast({ message: "Cheer sent! 🎉", type: "warning" });
            const updated = await getGroupPosts(groupId, { sortBy, timeFrame });
            setPosts(updated || []);
        } catch (e: any) {
            setToast({ message: e.message || "Failed to cheer", type: "error" });
        } finally { setCheeringUser(null); }
    };



    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: colors.bg }}>
                <Navbar />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
                    <div style={{ width: 40, height: 40, border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                </div>
                <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!group) {
        return (
            <div style={{ minHeight: "100vh", background: colors.bg }}>
                <Navbar />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: 12 }}>
                    <span style={{ fontSize: 48 }}>🔍</span>
                    <h2 style={{ color: colors.text, fontSize: 18 }}>Group not found</h2>
                    <Link href="/groups" style={{ color: colors.primary, textDecoration: "none", fontSize: 14 }}>← Back</Link>
                </div>
            </div>
        );
    }

    const pinnedPosts = posts.filter(p => p.isPinned);
    const regularPosts = posts.filter(p => !p.isPinned);

    return (
        <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text }}>
            <style jsx global>{styles}</style>
            <Navbar />

            {/* Toast notification */}
            {toast && (
                <div
                    onClick={() => setToast(null)}
                    style={{
                        position: "fixed",
                        top: "24px",
                        right: "24px",
                        padding: "14px 20px",
                        borderRadius: "12px",
                        background: toast.type === "error" ? "rgba(248, 113, 113, 0.15)" : "rgba(251, 191, 36, 0.15)",
                        border: `1px solid ${toast.type === "error" ? "rgba(248, 113, 113, 0.3)" : "rgba(251, 191, 36, 0.3)"}`,
                        color: toast.type === "error" ? colors.danger : colors.gold,
                        fontSize: "14px",
                        fontWeight: 500,
                        zIndex: 1000,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        animation: "fadeIn 0.3s ease",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    }}
                >
                    <span>{toast.type === "error" ? "✕" : "⚠"}</span>
                    {toast.message}
                </div>
            )}

            <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px", paddingLeft: "88px" }}>

                {/* Header with integrated manifesto */}
                <header className="card fade-up" style={{ padding: 28, marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: 18, flex: 1 }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 14,
                                background: colors.surfaceRaised, border: `1px solid ${colors.border}`,
                                overflow: "hidden",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0
                            }}>
                                {group.settings?.iconUrl || group.theme?.iconUrl ? (
                                    <img
                                        src={group.settings?.iconUrl || group.theme?.iconUrl}
                                        alt={group.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                ) : (
                                    group.emoji || "🎯"
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{group.name}</h1>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.textMuted, fontSize: 13, marginBottom: 10 }}>
                                    <span>👥 {group.memberCount}</span>
                                    <span>•</span>
                                    <span>{group.category}</span>
                                </div>
                                {/* Bio/Description */}
                                {group.description && (
                                    <p style={{
                                        fontSize: 14, color: colors.textSecondary, lineHeight: 1.6, margin: 0,
                                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any,
                                        overflow: "hidden", wordBreak: "break-word" as const,
                                    }}>
                                        {group.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            {(userRole === "owner" || userRole === "moderator") && (
                                <button onClick={() => setShowSettingsModal(true)} className="btn-ghost" style={{ padding: "10px 12px", fontSize: 16 }}>⚙️</button>
                            )}
                            {isOwner ? (
                                <div style={{ padding: "10px 18px", borderRadius: 10, background: colors.goldBg, border: `1px solid ${colors.gold}40`, color: colors.gold, fontWeight: 600, fontSize: 13 }}>
                                    👑 Owner
                                </div>
                            ) : (
                                <button onClick={handleJoinToggle} disabled={joinLoading} className={isMember ? "btn-ghost" : "btn-primary"} style={{ padding: "10px 20px", fontSize: 13, cursor: joinLoading ? "wait" : "pointer" }}>
                                    {joinLoading ? "..." : isMember ? "Leave" : "Join Group"}
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Tabs and Content */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28, alignItems: "start" }}>
                    <div className="fade-up" style={{ animationDelay: "0.2s" }}>

                        {/* Tab Nav */}
                        <nav style={{ display: "flex", gap: 2, marginBottom: 24, background: colors.surface, borderRadius: 12, padding: 4, border: `1px solid ${colors.border}` }}>
                            {[
                                { id: "feed", label: "Activity Feed", icon: "💬" },
                                { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
                                { id: "rules", label: "Rules", icon: "📋" },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    style={{
                                        flex: 1, padding: "12px 16px", borderRadius: 9, border: "none",
                                        background: activeTab === tab.id ? colors.surfaceRaised : "transparent",
                                        color: activeTab === tab.id ? colors.text : colors.textMuted,
                                        fontWeight: 500, fontSize: 13, cursor: "pointer",
                                        transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                                    }}
                                >
                                    <span>{tab.icon}</span> {tab.label}
                                </button>
                            ))}
                        </nav>

                        {/* Feed Tab */}
                        {activeTab === "feed" && (
                            <div>
                                {/* Active Challenge */}
                                {(() => {
                                    const ch = group?.settings?.challenge;
                                    const isActive = ch && new Date(ch.endsAt) > new Date();
                                    return isActive ? (
                                        <div className="fade-up" style={{
                                            marginBottom: 20, padding: "16px 20px",
                                            background: colors.surface,
                                            borderRadius: 12,
                                            borderLeft: `3px solid ${colors.accent}`,
                                        }}>
                                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                                                <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0, lineHeight: 1.4 }}>
                                                    {ch.title}
                                                </h3>
                                                <span style={{ fontSize: 11, color: colors.textMuted, whiteSpace: "nowrap", marginLeft: 12 }}>
                                                    {getTimeLeft(ch.endsAt)}
                                                </span>
                                            </div>
                                            {ch.description && (
                                                <p style={{ fontSize: 13, color: colors.textSecondary, margin: "6px 0 0", lineHeight: 1.5 }}>
                                                    {ch.description}
                                                </p>
                                            )}
                                            {isOwner && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm("End this challenge?")) {
                                                            await clearGroupChallenge(groupId);
                                                            const updated = await getGroup(groupId);
                                                            setGroup(updated);
                                                        }
                                                    }}
                                                    style={{ fontSize: 11, color: colors.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 10 }}
                                                >
                                                    End challenge
                                                </button>
                                            )}
                                        </div>
                                    ) : isOwner && !showChallengeForm ? (
                                        <button
                                            onClick={() => setShowChallengeForm(true)}
                                            style={{
                                                width: "100%", padding: "12px 16px", marginBottom: 20,
                                                display: "block", textAlign: "left",
                                                cursor: "pointer", border: `1px solid ${colors.border}`,
                                                borderRadius: 10,
                                                background: "transparent", color: colors.textMuted,
                                                fontSize: 13,
                                            }}
                                        >
                                            + Set a challenge
                                        </button>
                                    ) : null;
                                })()}

                                {/* Challenge Form */}
                                {isOwner && showChallengeForm && (
                                    <div style={{ marginBottom: 20, padding: "16px 20px", background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}` }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>New challenge</p>
                                        <input
                                            value={challengeTitle}
                                            onChange={e => setChallengeTitle(e.target.value)}
                                            placeholder="e.g. Run 50km this week"
                                            maxLength={100}
                                            autoFocus
                                            style={{
                                                width: "100%", padding: "8px 12px", borderRadius: 8,
                                                border: `1px solid ${colors.border}`, background: colors.bg,
                                                color: colors.text, fontSize: 14, outline: "none", marginBottom: 8,
                                                boxSizing: "border-box",
                                            }}
                                        />
                                        <textarea
                                            value={challengeDesc}
                                            onChange={e => setChallengeDesc(e.target.value)}
                                            placeholder="Add details (optional)"
                                            rows={2}
                                            maxLength={280}
                                            style={{
                                                width: "100%", padding: "8px 12px", borderRadius: 8,
                                                border: `1px solid ${colors.border}`, background: colors.bg,
                                                color: colors.text, fontSize: 13, outline: "none", resize: "none",
                                                marginBottom: 10, boxSizing: "border-box",
                                            }}
                                        />
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontSize: 12, color: colors.textMuted }}>Ends in</span>
                                                {[3, 7, 14, 30].map(d => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setChallengeDays(d)}
                                                        style={{
                                                            padding: "4px 10px", borderRadius: 6, fontSize: 12,
                                                            border: `1px solid ${challengeDays === d ? colors.textSecondary : colors.border}`,
                                                            background: challengeDays === d ? colors.surfaceHover : "transparent",
                                                            color: challengeDays === d ? colors.text : colors.textMuted,
                                                            cursor: "pointer", fontWeight: challengeDays === d ? 600 : 400,
                                                        }}
                                                    >
                                                        {d === 30 ? "1mo" : `${d}d`}
                                                    </button>
                                                ))}
                                            </div>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    onClick={() => { setShowChallengeForm(false); setChallengeTitle(""); setChallengeDesc(""); }}
                                                    style={{ padding: "6px 14px", fontSize: 12, cursor: "pointer", background: "none", border: "none", color: colors.textMuted }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!challengeTitle.trim()) return;
                                                        setChallengeSaving(true);
                                                        try {
                                                            const endsAt = new Date(Date.now() + challengeDays * 86400000).toISOString();
                                                            await setGroupChallenge(groupId, { title: challengeTitle.trim(), description: challengeDesc.trim(), endsAt });
                                                            const updated = await getGroup(groupId);
                                                            setGroup(updated);
                                                            setChallengeTitle("");
                                                            setChallengeDesc("");
                                                            setShowChallengeForm(false);
                                                            setToast({ message: "Challenge set", type: "warning" });
                                                        } catch (e: any) {
                                                            setToast({ message: e.message || "Failed", type: "error" });
                                                        } finally { setChallengeSaving(false); }
                                                    }}
                                                    disabled={!challengeTitle.trim() || challengeSaving}
                                                    style={{
                                                        padding: "6px 16px", fontSize: 12, borderRadius: 6,
                                                        border: "none", background: colors.accent, color: "#fff",
                                                        cursor: !challengeTitle.trim() ? "default" : "pointer",
                                                        fontWeight: 600, opacity: !challengeTitle.trim() ? 0.4 : 1,
                                                    }}
                                                >
                                                    {challengeSaving ? "Saving..." : "Set"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isMember && (
                                    <form onSubmit={handlePostSubmit} className="card" style={{ padding: 16, marginBottom: 20 }}>
                                        {/* Text Formatting Toolbar */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
                                            <button type="button" onClick={() => {
                                                const ta = document.getElementById('post-textarea') as HTMLTextAreaElement;
                                                const start = ta.selectionStart;
                                                const end = ta.selectionEnd;
                                                const text = postContent;
                                                const selected = text.substring(start, end);
                                                setPostContent(text.substring(0, start) + `**${selected}**` + text.substring(end));
                                            }} style={{
                                                width: 32, height: 32, borderRadius: 6, border: `1px solid ${colors.border}`,
                                                background: "transparent", color: colors.textSecondary, fontWeight: 700,
                                                fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                                            }} title="Bold">B</button>
                                            <button type="button" onClick={() => {
                                                const ta = document.getElementById('post-textarea') as HTMLTextAreaElement;
                                                const start = ta.selectionStart;
                                                const end = ta.selectionEnd;
                                                const text = postContent;
                                                const selected = text.substring(start, end);
                                                setPostContent(text.substring(0, start) + `*${selected}*` + text.substring(end));
                                            }} style={{
                                                width: 32, height: 32, borderRadius: 6, border: `1px solid ${colors.border}`,
                                                background: "transparent", color: colors.textSecondary, fontStyle: "italic",
                                                fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                                            }} title="Italic">I</button>
                                            <button type="button" onClick={() => {
                                                const ta = document.getElementById('post-textarea') as HTMLTextAreaElement;
                                                const start = ta.selectionStart;
                                                const end = ta.selectionEnd;
                                                const text = postContent;
                                                const selected = text.substring(start, end);
                                                setPostContent(text.substring(0, start) + `__${selected}__` + text.substring(end));
                                            }} style={{
                                                width: 32, height: 32, borderRadius: 6, border: `1px solid ${colors.border}`,
                                                background: "transparent", color: colors.textSecondary, textDecoration: "underline",
                                                fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                                            }} title="Underline">U</button>
                                            <div style={{ width: 1, height: 20, background: colors.border, margin: "0 4px" }} />
                                            <button type="button" onClick={() => {
                                                const lines = postContent.split('\n');
                                                const newLines = lines.map(line => line.startsWith('• ') ? line : `• ${line}`);
                                                setPostContent(newLines.join('\n'));
                                            }} style={{
                                                width: 32, height: 32, borderRadius: 6, border: `1px solid ${colors.border}`,
                                                background: "transparent", color: colors.textSecondary,
                                                fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                                            }} title="Bullet List">•</button>

                                            <div style={{ flex: 1 }} />

                                            {/* Mood Selector - Compact */}
                                            <button
                                                type="button"
                                                onClick={() => setShowMoodPicker(!showMoodPicker)}
                                                style={{
                                                    padding: "6px 12px", borderRadius: 16,
                                                    border: `1px solid ${selectedMood ? colors.primary : colors.border}`,
                                                    background: selectedMood ? colors.primaryBg : "transparent",
                                                    color: selectedMood ? colors.primary : colors.textMuted,
                                                    fontSize: 12, cursor: "pointer"
                                                }}
                                            >
                                                {selectedMood ?
                                                    `${MOODS.find(m => m.label === selectedMood)?.emoji} ${selectedMood}` :
                                                    "😊 Mood"
                                                }
                                            </button>
                                        </div>

                                        {/* Mood Picker Dropdown */}
                                        {showMoodPicker && (
                                            <div style={{
                                                display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12,
                                                padding: 10, background: colors.surfaceRaised, borderRadius: 10
                                            }}>
                                                {MOODS.map(mood => (
                                                    <button
                                                        key={mood.label}
                                                        type="button"
                                                        onClick={() => { setSelectedMood(mood.label); setShowMoodPicker(false); }}
                                                        style={{
                                                            padding: "5px 10px", borderRadius: 12,
                                                            border: `1px solid ${selectedMood === mood.label ? colors.primary : colors.border}`,
                                                            background: selectedMood === mood.label ? colors.primaryBg : "transparent",
                                                            color: selectedMood === mood.label ? colors.primary : colors.textSecondary,
                                                            fontSize: 11, cursor: "pointer"
                                                        }}
                                                    >
                                                        {mood.emoji} {mood.label}
                                                    </button>
                                                ))}
                                                {selectedMood && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedMood(null); setShowMoodPicker(false); }}
                                                        style={{
                                                            padding: "5px 10px", borderRadius: 12,
                                                            border: `1px solid ${colors.danger}`,
                                                            background: "transparent", color: colors.danger,
                                                            fontSize: 11, cursor: "pointer"
                                                        }}
                                                    >
                                                        ✕ Clear
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Text Input */}
                                        <textarea
                                            id="post-textarea"
                                            value={postContent}
                                            onChange={(e) => setPostContent(e.target.value)}
                                            placeholder="What's on your mind? Share progress, wins, struggles..."
                                            rows={4}
                                            style={{
                                                width: "100%", padding: 14, background: colors.surfaceRaised,
                                                border: `1px solid ${colors.border}`, borderRadius: 10,
                                                color: colors.text, fontSize: 14, resize: "vertical", fontFamily: "inherit",
                                                minHeight: 100, transition: "border-color 0.15s"
                                            }}
                                        />

                                        {/* Image Upload */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            style={{ display: "none" }}
                                        />

                                        {/* Live Preview Section */}
                                        {(postContent.trim() || uploadedImages.length > 0) && (
                                            <div style={{
                                                marginTop: 14, padding: 14,
                                                background: colors.surface, borderRadius: 12,
                                                border: `1px dashed ${colors.border}`
                                            }}>
                                                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10, fontWeight: 500 }}>
                                                    📝 Preview
                                                </div>

                                                {/* Text Preview with Markdown */}
                                                {postContent.trim() && (
                                                    <div className="post-content" style={{
                                                        fontSize: 14, lineHeight: 1.7,
                                                        color: colors.textSecondary,
                                                        marginBottom: uploadedImages.length > 0 ? 12 : 0
                                                    }}>
                                                        {renderMarkdown(postContent)}
                                                    </div>
                                                )}

                                                {/* Image Preview - Matches Post Display */}
                                                {uploadedImages.length > 0 && (
                                                    <div style={{
                                                        display: "grid",
                                                        gridTemplateColumns: uploadedImages.length === 1 ? "1fr" : "1fr 1fr",
                                                        gap: 8,
                                                        borderRadius: 12,
                                                        overflow: "hidden"
                                                    }}>
                                                        {uploadedImages.map((img, i) => (
                                                            <div key={i} style={{
                                                                position: "relative",
                                                                paddingTop: uploadedImages.length === 1 ? "56.25%" : "100%"
                                                            }}>
                                                                <img
                                                                    src={img}
                                                                    alt=""
                                                                    style={{
                                                                        position: "absolute",
                                                                        top: 0, left: 0,
                                                                        width: "100%", height: "100%",
                                                                        objectFit: "cover"
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeImage(i)}
                                                                    style={{
                                                                        position: "absolute", top: 8, right: 8,
                                                                        width: 28, height: 28, borderRadius: "50%",
                                                                        background: "rgba(0,0,0,0.75)", border: "none",
                                                                        color: "#fff", fontSize: 14, cursor: "pointer",
                                                                        display: "flex", alignItems: "center", justifyContent: "center"
                                                                    }}
                                                                >✕</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Action Bar */}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadedImages.length >= 4 || imageUploading}
                                                    style={{
                                                        padding: "8px 14px", borderRadius: 8,
                                                        border: `1px solid ${colors.border}`, background: "transparent",
                                                        color: uploadedImages.length >= 4 ? colors.textMuted : colors.textSecondary,
                                                        fontSize: 13, cursor: uploadedImages.length >= 4 ? "not-allowed" : "pointer",
                                                        display: "flex", alignItems: "center", gap: 6
                                                    }}
                                                >
                                                    📷 {imageUploading ? "Uploading..." : uploadedImages.length > 0 ? `${uploadedImages.length}/4` : "Add Photos"}
                                                </button>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                {userStreakCount > 0 && (
                                                    <span style={{ fontSize: 12, color: colors.accent }}>
                                                        🔥 Day {userStreakCount}
                                                    </span>
                                                )}
                                                <button
                                                    type="submit"
                                                    disabled={!postContent.trim() && uploadedImages.length === 0}
                                                    className="btn-primary"
                                                    style={{
                                                        padding: "10px 24px", fontSize: 13,
                                                        opacity: (postContent.trim() || uploadedImages.length > 0) ? 1 : 0.5,
                                                        cursor: (postContent.trim() || uploadedImages.length > 0) ? "pointer" : "not-allowed"
                                                    }}
                                                >
                                                    Post
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        style={{
                                            padding: "6px 10px", borderRadius: 8, background: colors.surface,
                                            border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13, outline: "none"
                                        }}
                                    >
                                        <option value="recent">Most Recent</option>
                                        <option value="popular">Most Popular</option>
                                    </select>

                                    <select
                                        value={timeFrame}
                                        onChange={(e) => setTimeFrame(e.target.value as any)}
                                        style={{
                                            padding: "6px 10px", borderRadius: 8, background: colors.surface,
                                            border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13, outline: "none"
                                        }}
                                    >
                                        <option value="all">All Time</option>
                                        <option value="week">This Week</option>
                                        <option value="day">Today</option>
                                    </select>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    {[...pinnedPosts, ...regularPosts].map((post, idx) => (
                                        <article key={post.id} className="card card-lift fade-up" style={{ padding: 20, animationDelay: `${idx * 0.05}s`, borderColor: post.isPinned ? colors.primary : undefined }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                                                <Link href={`/profile/${post.userId}`} style={{
                                                    width: 40, height: 40, borderRadius: 10,
                                                    background: (post.userAvatar || post.userEmoji) ? "transparent" : `linear-gradient(135deg, ${colors.primary}, #6366F1)`,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontWeight: 700, fontSize: 14, color: "#fff", textDecoration: "none", overflow: "hidden"
                                                }}>
                                                    {post.userAvatar ? (
                                                        <img src={post.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    ) : (
                                                        <span style={{ fontSize: 20 }}>{post.userEmoji || post.userName?.charAt(0)?.toUpperCase()}</span>
                                                    )}
                                                </Link>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <Link href={`/profile/${post.userId}`} style={{ fontWeight: 600, fontSize: 14, color: colors.text, textDecoration: "none" }}>
                                                            {post.userName}
                                                        </Link>
                                                        {post.userId === group?.created_by && (
                                                            <span style={{ padding: "2px 6px", background: colors.goldBg, color: colors.gold, borderRadius: 4, fontSize: 10, fontWeight: 600 }}>👑</span>
                                                        )}
                                                        {post.isPinned && (
                                                            <span style={{ padding: "2px 6px", background: colors.primaryBg, color: colors.primary, borderRadius: 4, fontSize: 10, fontWeight: 600 }}>PINNED</span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: 12, color: colors.textMuted }}>{formatTime(post.createdAt)}</span>
                                                </div>
                                                {(userRole === "owner" || userRole === "moderator" || post.userId === group?.currentUserId) && (
                                                    <button onClick={() => handleDeletePost(post.id)} className="btn-ghost" style={{ padding: "6px 8px", fontSize: 14, opacity: 0.5 }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                                                    >🗑️</button>
                                                )}
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
                                            <div className="post-content" style={{ fontSize: 14, lineHeight: 1.7, color: colors.textSecondary, marginBottom: post.images?.length > 0 ? 12 : 16 }}>
                                                {renderMarkdown(post.content)}
                                            </div>

                                            {/* Image Gallery */}
                                            {post.images && post.images.length > 0 && (
                                                <div style={{
                                                    display: "grid",
                                                    gridTemplateColumns: post.images.length === 1 ? "1fr" : "1fr 1fr",
                                                    gap: 8,
                                                    marginBottom: 16,
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

                                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                {/* Single Heart Reaction */}
                                                <button
                                                    onClick={() => handleReaction(post.id, "❤️")}
                                                    style={{
                                                        padding: "5px 10px", borderRadius: 16,
                                                        border: `1px solid ${post.userReactions?.includes("❤️") ? colors.primary : colors.border}`,
                                                        background: post.userReactions?.includes("❤️") ? colors.primaryBg : "transparent",
                                                        color: post.userReactions?.includes("❤️") ? colors.text : colors.textMuted,
                                                        fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                                                        transition: "all 0.15s"
                                                    }}
                                                >
                                                    ❤️ {post.reactions?.["❤️"] > 0 && <span style={{ fontSize: 11 }}>{post.reactions["❤️"]}</span>}
                                                </button>
                                                <button onClick={() => {
                                                    const next = new Set(expandedComments);
                                                    next.has(post.id) ? next.delete(post.id) : next.add(post.id);
                                                    setExpandedComments(next);
                                                }} style={{
                                                    marginLeft: "auto", padding: "5px 10px", borderRadius: 16,
                                                    border: `1px solid ${colors.border}`, background: "transparent",
                                                    color: colors.textMuted, fontSize: 13, cursor: "pointer",
                                                    display: "flex", alignItems: "center", gap: 5
                                                }}>
                                                    💬 {post.comments?.length || 0}
                                                </button>
                                            </div>

                                            {expandedComments.has(post.id) && (
                                                <div className="fade-in" style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${colors.border}` }}>
                                                    {post.comments?.map((c: any) => (
                                                        <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                                                            <div style={{
                                                                width: 28, height: 28, borderRadius: 7,
                                                                background: (c.userAvatar || c.userEmoji) ? "transparent" : colors.surfaceRaised,
                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                fontSize: 11, fontWeight: 600, flexShrink: 0, overflow: "hidden"
                                                            }}>
                                                                {c.userAvatar ? (
                                                                    <img src={c.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                ) : (
                                                                    <span style={{ fontSize: 14 }}>{c.userEmoji || c.userName?.charAt(0)?.toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                                                    <span style={{ fontWeight: 600, fontSize: 12 }}>{c.userName}</span>
                                                                    <span style={{ fontSize: 11, color: colors.textMuted }}>{formatTime(c.createdAt)}</span>
                                                                </div>
                                                                <p style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>{c.content}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {isMember && (
                                                        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                                                            <input
                                                                type="text" placeholder="Reply..."
                                                                value={newComment[post.id] || ""}
                                                                onChange={(e) => setNewComment(p => ({ ...p, [post.id]: e.target.value }))}
                                                                onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                                                                style={{ flex: 1, padding: "10px 14px", background: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 13 }}
                                                            />
                                                            <button onClick={() => handleAddComment(post.id)} disabled={!newComment[post.id]?.trim()} className="btn-primary" style={{
                                                                padding: "10px 16px", fontSize: 12,
                                                                opacity: newComment[post.id]?.trim() ? 1 : 0.5,
                                                                cursor: newComment[post.id]?.trim() ? "pointer" : "not-allowed"
                                                            }}>Reply</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </article>
                                    ))}

                                    {posts.length === 0 && (
                                        <div style={{ textAlign: "center", padding: 60, color: colors.textMuted }}>
                                            <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>📝</span>
                                            <p style={{ fontSize: 14 }}>{isMember ? "Be the first to share your progress!" : "Join to start posting."}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Leaderboard Tab */}
                        {activeTab === "leaderboard" && (
                            <div className="card" style={{ overflow: "hidden" }}>
                                <div style={{
                                    padding: "16px 20px", borderBottom: `1px solid ${colors.border}`,
                                    background: colors.surfaceRaised, display: "flex", alignItems: "center", gap: 8
                                }}>
                                    <span style={{ fontSize: 18 }}>🔥</span>
                                    <div>
                                        <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>Streak Leaderboard</h3>
                                        <p style={{ fontSize: 12, color: colors.textMuted, margin: "2px 0 0" }}>Ranked by consecutive active days</p>
                                    </div>
                                </div>

                                {leaderboard.length > 0 ? leaderboard.map((m, i) => (
                                    <Link key={m.userId} href={`/profile/${m.userId}`} className="fade-up" style={{
                                        display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
                                        borderBottom: i < leaderboard.length - 1 ? `1px solid ${colors.border}` : "none",
                                        textDecoration: "none", color: colors.text, animationDelay: `${i * 0.05}s`,
                                        transition: "background 0.15s"
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = colors.surfaceHover}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            background: i < 3 ? [colors.goldBg, "rgba(192,192,192,0.15)", "rgba(205,127,50,0.15)"][i] : colors.surface,
                                            color: i < 3 ? [colors.gold, "#C0C0C0", "#CD7F32"][i] : colors.textMuted,
                                            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13
                                        }}>
                                            {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                                        </div>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: (m.userAvatar || m.userEmoji) ? "transparent" : `linear-gradient(135deg, ${colors.primary}, #6366F1)`,
                                            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff",
                                            overflow: "hidden"
                                        }}>
                                            {m.userAvatar ? (
                                                <img src={m.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span style={{ fontSize: 20 }}>{m.userEmoji || m.displayName?.charAt(0)?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.displayName}</span>
                                                {m.userId === group?.created_by && (
                                                    <span style={{ padding: "1px 5px", background: colors.goldBg, color: colors.gold, borderRadius: 4, fontSize: 10 }}>👑</span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: 12, color: colors.textMuted }}>{m.totalPosts} posts</span>
                                        </div>
                                        <div style={{
                                            padding: "6px 12px", borderRadius: 8,
                                            background: colors.accentBg, color: colors.accent, fontWeight: 700, fontSize: 13
                                        }}>
                                            🔥 {m.streak}
                                        </div>
                                    </Link>
                                )) : (
                                    <div style={{ textAlign: "center", padding: 60, color: colors.textMuted }}>
                                        <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🏆</span>
                                        <p style={{ fontSize: 14 }}>No activity yet</p>
                                    </div>
                                )}
                            </div>
                        )}




                        {/* Rules Tab */}
                        {activeTab === "rules" && (
                            <div className="card" style={{ padding: 28 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24 }}>📋 All Rules</h3>
                                {group.rules?.length > 0 ? (
                                    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                        {group.rules.map((rule: string, i: number) => (
                                            <li key={i} className="fade-up" style={{
                                                display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0",
                                                borderBottom: i < group.rules.length - 1 ? `1px solid ${colors.border}` : "none",
                                                animationDelay: `${i * 0.05}s`
                                            }}>
                                                <span style={{
                                                    width: 26, height: 26, borderRadius: 7,
                                                    background: colors.primaryBg, color: colors.primary,
                                                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0
                                                }}>{i + 1}</span>
                                                <span style={{ fontSize: 14, lineHeight: 1.6, color: colors.textSecondary }}>{rule}</span>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>No rules defined</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="fade-up" style={{ animationDelay: "0.3s", display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Manifesto/Vision */}
                        {(() => {
                            let manifestoText = "";
                            if (typeof group.group_dna === "string") {
                                manifestoText = group.group_dna;
                            } else if (group.group_dna && typeof group.group_dna === "object") {
                                const dna = group.group_dna as { vibe?: string; motto?: string; values?: string[] };
                                manifestoText = dna.motto || dna.vibe || "";
                            }
                            const text = manifestoText || group.description || "";
                            if (!text) return null;
                            return (
                                <div className="card" style={{ padding: 20 }}>
                                    <h3 style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        📜 Our Manifesto
                                    </h3>
                                    <p style={{
                                        fontSize: 13, lineHeight: 1.7, color: colors.textSecondary, margin: 0,
                                        fontStyle: "italic", borderLeft: `2px solid ${colors.primary}`, paddingLeft: 12,
                                        wordBreak: "break-word" as const,
                                        ...(manifestoExpanded ? {} : {
                                            display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" as any,
                                            overflow: "hidden",
                                        }),
                                    }}>
                                        {text}
                                    </p>
                                    {text.length > 150 && (
                                        <button
                                            onClick={() => setManifestoExpanded(!manifestoExpanded)}
                                            style={{
                                                background: "none", border: "none", color: colors.primary,
                                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                                                padding: "6px 0 0", marginTop: 4,
                                            }}
                                        >
                                            {manifestoExpanded ? "Show less ↑" : "Read more ↓"}
                                        </button>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Top Contributors */}
                        <div className="card" style={{ padding: 20 }}>
                            <h3 style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                🏆 Top Contributors
                            </h3>
                            {leaderboard.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {leaderboard.slice(0, 5).map((m, i) => (
                                        <Link key={m.userId} href={`/profile/${m.userId}`} style={{
                                            display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8,
                                            textDecoration: "none", color: colors.text, transition: "background 0.15s"
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.background = colors.surfaceRaised}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                        >
                                            <span style={{ fontSize: 13, width: 18 }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`}</span>
                                            <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{m.displayName}</span>
                                            <span style={{ fontSize: 11, color: colors.accent }}>🔥{m.streak}</span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", padding: 12 }}>No activity yet</p>
                            )}
                        </div>

                        {/* Core Principles */}
                        {group.rules?.length > 0 && (
                            <div className="card" style={{ padding: 20 }}>
                                <h3 style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    📋 Core Principles
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {group.rules.slice(0, 3).map((rule: string, i: number) => (
                                        <div key={i} style={{
                                            fontSize: 12, lineHeight: 1.5, color: colors.textSecondary,
                                            display: "flex", alignItems: "flex-start", gap: 8
                                        }}>
                                            <span style={{ color: colors.primary, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{rule}</span>
                                        </div>
                                    ))}
                                    {group.rules.length > 3 && (
                                        <button onClick={() => setActiveTab("rules")} style={{
                                            marginTop: 4, padding: "6px 0", background: "none", border: "none",
                                            color: colors.primary, fontSize: 11, cursor: "pointer", textAlign: "left"
                                        }}>
                                            +{group.rules.length - 3} more rules →
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}




                    </aside>
                </div>
            </main>

            <ContractModal
                isOpen={showContractModal}
                onClose={() => setShowContractModal(false)}
                onSign={handleContractSign}
                groupName={group?.name || ""}
                groupEmoji={group?.emoji || "🎯"}
                contractText={group?.contract_text || "I commit to showing up daily, supporting my fellow members, and holding myself accountable."}
                rules={group?.rules || []}
            />

            <GroupSettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                groupId={groupId}
                groupName={group?.name || ""}
                groupDescription={group?.description || ""}
                groupEmoji={group?.emoji || "🎯"}
                groupIconUrl={group?.settings?.iconUrl || group?.theme?.iconUrl}
                groupRules={group?.rules || []}
                groupManifesto={
                    typeof group?.group_dna === "string"
                        ? group.group_dna
                        : group?.group_dna?.motto || group?.group_dna?.vibe || ""
                }
                isOwner={isOwner}
                onGroupUpdated={async () => { const g = await getGroup(groupId); setGroup(g); }}
                onGroupDeleted={() => router.push("/groups")}
            />

            {/* Image Cropper Modal */}
            {showCropper && cropImage && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.9)", zIndex: 9999,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", gap: 20, padding: 20
                }}>
                    <div style={{ color: colors.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                        Adjust Image Position
                        <span style={{ fontSize: 13, fontWeight: 400, color: colors.textMuted, marginLeft: 10 }}>
                            ({currentCropIndex + 1}/{pendingImages.length})
                        </span>
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: 13, marginBottom: 10 }}>
                        Drag the image to position it within the crop area
                    </div>

                    {/* Crop Container */}
                    <div
                        ref={cropContainerRef}
                        onMouseDown={handleCropDrag}
                        style={{
                            width: 320, height: 320,
                            borderRadius: 16,
                            overflow: "hidden",
                            cursor: "move",
                            position: "relative",
                            border: `3px solid ${colors.primary}`,
                            boxShadow: "0 0 40px rgba(129, 140, 248, 0.3)"
                        }}
                    >
                        <img
                            src={cropImage}
                            alt=""
                            draggable={false}
                            style={{
                                position: "absolute",
                                width: "150%",
                                height: "150%",
                                objectFit: "cover",
                                left: `calc(50% + ${cropPosition.x}px - 75%)`,
                                top: `calc(50% + ${cropPosition.y}px - 75%)`,
                                pointerEvents: "none"
                            }}
                        />
                        {/* Crosshair overlay */}
                        <div style={{
                            position: "absolute", top: "50%", left: 0, right: 0,
                            height: 1, background: "rgba(129, 140, 248, 0.3)"
                        }} />
                        <div style={{
                            position: "absolute", left: "50%", top: 0, bottom: 0,
                            width: 1, background: "rgba(129, 140, 248, 0.3)"
                        }} />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                        <button
                            onClick={() => {
                                setShowCropper(false);
                                setCropImage(null);
                                setPendingImages([]);
                            }}
                            className="btn-ghost"
                            style={{ padding: "12px 24px", fontSize: 14 }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={skipCrop}
                            className="btn-ghost"
                            style={{ padding: "12px 24px", fontSize: 14 }}
                        >
                            Use Original
                        </button>
                        <button
                            onClick={applyCrop}
                            className="btn-primary"
                            style={{ padding: "12px 32px", fontSize: 14 }}
                        >
                            Apply Crop
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
