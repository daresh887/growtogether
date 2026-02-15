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
    uploadGroupIcon,
} from "@/app/actions/groups";
import { compressImage } from "@/utils/compressImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { X, Plus, Loader2, Shield, Crown, Trash2, UserMinus, Settings, Users, AlertTriangle, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [name, setName] = useState(groupName);
    const [description, setDescription] = useState(groupDescription);
    const [emoji, setEmoji] = useState(groupEmoji);
    const [iconUrl, setIconUrl] = useState<string | null | undefined>(groupIconUrl);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [rules, setRules] = useState<string[]>(groupRules);
    const [newRule, setNewRule] = useState("");
    const [manifesto, setManifesto] = useState(groupManifesto);

    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTransferConfirm, setShowTransferConfirm] = useState(false);
    const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Confirmation Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ id: string, name: string } | null>(null);

    const commonEmojis = ["🎯", "💪", "📚", "💻", "🎨", "✍️", "🎵", "💼", "🧘", "🔥", "⚡", "🚀", "🌟", "💎", "🎮", "📈"];

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (isOpen && activeTab === "members") loadMembers();
    }, [isOpen, activeTab, groupId]);

    useEffect(() => {
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
            const compressedFile = await compressImage(file, { maxWidth: 800, quality: 0.8 });
            const formData = new FormData();
            formData.append("file", compressedFile);
            const url = await uploadGroupIcon(formData);
            setIconUrl(url);
        } catch {
            setError("Failed to upload image.");
        } finally {
            setUploadingIcon(false);
        }
    };

    const handleSaveGroup = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateGroup(groupId, {
                name, description,
                emoji: iconUrl ? "" : emoji,
                rules,
                iconUrl: iconUrl || undefined,
                groupDNA: manifesto,
            });
            setSuccess("Group updated successfully!");
            await onGroupUpdated();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleModerator = async (userId: string, currentRole: string) => {
        const newRole = currentRole === "moderator" ? "member" : "moderator";
        try {
            await updateMemberRole(groupId, userId, newRole);
            setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
            setSuccess(`Member ${newRole === "moderator" ? "promoted to" : "demoted from"} moderator`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRemoveMemberClick = (userId: string, displayName: string) => {
        setMemberToRemove({ id: userId, name: displayName });
        setConfirmOpen(true);
    };

    const handleConfirmRemoveMember = async () => {
        if (!memberToRemove) return;
        try {
            await removeMember(groupId, memberToRemove.id);
            setMembers(prev => prev.filter(m => m.userId !== memberToRemove.id));
            setSuccess(`Removed ${memberToRemove.name} from the group`);
            setTimeout(() => setSuccess(null), 3000);
            setConfirmOpen(false); // Close dialog
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
            setLoading(true);
            await deleteGroup(groupId);
            onGroupDeleted();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addRule = () => {
        if (newRule.trim()) { setRules([...rules, newRule.trim()]); setNewRule(""); }
    };

    const removeRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    const isAdmin = members.find(m => m.userId === currentUserId)?.role === "owner" || members.find(m => m.userId === currentUserId)?.role === "moderator";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Group Settings</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="edit">General</TabsTrigger>
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="danger">Danger Zone</TabsTrigger>
                    </TabsList>

                    <TabsContent value="edit" className="space-y-4">
                        <div className="space-y-5">
                            {/* Group Icon */}
                            <div>
                                <Label className="mb-3 block">Group Icon</Label>
                                <div className="flex gap-2 mb-4">
                                    <Button
                                        type="button"
                                        variant={!iconUrl ? "default" : "outline"}
                                        size="sm" className="flex-1"
                                        onClick={() => { setIconUrl(undefined); setEmoji(groupEmoji || "🎯"); }}
                                    >
                                        Emoji
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={iconUrl !== undefined ? "default" : "outline"}
                                        size="sm" className="flex-1"
                                        onClick={() => { setIconUrl(iconUrl || ""); setEmoji(""); }}
                                    >
                                        Upload Image
                                    </Button>
                                </div>

                                {iconUrl === undefined ? (
                                    <div>
                                        <Label className="mb-2 block text-sm">Select Emoji</Label>
                                        <div className="flex gap-2 flex-wrap">
                                            {commonEmojis.map(e => (
                                                <button
                                                    key={e}
                                                    onClick={() => setEmoji(e)}
                                                    className={cn(
                                                        "w-12 h-12 rounded-xl border-2 text-2xl flex items-center justify-center cursor-pointer transition-all",
                                                        emoji === e ? "border-primary bg-primary/10 scale-110" : "border-border hover:border-muted-foreground/50"
                                                    )}
                                                >
                                                    {e}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-muted/50 relative">
                                        {uploadingIcon ? (
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" /> Uploading...
                                            </div>
                                        ) : iconUrl ? (
                                            <div className="relative w-28 h-28 mx-auto">
                                                <img src={iconUrl} alt="Group Icon" className="w-full h-full object-cover rounded-2xl border-2 border-border" />
                                                <button
                                                    type="button"
                                                    onClick={() => setIconUrl("")}
                                                    className="absolute -top-2 -right-2 w-7 h-7 bg-background border border-border rounded-full flex items-center justify-center cursor-pointer hover:bg-muted"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer block">
                                                <div className="text-4xl mb-3">📷</div>
                                                <div className="font-semibold mb-1">Click to upload</div>
                                                <div className="text-xs text-muted-foreground">JPG, PNG up to 5MB</div>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div>
                                <Label htmlFor="group-name" className="mb-2 block">Group Name</Label>
                                <Input id="group-name" value={name} onChange={e => setName(e.target.value)} />
                            </div>

                            {/* Description */}
                            <div>
                                <Label htmlFor="group-desc" className="mb-2 block">Description</Label>
                                <Textarea id="group-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description of your group..." />
                            </div>

                            {/* Manifesto */}
                            <div>
                                <Label htmlFor="group-manifesto" className="mb-2 block">
                                    📜 Group Manifesto
                                    <span className="text-xs text-muted-foreground font-normal ml-2">Your shared vision & purpose</span>
                                </Label>
                                <Textarea
                                    id="group-manifesto"
                                    value={manifesto}
                                    onChange={e => setManifesto(e.target.value)}
                                    rows={4}
                                    placeholder="Write your group's manifesto - the core beliefs, mission, and vision that unites your members..."
                                    className="leading-relaxed"
                                />
                                <p className="text-xs text-muted-foreground mt-1.5">This is the centerpiece of your group page.</p>
                            </div>

                            {/* Rules */}
                            <div>
                                <Label className="mb-2 block">Group Rules</Label>
                                <div className="space-y-2 mb-3">
                                    {rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                                            <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                                            <span className="flex-1 text-sm">{rule}</span>
                                            <button onClick={() => removeRule(idx)} className="text-destructive cursor-pointer hover:text-destructive/80">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add a new rule..."
                                        value={newRule}
                                        onChange={e => setNewRule(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && addRule()}
                                        className="flex-1"
                                    />
                                    <Button onClick={addRule} size="sm"><Plus size={14} className="mr-1" /> Add</Button>
                                </div>
                            </div>

                            <Separator />

                            {/* Save Button */}
                            <Button onClick={handleSaveGroup} disabled={saving} className="w-full">
                                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="members" className="space-y-4">
                        <div className="space-y-4">
                            {membersLoading ? (
                                <div className="text-center py-10 text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" /> Loading members...
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {members.map(member => (
                                        <div key={member.userId} className="flex items-center gap-3 p-4 bg-muted rounded-xl border border-border">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-primary-foreground">
                                                {member.avatarUrl ? (
                                                    <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover rounded-full" />
                                                ) : (
                                                    member.displayName.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-sm truncate">{member.displayName}</span>
                                                    {member.role === "owner" && <Badge variant="secondary" className="text-yellow-500 text-[10px]"><Crown size={10} className="mr-0.5" /> OWNER</Badge>}
                                                    {member.role === "moderator" && <Badge variant="secondary" className="text-primary text-[10px]"><Shield size={10} className="mr-0.5" /> MOD</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground">🔥 {member.streak} day streak</div>
                                            </div>
                                            {member.role !== "owner" && isAdmin && member.userId !== currentUserId && (
                                                <div className="flex gap-1.5 shrink-0">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreVertical size={16} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleToggleModerator(member.userId, member.role)}>
                                                                {member.role === "moderator" ? "Demote to Member" : "Promote to Moderator"}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleRemoveMemberClick(member.userId, member.displayName)}
                                                            >
                                                                Remove from Group
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {members.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground">No members found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="danger" className="space-y-6">
                        {/* Transfer Ownership */}
                        <div className="p-5 bg-yellow-500/5 rounded-xl border border-yellow-500/20">
                            <h3 className="font-bold mb-2 text-yellow-500 flex items-center gap-2"><Crown size={16} /> Transfer Ownership</h3>
                            <p className="text-sm text-muted-foreground mb-4">Transfer your ownership to another member. You will become a regular member.</p>
                            {!showTransferConfirm ? (
                                <Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10" onClick={() => { loadMembers(); setShowTransferConfirm(true); }}>
                                    Transfer Ownership
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <select
                                        value={selectedNewOwner || ""}
                                        onChange={e => setSelectedNewOwner(e.target.value)}
                                        className="w-full p-3 bg-background border border-border rounded-lg text-sm"
                                    >
                                        <option value="">Select new owner...</option>
                                        {members.filter(m => m.role !== "owner").map(m => (
                                            <option key={m.userId} value={m.userId}>{m.displayName}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setShowTransferConfirm(false)}>Cancel</Button>
                                        <Button size="sm" className="bg-yellow-500 text-black hover:bg-yellow-600" onClick={handleTransferOwnership} disabled={!selectedNewOwner}>
                                            Confirm Transfer
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Delete Group */}
                        <div className="p-5 bg-destructive/5 rounded-xl border border-destructive/20">
                            <h3 className="font-bold mb-2 text-destructive flex items-center gap-2"><Trash2 size={16} /> Delete Group</h3>
                            <p className="text-sm text-muted-foreground mb-4">Permanently delete this group and all its content. This action cannot be undone.</p>
                            {!showDeleteConfirm ? (
                                <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)}>
                                    Delete Group
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Type <strong className="text-destructive">{groupName}</strong> to confirm:
                                    </p>
                                    <Input
                                        value={deleteConfirmation}
                                        onChange={e => setDeleteConfirmation(e.target.value)}
                                        placeholder="Type group name..."
                                        className="border-destructive/30"
                                    />
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmation(""); }}>Cancel</Button>
                                        <Button variant="destructive" size="sm" onClick={handleDeleteGroup} disabled={deleteConfirmation !== groupName}>
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Forever"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mt-2">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="text-sm text-green-500 bg-green-500/10 p-3 rounded-md mt-2">
                        {success}
                    </div>
                )}
            </DialogContent>

            <ConfirmationDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Remove Member"
                description={`Are you sure you want to remove ${memberToRemove?.name} from the group?`}
                confirmText="Remove"
                variant="destructive"
                onConfirm={handleConfirmRemoveMember}
            />
        </Dialog>
    );
}
