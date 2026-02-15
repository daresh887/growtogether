"use client";

import { getGroup, joinGroup, leaveGroup, createPost, getGroupPosts, toggleReaction, addComment, getLeaderboard, deletePost, getGroupMembers, cheerMember, setGroupChallenge, clearGroupChallenge } from "@/app/actions/groups";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ContractModal from "@/components/ContractModal";
import GroupSettingsModal from "@/components/GroupSettingsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    Loader2,
    Heart,
    MessageCircle,
    Trash2,
    Image as ImageIcon,
    X,
    Settings,
    Crown,
    Flame,
    Trophy,
    ScrollText,
    Pin,
    ChevronDown,
    ChevronUp,
    Megaphone,
    Bold,
    Italic,
    Underline,
    List,
    Send,
    FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function getTimeLeft(endsAt: string): string {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
}

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
        setPostContent("");
        setUploadedImages([]);
        setSelectedMood(null);
        setShowMoodPicker(false);
        try {
            const result = await createPost(groupId, content, {
                images: images.length > 0 ? images : undefined,
                mood: mood || undefined,
            });
            if (result.streakCount) setUserStreakCount(result.streakCount);
            const updated = await getGroupPosts(groupId, { sortBy, timeFrame });
            setPosts(updated || []);
        } catch {
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
        const fileArray = Array.from(files).slice(0, 4 - uploadedImages.length);
        setPendingImages(fileArray);
        setCurrentCropIndex(0);
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
        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = cropPosition.x;
        const startPosY = cropPosition.y;
        const handleMove = (moveE: MouseEvent) => {
            const deltaX = moveE.clientX - startX;
            const deltaY = moveE.clientY - startY;
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
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 800;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const scale = Math.max(img.width, img.height) / 400;
            const offsetX = -cropPosition.x * scale;
            const offsetY = -cropPosition.y * scale;
            const cropSize = Math.min(img.width, img.height);
            const srcX = Math.max(0, (img.width - cropSize) / 2 + offsetX);
            const srcY = Math.max(0, (img.height - cropSize) / 2 + offsetY);
            ctx.drawImage(img, Math.max(0, srcX), Math.max(0, srcY), cropSize, cropSize, 0, 0, size, size);
            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setUploadedImages(prev => [...prev, croppedDataUrl].slice(0, 4));
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
        if (cropImage) setUploadedImages(prev => [...prev, cropImage].slice(0, 4));
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
            setToast({ message: "Cheer sent!", type: "warning" });
            const updated = await getGroupPosts(groupId, { sortBy, timeFrame });
            setPosts(updated || []);
        } catch (e: any) {
            setToast({ message: e.message || "Failed to cheer", type: "error" });
        } finally { setCheeringUser(null); }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center min-h-[80vh]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3">
                    <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
                    <h2 className="text-lg font-medium">Group not found</h2>
                    <Link href="/groups" className="text-sm text-muted-foreground hover:text-foreground">
                        ← Back to groups
                    </Link>
                </div>
            </div>
        );
    }

    const pinnedPosts = posts.filter(p => p.isPinned);
    const regularPosts = posts.filter(p => !p.isPinned);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Toast */}
            {toast && (
                <div
                    onClick={() => setToast(null)}
                    className={cn(
                        "fixed top-6 right-6 px-5 py-3.5 rounded-lg text-sm font-medium z-[1000] cursor-pointer flex items-center gap-2.5 shadow-lg",
                        toast.type === "error"
                            ? "bg-destructive/15 border border-destructive/30 text-destructive"
                            : "bg-yellow-500/15 border border-yellow-500/30 text-yellow-400"
                    )}
                >
                    {toast.type === "error" ? <X size={14} /> : <Megaphone size={14} />}
                    {toast.message}
                </div>
            )}

            <main className="max-w-5xl mx-auto px-4 py-8 pb-28 lg:pl-24">
                {/* Header Card */}
                <Card className="mb-6">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex gap-4 flex-1">
                                {/* Group Icon */}
                                <div className="w-14 h-14 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center text-2xl shrink-0">
                                    {group.settings?.iconUrl || group.theme?.iconUrl ? (
                                        <img src={group.settings?.iconUrl || group.theme?.iconUrl} alt={group.name} className="w-full h-full object-cover" />
                                    ) : (
                                        group.emoji || "🎯"
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-xl font-bold tracking-tight">{group.name}</h1>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span>{group.memberCount} members</span>
                                        <span>·</span>
                                        <span>{group.category}</span>
                                    </div>
                                    {group.description && (
                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3 break-words">
                                            {group.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {(userRole === "owner" || userRole === "moderator") && (
                                    <Button variant="outline" size="icon" onClick={() => setShowSettingsModal(true)}>
                                        <Settings size={16} />
                                    </Button>
                                )}
                                {isOwner ? (
                                    <Badge variant="secondary" className="gap-1 py-1.5 px-3">
                                        <Crown size={12} /> Owner
                                    </Badge>
                                ) : (
                                    <Button
                                        variant={isMember ? "outline" : "default"}
                                        size="sm"
                                        onClick={handleJoinToggle}
                                        disabled={joinLoading}
                                    >
                                        {joinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isMember ? "Leave" : "Join Group"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Two-Column Layout */}
                <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
                    <div>
                        {/* Tabs */}
                        <div className="flex gap-1 mb-6 bg-card rounded-lg p-1 border border-border">
                            {[
                                { id: "feed" as const, label: "Feed", icon: MessageCircle },
                                { id: "leaderboard" as const, label: "Leaderboard", icon: Trophy },
                                { id: "rules" as const, label: "Rules", icon: ScrollText },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2",
                                        activeTab === tab.id
                                            ? "bg-muted text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Feed Tab */}
                        {activeTab === "feed" && (
                            <div>
                                {/* Active Challenge */}
                                {(() => {
                                    const ch = group?.settings?.challenge;
                                    const isActive = ch && new Date(ch.endsAt) > new Date();
                                    return isActive ? (
                                        <Card className="mb-5 border-l-2 border-l-primary">
                                            <CardContent className="p-4">
                                                <div className="flex items-baseline justify-between mb-1">
                                                    <h3 className="font-semibold text-sm">{ch.title}</h3>
                                                    <span className="text-xs text-muted-foreground ml-3 whitespace-nowrap">
                                                        {getTimeLeft(ch.endsAt)}
                                                    </span>
                                                </div>
                                                {ch.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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
                                                        className="text-xs text-muted-foreground hover:text-foreground mt-2 cursor-pointer bg-transparent border-none p-0"
                                                    >
                                                        End challenge
                                                    </button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ) : isOwner && !showChallengeForm ? (
                                        <button
                                            onClick={() => setShowChallengeForm(true)}
                                            className="w-full p-3 mb-5 text-left cursor-pointer border border-border rounded-lg bg-transparent text-muted-foreground text-sm hover:border-muted-foreground/50 transition-colors"
                                        >
                                            + Set a challenge
                                        </button>
                                    ) : null;
                                })()}

                                {/* Challenge Form */}
                                {isOwner && showChallengeForm && (
                                    <Card className="mb-5">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-sm font-semibold">New challenge</p>
                                            <Input
                                                value={challengeTitle}
                                                onChange={e => setChallengeTitle(e.target.value)}
                                                placeholder="e.g. Run 50km this week"
                                                maxLength={100}
                                                autoFocus
                                            />
                                            <Textarea
                                                value={challengeDesc}
                                                onChange={e => setChallengeDesc(e.target.value)}
                                                placeholder="Add details (optional)"
                                                rows={2}
                                                maxLength={280}
                                                className="resize-none"
                                            />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-muted-foreground">Ends in</span>
                                                    {[3, 7, 14, 30].map(d => (
                                                        <button
                                                            key={d}
                                                            onClick={() => setChallengeDays(d)}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                                                                challengeDays === d
                                                                    ? "bg-muted text-foreground"
                                                                    : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            {d === 30 ? "1mo" : `${d}d`}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { setShowChallengeForm(false); setChallengeTitle(""); setChallengeDesc(""); }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
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
                                                    >
                                                        {challengeSaving ? "Saving..." : "Set"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Post Composer */}
                                {isMember && (
                                    <form onSubmit={handlePostSubmit}>
                                        <Card className="mb-5">
                                            <CardContent className="p-4">
                                                {/* Formatting Toolbar */}
                                                <div className="flex items-center gap-1 mb-3">
                                                    <button type="button" onClick={() => {
                                                        const ta = document.getElementById('post-textarea') as HTMLTextAreaElement;
                                                        const start = ta.selectionStart; const end = ta.selectionEnd;
                                                        const text = postContent; const selected = text.substring(start, end);
                                                        setPostContent(text.substring(0, start) + `**${selected}**` + text.substring(end));
                                                    }} className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer border border-border" title="Bold">
                                                        <Bold size={13} />
                                                    </button>
                                                    <button type="button" onClick={() => {
                                                        const ta = document.getElementById('post-textarea') as HTMLTextAreaElement;
                                                        const start = ta.selectionStart; const end = ta.selectionEnd;
                                                        const text = postContent; const selected = text.substring(start, end);
                                                        setPostContent(text.substring(0, start) + `*${selected}*` + text.substring(end));
                                                    }} className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer border border-border" title="Italic">
                                                        <Italic size={13} />
                                                    </button>
                                                    <button type="button" onClick={() => {
                                                        const ta = document.getElementById('post-textarea') as HTMLTextAreaElement;
                                                        const start = ta.selectionStart; const end = ta.selectionEnd;
                                                        const text = postContent; const selected = text.substring(start, end);
                                                        setPostContent(text.substring(0, start) + `__${selected}__` + text.substring(end));
                                                    }} className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer border border-border" title="Underline">
                                                        <Underline size={13} />
                                                    </button>
                                                    <Separator orientation="vertical" className="h-5 mx-1" />
                                                    <button type="button" onClick={() => {
                                                        const lines = postContent.split('\n');
                                                        const newLines = lines.map(line => line.startsWith('• ') ? line : `• ${line}`);
                                                        setPostContent(newLines.join('\n'));
                                                    }} className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer border border-border" title="Bullet List">
                                                        <List size={13} />
                                                    </button>

                                                    <div className="flex-1" />

                                                    {/* Mood Selector */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowMoodPicker(!showMoodPicker)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer border",
                                                            selectedMood
                                                                ? "border-primary/50 bg-primary/10 text-primary"
                                                                : "border-border text-muted-foreground"
                                                        )}
                                                    >
                                                        {selectedMood
                                                            ? `${MOODS.find(m => m.label === selectedMood)?.emoji} ${selectedMood}`
                                                            : "Mood"
                                                        }
                                                    </button>
                                                </div>

                                                {/* Mood Picker */}
                                                {showMoodPicker && (
                                                    <div className="flex flex-wrap gap-1.5 mb-3 p-2.5 bg-muted rounded-lg">
                                                        {MOODS.map(mood => (
                                                            <button
                                                                key={mood.label}
                                                                type="button"
                                                                onClick={() => { setSelectedMood(mood.label); setShowMoodPicker(false); }}
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer border",
                                                                    selectedMood === mood.label
                                                                        ? "border-primary/50 bg-primary/10 text-primary"
                                                                        : "border-border text-muted-foreground hover:text-foreground"
                                                                )}
                                                            >
                                                                {mood.emoji} {mood.label}
                                                            </button>
                                                        ))}
                                                        {selectedMood && (
                                                            <button
                                                                type="button"
                                                                onClick={() => { setSelectedMood(null); setShowMoodPicker(false); }}
                                                                className="px-2.5 py-1 rounded-full text-xs border border-destructive/50 text-destructive cursor-pointer"
                                                            >
                                                                <X size={10} className="inline mr-0.5" /> Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Textarea */}
                                                <Textarea
                                                    id="post-textarea"
                                                    value={postContent}
                                                    onChange={(e) => setPostContent(e.target.value)}
                                                    placeholder="Share progress, wins, struggles..."
                                                    rows={4}
                                                    className="resize-y min-h-[100px]"
                                                />

                                                {/* Hidden file input */}
                                                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />

                                                {/* Preview */}
                                                {(postContent.trim() || uploadedImages.length > 0) && (
                                                    <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-dashed border-border">
                                                        <p className="text-xs text-muted-foreground mb-2 font-medium">Preview</p>
                                                        {postContent.trim() && (
                                                            <div className="text-sm leading-relaxed text-muted-foreground mb-2 [&_strong]:font-bold [&_strong]:text-foreground">
                                                                {renderMarkdown(postContent)}
                                                            </div>
                                                        )}
                                                        {uploadedImages.length > 0 && (
                                                            <div className={cn("grid gap-2 rounded-lg overflow-hidden", uploadedImages.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                                                                {uploadedImages.map((img, i) => (
                                                                    <div key={i} className="relative" style={{ paddingTop: uploadedImages.length === 1 ? "56.25%" : "100%" }}>
                                                                        <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeImage(i)}
                                                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 text-white flex items-center justify-center cursor-pointer"
                                                                        >
                                                                            <X size={12} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action Bar */}
                                                <div className="flex items-center justify-between mt-3">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploadedImages.length >= 4 || imageUploading}
                                                    >
                                                        <ImageIcon size={14} className="mr-1" />
                                                        {imageUploading ? "Uploading..." : uploadedImages.length > 0 ? `${uploadedImages.length}/4` : "Photos"}
                                                    </Button>
                                                    <div className="flex items-center gap-3">
                                                        {userStreakCount > 0 && (
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Flame size={12} /> Day {userStreakCount}
                                                            </span>
                                                        )}
                                                        <Button
                                                            type="submit"
                                                            size="sm"
                                                            disabled={!postContent.trim() && uploadedImages.length === 0}
                                                        >
                                                            <Send size={14} className="mr-1" /> Post
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </form>
                                )}

                                {/* Sort Controls */}
                                <div className="flex justify-end gap-2 mb-4">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="px-2.5 py-1.5 rounded-md bg-card border border-border text-foreground text-xs outline-none"
                                    >
                                        <option value="recent">Most Recent</option>
                                        <option value="popular">Most Popular</option>
                                    </select>
                                    <select
                                        value={timeFrame}
                                        onChange={(e) => setTimeFrame(e.target.value as any)}
                                        className="px-2.5 py-1.5 rounded-md bg-card border border-border text-foreground text-xs outline-none"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="week">This Week</option>
                                        <option value="day">Today</option>
                                    </select>
                                </div>

                                {/* Posts */}
                                <div className="space-y-3">
                                    {[...pinnedPosts, ...regularPosts].map((post) => (
                                        <Card key={post.id} className={cn(post.isPinned && "border-primary/50")}>
                                            <CardContent className="p-5">
                                                {/* Post Header */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <Link href={`/profile/${post.userId}`} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                                        {post.userAvatar ? (
                                                            <img src={post.userAvatar} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-base">{post.userEmoji || post.userName?.charAt(0)?.toUpperCase()}</span>
                                                        )}
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Link href={`/profile/${post.userId}`} className="font-semibold text-sm hover:underline">
                                                                {post.userName}
                                                            </Link>
                                                            {post.userId === group?.created_by && (
                                                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                                                    <Crown size={9} className="mr-0.5" /> Owner
                                                                </Badge>
                                                            )}
                                                            {post.isPinned && (
                                                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                                                    <Pin size={9} className="mr-0.5" /> Pinned
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{formatTime(post.createdAt)}</span>
                                                    </div>
                                                    {(userRole === "owner" || userRole === "moderator" || post.userId === group?.currentUserId) && (
                                                        <button
                                                            onClick={() => handleDeletePost(post.id)}
                                                            className="p-1.5 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
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
                                                                <img
                                                                    src={img} alt=""
                                                                    className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                                                                    onClick={() => window.open(img, "_blank")}
                                                                />
                                                                {i === 3 && post.images.length > 4 && (
                                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xl font-semibold">
                                                                        +{post.images.length - 4}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reactions + Comments */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => handleReaction(post.id, "❤️")}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 transition-colors cursor-pointer border",
                                                            post.userReactions?.includes("❤️")
                                                                ? "border-primary/50 bg-primary/10 text-foreground"
                                                                : "border-border text-muted-foreground hover:border-muted-foreground/50"
                                                        )}
                                                    >
                                                        <Heart size={12} fill={post.userReactions?.includes("❤️") ? "currentColor" : "none"} />
                                                        {post.reactions?.["❤️"] > 0 && <span>{post.reactions["❤️"]}</span>}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const next = new Set(expandedComments);
                                                            next.has(post.id) ? next.delete(post.id) : next.add(post.id);
                                                            setExpandedComments(next);
                                                        }}
                                                        className="ml-auto px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground hover:border-muted-foreground/50 flex items-center gap-1.5 cursor-pointer transition-colors"
                                                    >
                                                        <MessageCircle size={12} /> {post.comments?.length || 0}
                                                    </button>
                                                </div>

                                                {/* Comments */}
                                                {expandedComments.has(post.id) && (
                                                    <div className="mt-4 pt-4 border-t border-border">
                                                        {post.comments?.map((c: any) => (
                                                            <div key={c.id} className="flex gap-2.5 mb-3">
                                                                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs shrink-0 overflow-hidden">
                                                                    {c.userAvatar ? (
                                                                        <img src={c.userAvatar} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-sm">{c.userEmoji || c.userName?.charAt(0)?.toUpperCase()}</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <span className="font-semibold text-xs">{c.userName}</span>
                                                                        <span className="text-xs text-muted-foreground">{formatTime(c.createdAt)}</span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground leading-relaxed">{c.content}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {isMember && (
                                                            <div className="flex gap-2 mt-3">
                                                                <Input
                                                                    placeholder="Reply..."
                                                                    value={newComment[post.id] || ""}
                                                                    onChange={(e) => setNewComment(p => ({ ...p, [post.id]: e.target.value }))}
                                                                    onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                                                                    className="text-xs h-9"
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleAddComment(post.id)}
                                                                    disabled={!newComment[post.id]?.trim()}
                                                                    className="h-9"
                                                                >
                                                                    Reply
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {posts.length === 0 && (
                                        <Card>
                                            <CardContent className="py-16 text-center">
                                                <FileText className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-3" />
                                                <p className="text-sm text-muted-foreground">
                                                    {isMember ? "Be the first to share your progress!" : "Join to start posting."}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Leaderboard Tab */}
                        {activeTab === "leaderboard" && (
                            <Card className="overflow-hidden">
                                <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
                                    <Flame size={16} className="text-muted-foreground" />
                                    <div>
                                        <h3 className="text-sm font-semibold">Streak Leaderboard</h3>
                                        <p className="text-xs text-muted-foreground">Ranked by consecutive active days</p>
                                    </div>
                                </div>
                                {leaderboard.length > 0 ? leaderboard.map((m, i) => (
                                    <Link
                                        key={m.userId}
                                        href={`/profile/${m.userId}`}
                                        className={cn(
                                            "flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/50",
                                            i < leaderboard.length - 1 && "border-b border-border"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs",
                                            i === 0 ? "bg-yellow-500/15 text-yellow-500" :
                                                i === 1 ? "bg-gray-400/15 text-gray-400" :
                                                    i === 2 ? "bg-amber-700/15 text-amber-700" :
                                                        "bg-muted text-muted-foreground"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                            {m.userAvatar ? (
                                                <img src={m.userAvatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-base">{m.userEmoji || m.displayName?.charAt(0)?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{m.displayName}</span>
                                                {m.userId === group?.created_by && (
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                                        <Crown size={9} className="mr-0.5" /> Owner
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{m.totalPosts} posts</span>
                                        </div>
                                        <Badge variant="secondary">
                                            <Flame size={10} className="mr-1" /> {m.streak}
                                        </Badge>
                                    </Link>
                                )) : (
                                    <div className="text-center py-16 text-muted-foreground">
                                        <Trophy className="mx-auto h-8 w-8 opacity-50 mb-3" />
                                        <p className="text-sm">No activity yet</p>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Rules Tab */}
                        {activeTab === "rules" && (
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="font-semibold mb-5 flex items-center gap-2">
                                        <ScrollText size={16} /> All Rules
                                    </h3>
                                    {group.rules?.length > 0 ? (
                                        <ol className="space-y-0">
                                            {group.rules.map((rule: string, i: number) => (
                                                <li key={i} className={cn(
                                                    "flex items-start gap-3 py-3",
                                                    i < group.rules.length - 1 && "border-b border-border"
                                                )}>
                                                    <span className="w-6 h-6 rounded-md bg-muted text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground leading-relaxed">{rule}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-10 text-sm">No rules defined</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-4 hidden lg:block">
                        {/* Manifesto */}
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
                                <Card>
                                    <CardContent className="p-4">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                            Our Manifesto
                                        </h3>
                                        <p className={cn(
                                            "text-xs leading-relaxed text-muted-foreground italic border-l-2 border-primary pl-3 break-words",
                                            !manifestoExpanded && "line-clamp-5"
                                        )}>
                                            {text}
                                        </p>
                                        {text.length > 150 && (
                                            <button
                                                onClick={() => setManifestoExpanded(!manifestoExpanded)}
                                                className="text-xs text-primary font-medium mt-2 cursor-pointer bg-transparent border-none p-0 flex items-center gap-1"
                                            >
                                                {manifestoExpanded ? <>Show less <ChevronUp size={12} /></> : <>Read more <ChevronDown size={12} /></>}
                                            </button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })()}

                        {/* Top Contributors */}
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                    Top Contributors
                                </h3>
                                {leaderboard.length > 0 ? (
                                    <div className="space-y-1">
                                        {leaderboard.slice(0, 5).map((m, i) => (
                                            <Link
                                                key={m.userId}
                                                href={`/profile/${m.userId}`}
                                                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                                            >
                                                <span className="text-xs w-4 text-muted-foreground">{i + 1}.</span>
                                                <span className="flex-1 text-xs font-medium truncate">{m.displayName}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                                    <Flame size={10} />{m.streak}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-3">No activity yet</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Core Principles */}
                        {group.rules?.length > 0 && (
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                        Core Principles
                                    </h3>
                                    <div className="space-y-2">
                                        {group.rules.slice(0, 3).map((rule: string, i: number) => (
                                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                                                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                                                <span className="line-clamp-2">{rule}</span>
                                            </div>
                                        ))}
                                        {group.rules.length > 3 && (
                                            <button
                                                onClick={() => setActiveTab("rules")}
                                                className="text-xs text-primary cursor-pointer bg-transparent border-none p-0 mt-1"
                                            >
                                                +{group.rules.length - 3} more rules →
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
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
                <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center flex-col gap-5 p-5">
                    <div className="text-foreground text-lg font-semibold">
                        Adjust Image Position
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({currentCropIndex + 1}/{pendingImages.length})
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Drag the image to position it within the crop area</p>

                    <div
                        ref={cropContainerRef}
                        onMouseDown={handleCropDrag}
                        className="w-80 h-80 rounded-2xl overflow-hidden cursor-move relative border-2 border-primary"
                    >
                        <img
                            src={cropImage}
                            alt=""
                            draggable={false}
                            className="absolute pointer-events-none"
                            style={{
                                width: "150%", height: "150%", objectFit: "cover",
                                left: `calc(50% + ${cropPosition.x}px - 75%)`,
                                top: `calc(50% + ${cropPosition.y}px - 75%)`,
                            }}
                        />
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/30" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/30" />
                    </div>

                    <div className="flex gap-3 mt-2">
                        <Button variant="outline" onClick={() => { setShowCropper(false); setCropImage(null); setPendingImages([]); }}>
                            Cancel
                        </Button>
                        <Button variant="outline" onClick={skipCrop}>
                            Use Original
                        </Button>
                        <Button onClick={applyCrop}>
                            Apply Crop
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
