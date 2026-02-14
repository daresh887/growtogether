"use client";

import { useState, useEffect } from "react";
import {
    updateGroup,
    getGroupMembers,
    updateMemberRole,
    removeMember,
    transferOwnership,
    deleteGroup,
    type GroupMember,
    uploadGroupIcon
} from "@/app/actions/groups";
import { compressImage } from "@/utils/compressImage";

const colors = {
    bg: "#0A0A0B",
    surface: "#141416",
    surfaceHover: "#1A1A1E",
    border: "#2A2A2E",
    primary: "#6C5CE7",
    primaryLight: "#A29BFE",
    accent: "#00D9A5",
    accentAlt: "#FF6B6B",
    gold: "#FFD93D",
    textPrimary: "#FFFFFF",
    textSecondary: "#B8B8C0",
    textMuted: "#6B6B74",
    danger: "#E74C3C",
    dangerLight: "#FF6B6B",
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    groupDescription: string;
    groupEmoji: string;
    groupIconUrl?: string;
    groupRules: string[];
    groupManifesto?: string;
    isOwner: boolean;
    onGroupUpdated: () => void;
    onGroupDeleted: () => void;
};

export default function GroupSettingsModal({
    isOpen,
    onClose,
    groupId,
    groupName,
    groupDescription,
    groupEmoji,
    groupIconUrl,
    groupRules,
    groupManifesto = "",
    isOwner,
    onGroupUpdated,
    onGroupDeleted,
}: Props) {
    const [activeTab, setActiveTab] = useState<"edit" | "members" | "danger">("edit");
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Edit form state
    const [name, setName] = useState(groupName);
    const [description, setDescription] = useState(groupDescription);
    const [emoji, setEmoji] = useState(groupEmoji);
    const [iconUrl, setIconUrl] = useState(groupIconUrl);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [rules, setRules] = useState<string[]>(groupRules);
    const [newRule, setNewRule] = useState("");
    const [manifesto, setManifesto] = useState(groupManifesto);

    // Danger zone state
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTransferConfirm, setShowTransferConfirm] = useState(false);
    const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);

    // Emoji picker
    const commonEmojis = ["🎯", "💪", "📚", "💻", "🎨", "✍️", "🎵", "💼", "🧘", "🔥", "⚡", "🚀", "🌟", "💎", "🎮", "📈"];

    useEffect(() => {
        if (isOpen && activeTab === "members") {
            loadMembers();
        }
    }, [isOpen, activeTab, groupId]);

    useEffect(() => {
        // Reset form when modal opens
        if (isOpen) {
            setName(groupName);
            setDescription(groupDescription);
            setEmoji(groupEmoji);
            setIconUrl(groupIconUrl);
            setRules(groupRules);
            setManifesto(groupManifesto);
            setError(null);
            setSuccess(null);
        }
    }, [isOpen, groupName, groupDescription, groupEmoji, groupIconUrl, groupRules, groupManifesto]);

    const loadMembers = async () => {
        setMembersLoading(true);
        try {
            const data = await getGroupMembers(groupId);
            setMembers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setMembersLoading(false);
        }
    };

    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingIcon(true);
        try {
            // Compress image before upload
            const compressedFile = await compressImage(file, { maxWidth: 800, quality: 0.8 });

            const formData = new FormData();
            formData.append("file", compressedFile);
            const url = await uploadGroupIcon(formData);
            setIconUrl(url);
        } catch (error) {
            console.error("Upload failed", error);
            setError("Failed to upload image.");
        } finally {
            setUploadingIcon(false);
        }
    };

    const handleSaveGroup = async () => {
        setSaving(true);
        setError(null);
        try {
            const result = await updateGroup(groupId, {
                name,
                description,
                emoji: iconUrl ? "" : emoji,
                rules,
                iconUrl: iconUrl || undefined,
                groupDNA: manifesto,
            });
            console.log("Update result:", result);
            setSuccess("Group updated successfully!");
            await onGroupUpdated();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error("Failed to update group:", err);
            setError(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleModerator = async (userId: string, currentRole: string) => {
        const newRole = currentRole === "moderator" ? "member" : "moderator";
        try {
            await updateMemberRole(groupId, userId, newRole);
            setMembers(prev => prev.map(m =>
                m.userId === userId ? { ...m, role: newRole } : m
            ));
            setSuccess(`Member ${newRole === "moderator" ? "promoted to" : "demoted from"} moderator`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRemoveMember = async (userId: string, displayName: string) => {
        if (!confirm(`Remove ${displayName} from the group?`)) return;
        try {
            await removeMember(groupId, userId);
            setMembers(prev => prev.filter(m => m.userId !== userId));
            setSuccess(`${displayName} removed from the group`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleTransferOwnership = async () => {
        if (!selectedNewOwner) return;
        try {
            await transferOwnership(groupId, selectedNewOwner);
            setSuccess("Ownership transferred successfully!");
            setShowTransferConfirm(false);
            onGroupUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteGroup = async () => {
        if (deleteConfirmation !== groupName) {
            setError("Please type the group name exactly to confirm");
            return;
        }
        try {
            await deleteGroup(groupId);
            onGroupDeleted();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const addRule = () => {
        if (newRule.trim()) {
            setRules([...rules, newRule.trim()]);
            setNewRule("");
        }
    };

    const removeRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: "24px",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "600px",
                    maxHeight: "85vh",
                    background: colors.surface,
                    borderRadius: "24px",
                    border: `1px solid ${colors.border}`,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "24px",
                        borderBottom: `1px solid ${colors.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <h2 style={{ fontSize: "20px", fontWeight: 700 }}>
                        ⚙️ Group Settings
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            border: "none",
                            background: colors.bg,
                            color: colors.textMuted,
                            fontSize: "18px",
                            cursor: "pointer",
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                {isOwner && (
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            padding: "16px 24px",
                            borderBottom: `1px solid ${colors.border}`,
                        }}
                    >
                        {[
                            { id: "edit", label: "✏️ Edit Group" },
                            { id: "members", label: "👥 Members" },
                            { id: "danger", label: "⚠️ Danger Zone" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "10px",
                                    border: `1px solid ${activeTab === tab.id ? colors.primary : colors.border}`,
                                    background: activeTab === tab.id ? `${colors.primary}20` : "transparent",
                                    color: activeTab === tab.id ? colors.primaryLight : colors.textSecondary,
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
                )}

                {/* Error/Success Messages */}
                {(error || success) && (
                    <div
                        style={{
                            margin: "16px 24px",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            background: error ? `${colors.danger}20` : `${colors.accent}20`,
                            border: `1px solid ${error ? colors.danger : colors.accent}50`,
                            color: error ? colors.dangerLight : colors.accent,
                            fontSize: "14px",
                        }}
                    >
                        {error || success}
                    </div>
                )}

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "24px",
                    }}
                >
                    {/* Edit Tab */}
                    {activeTab === "edit" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Group Icon */}
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
                                    Group Icon
                                </label>
                                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                                    <button
                                        type="button"
                                        onClick={() => { setIconUrl(undefined); setEmoji(groupEmoji || "🎯"); }}
                                        style={{
                                            flex: 1,
                                            padding: "12px",
                                            borderRadius: "12px",
                                            border: `2px solid ${!iconUrl ? colors.primary : colors.border}`,
                                            background: !iconUrl ? `${colors.primary}15` : colors.bg,
                                            color: !iconUrl ? colors.primary : colors.textSecondary,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        Emoji
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setIconUrl(iconUrl || ""); setEmoji(""); }}
                                        style={{
                                            flex: 1,
                                            padding: "12px",
                                            borderRadius: "12px",
                                            border: `2px solid ${iconUrl !== undefined ? colors.primary : colors.border}`,
                                            background: iconUrl !== undefined ? `${colors.primary}15` : colors.bg,
                                            color: iconUrl !== undefined ? colors.primary : colors.textSecondary,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        Upload Image
                                    </button>
                                </div>

                                {iconUrl === undefined ? (
                                    /* Emoji Picker */
                                    <div>
                                        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
                                            Select Emoji
                                        </label>
                                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                            {commonEmojis.map((e) => (
                                                <button
                                                    key={e}
                                                    onClick={() => setEmoji(e)}
                                                    style={{
                                                        width: "48px",
                                                        height: "48px",
                                                        borderRadius: "12px",
                                                        border: `2px solid ${emoji === e ? colors.primary : colors.border}`,
                                                        background: emoji === e ? `${colors.primary}20` : colors.bg,
                                                        fontSize: "24px",
                                                        cursor: "pointer",
                                                        transition: "all 0.2s",
                                                    }}
                                                >
                                                    {e}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Image Upload */
                                    <div style={{
                                        border: `2px dashed ${colors.border}`,
                                        borderRadius: "16px",
                                        padding: "32px",
                                        textAlign: "center",
                                        background: colors.bg,
                                        position: "relative",
                                        overflow: "hidden"
                                    }}>
                                        {uploadingIcon ? (
                                            <div style={{ color: colors.textMuted }}>Uploading...</div>
                                        ) : iconUrl ? (
                                            <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto" }}>
                                                <img
                                                    src={iconUrl}
                                                    alt="Group Icon"
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        borderRadius: "16px",
                                                        border: `2px solid ${colors.border}`
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIconUrl("")}
                                                    style={{
                                                        position: "absolute",
                                                        top: -10,
                                                        right: -10,
                                                        background: colors.surface,
                                                        border: `1px solid ${colors.border}`,
                                                        borderRadius: "50%",
                                                        width: "30px",
                                                        height: "30px",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "14px"
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <label style={{ cursor: "pointer", display: "block" }}>
                                                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📷</div>
                                                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Click to upload</div>
                                                <div style={{ fontSize: "13px", color: colors.textMuted }}>JPG, PNG up to 5MB</div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: "none" }}
                                                    onChange={handleIconUpload}
                                                />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
                                    Group Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "14px 16px",
                                        background: colors.bg,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: "12px",
                                        color: colors.textPrimary,
                                        fontSize: "15px",
                                        outline: "none",
                                    }}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    placeholder="Brief description of your group..."
                                    style={{
                                        width: "100%",
                                        padding: "14px 16px",
                                        background: colors.bg,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: "12px",
                                        color: colors.textPrimary,
                                        fontSize: "15px",
                                        outline: "none",
                                        resize: "vertical",
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>

                            {/* Manifesto */}
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
                                    📜 Group Manifesto
                                    <span style={{ fontSize: "12px", color: colors.textMuted, fontWeight: 400, marginLeft: "8px" }}>
                                        Your shared vision & purpose
                                    </span>
                                </label>
                                <textarea
                                    value={manifesto}
                                    onChange={(e) => setManifesto(e.target.value)}
                                    rows={4}
                                    placeholder="Write your group's manifesto - the core beliefs, mission, and vision that unites your members. This will be displayed prominently on your group page..."
                                    style={{
                                        width: "100%",
                                        padding: "14px 16px",
                                        background: colors.bg,
                                        border: `1px solid ${colors.primary}30`,
                                        borderRadius: "12px",
                                        color: colors.textPrimary,
                                        fontSize: "15px",
                                        outline: "none",
                                        resize: "vertical",
                                        fontFamily: "inherit",
                                        lineHeight: "1.6",
                                    }}
                                />
                                <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "6px" }}>
                                    This is the centerpiece of your group page. It should inspire and align members with your group's purpose.
                                </p>
                            </div>

                            {/* Rules */}
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
                                    Group Rules
                                </label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                                    {rules.map((rule, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                padding: "10px 14px",
                                                background: colors.bg,
                                                borderRadius: "10px",
                                                border: `1px solid ${colors.border}`,
                                            }}
                                        >
                                            <span style={{ fontSize: "13px", color: colors.textMuted }}>{idx + 1}.</span>
                                            <span style={{ flex: 1, fontSize: "14px" }}>{rule}</span>
                                            <button
                                                onClick={() => removeRule(idx)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: colors.danger,
                                                    cursor: "pointer",
                                                    fontSize: "16px",
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input
                                        type="text"
                                        placeholder="Add a new rule..."
                                        value={newRule}
                                        onChange={(e) => setNewRule(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && addRule()}
                                        style={{
                                            flex: 1,
                                            padding: "12px 14px",
                                            background: colors.bg,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: "10px",
                                            color: colors.textPrimary,
                                            fontSize: "14px",
                                            outline: "none",
                                        }}
                                    />
                                    <button
                                        onClick={addRule}
                                        style={{
                                            padding: "12px 20px",
                                            borderRadius: "10px",
                                            border: "none",
                                            background: colors.primary,
                                            color: "#fff",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSaveGroup}
                                disabled={saving}
                                style={{
                                    padding: "16px",
                                    borderRadius: "14px",
                                    border: "none",
                                    background: `linear-gradient(135deg, ${colors.accent}, #00B894)`,
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: "16px",
                                    cursor: saving ? "wait" : "pointer",
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    )}

                    {/* Members Tab */}
                    {activeTab === "members" && (
                        <div>
                            {membersLoading ? (
                                <div style={{ textAlign: "center", padding: "40px", color: colors.textMuted }}>
                                    Loading members...
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {members.map((member) => (
                                        <div
                                            key={member.userId}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "14px",
                                                padding: "16px",
                                                background: colors.bg,
                                                borderRadius: "14px",
                                                border: `1px solid ${colors.border}`,
                                            }}
                                        >
                                            {/* Avatar */}
                                            <div
                                                style={{
                                                    width: "44px",
                                                    height: "44px",
                                                    borderRadius: "50%",
                                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 700,
                                                    fontSize: "16px",
                                                }}
                                            >
                                                {member.displayName.charAt(0).toUpperCase()}
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                                                    <span style={{ fontWeight: 700, fontSize: "15px" }}>{member.displayName}</span>
                                                    {member.role === "owner" && (
                                                        <span style={{
                                                            padding: "2px 8px",
                                                            background: `${colors.gold}30`,
                                                            color: colors.gold,
                                                            borderRadius: "6px",
                                                            fontSize: "10px",
                                                            fontWeight: 700,
                                                        }}>
                                                            👑 OWNER
                                                        </span>
                                                    )}
                                                    {member.role === "moderator" && (
                                                        <span style={{
                                                            padding: "2px 8px",
                                                            background: `${colors.primary}30`,
                                                            color: colors.primaryLight,
                                                            borderRadius: "6px",
                                                            fontSize: "10px",
                                                            fontWeight: 700,
                                                        }}>
                                                            🛡️ MOD
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: "12px", color: colors.textMuted }}>
                                                    🔥 {member.streak} day streak
                                                </div>
                                            </div>

                                            {/* Actions (not for owner) */}
                                            {member.role !== "owner" && (
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <button
                                                        onClick={() => handleToggleModerator(member.userId, member.role)}
                                                        style={{
                                                            padding: "8px 12px",
                                                            borderRadius: "8px",
                                                            border: `1px solid ${member.role === "moderator" ? colors.primary : colors.border}`,
                                                            background: member.role === "moderator" ? `${colors.primary}20` : "transparent",
                                                            color: member.role === "moderator" ? colors.primaryLight : colors.textSecondary,
                                                            fontSize: "12px",
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        {member.role === "moderator" ? "Remove Mod" : "Make Mod"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveMember(member.userId, member.displayName)}
                                                        style={{
                                                            padding: "8px 12px",
                                                            borderRadius: "8px",
                                                            border: `1px solid ${colors.danger}50`,
                                                            background: "transparent",
                                                            color: colors.dangerLight,
                                                            fontSize: "12px",
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {members.length === 0 && (
                                        <div style={{ textAlign: "center", padding: "40px", color: colors.textMuted }}>
                                            No members found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Danger Zone Tab */}
                    {activeTab === "danger" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            {/* Transfer Ownership */}
                            <div
                                style={{
                                    padding: "20px",
                                    background: `${colors.gold}10`,
                                    borderRadius: "14px",
                                    border: `1px solid ${colors.gold}30`,
                                }}
                            >
                                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: colors.gold }}>
                                    👑 Transfer Ownership
                                </h3>
                                <p style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "16px" }}>
                                    Transfer your ownership to another member. You will become a regular member.
                                </p>
                                {!showTransferConfirm ? (
                                    <button
                                        onClick={() => {
                                            loadMembers();
                                            setShowTransferConfirm(true);
                                        }}
                                        style={{
                                            padding: "12px 20px",
                                            borderRadius: "10px",
                                            border: `1px solid ${colors.gold}`,
                                            background: "transparent",
                                            color: colors.gold,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Transfer Ownership
                                    </button>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <select
                                            value={selectedNewOwner || ""}
                                            onChange={(e) => setSelectedNewOwner(e.target.value)}
                                            style={{
                                                padding: "12px 14px",
                                                background: colors.bg,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: "10px",
                                                color: colors.textPrimary,
                                                fontSize: "14px",
                                                outline: "none",
                                            }}
                                        >
                                            <option value="">Select new owner...</option>
                                            {members.filter(m => m.role !== "owner").map(m => (
                                                <option key={m.userId} value={m.userId}>{m.displayName}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button
                                                onClick={() => setShowTransferConfirm(false)}
                                                style={{
                                                    padding: "10px 16px",
                                                    borderRadius: "8px",
                                                    border: `1px solid ${colors.border}`,
                                                    background: "transparent",
                                                    color: colors.textSecondary,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleTransferOwnership}
                                                disabled={!selectedNewOwner}
                                                style={{
                                                    padding: "10px 16px",
                                                    borderRadius: "8px",
                                                    border: "none",
                                                    background: colors.gold,
                                                    color: colors.bg,
                                                    fontWeight: 600,
                                                    cursor: selectedNewOwner ? "pointer" : "not-allowed",
                                                    opacity: selectedNewOwner ? 1 : 0.5,
                                                }}
                                            >
                                                Confirm Transfer
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Delete Group */}
                            <div
                                style={{
                                    padding: "20px",
                                    background: `${colors.danger}10`,
                                    borderRadius: "14px",
                                    border: `1px solid ${colors.danger}30`,
                                }}
                            >
                                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: colors.dangerLight }}>
                                    🗑️ Delete Group
                                </h3>
                                <p style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "16px" }}>
                                    Permanently delete this group and all its content. This action cannot be undone.
                                </p>
                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        style={{
                                            padding: "12px 20px",
                                            borderRadius: "10px",
                                            border: `1px solid ${colors.danger}`,
                                            background: "transparent",
                                            color: colors.dangerLight,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Delete Group
                                    </button>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <p style={{ fontSize: "13px", color: colors.textMuted }}>
                                            Type <strong style={{ color: colors.dangerLight }}>{groupName}</strong> to confirm:
                                        </p>
                                        <input
                                            type="text"
                                            value={deleteConfirmation}
                                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                                            placeholder="Type group name..."
                                            style={{
                                                padding: "12px 14px",
                                                background: colors.bg,
                                                border: `1px solid ${colors.danger}50`,
                                                borderRadius: "10px",
                                                color: colors.textPrimary,
                                                fontSize: "14px",
                                                outline: "none",
                                            }}
                                        />
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button
                                                onClick={() => {
                                                    setShowDeleteConfirm(false);
                                                    setDeleteConfirmation("");
                                                }}
                                                style={{
                                                    padding: "10px 16px",
                                                    borderRadius: "8px",
                                                    border: `1px solid ${colors.border}`,
                                                    background: "transparent",
                                                    color: colors.textSecondary,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDeleteGroup}
                                                disabled={deleteConfirmation !== groupName}
                                                style={{
                                                    padding: "10px 16px",
                                                    borderRadius: "8px",
                                                    border: "none",
                                                    background: colors.danger,
                                                    color: "#fff",
                                                    fontWeight: 600,
                                                    cursor: deleteConfirmation === groupName ? "pointer" : "not-allowed",
                                                    opacity: deleteConfirmation === groupName ? 1 : 0.5,
                                                }}
                                            >
                                                Delete Forever
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
