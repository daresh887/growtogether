"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile, uploadProfileImage } from "@/app/actions/profile";
import { SOCIAL_PLATFORMS } from "@/utils/contract-shared";
import { atHandle } from "@/utils/identity";
import Avatar from "@/components/ledger/Avatar";
import ImageCropper from "@/components/ledger/ImageCropper";

type Props = {
    username: string;
    avatarUrl: string;
    bio: string;
    socialPlatform: string;
    socialHandle: string;
};

/**
 * Everything about you that is public. The name and face sealed against
 * your contract are not editable here, or anywhere — being unable to
 * swap them out afterwards is what makes them a stake.
 */
export default function ProfileEditor({
    username,
    avatarUrl,
    bio,
    socialPlatform,
    socialHandle,
}: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [photo, setPhoto] = useState(avatarUrl);
    const [bioText, setBioText] = useState(bio);
    const [handle, setHandle] = useState(socialHandle);
    const [platform, setPlatform] = useState(socialPlatform || SOCIAL_PLATFORMS[0].id);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingSocial, setSavingSocial] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentPlatform =
        SOCIAL_PLATFORMS.find((p) => p.id === platform) || SOCIAL_PLATFORMS[0];
    const socialChanged = handle !== socialHandle || platform !== (socialPlatform || SOCIAL_PLATFORMS[0].id);

    const saveSocial = async () => {
        if (savingSocial) return;
        setSavingSocial(true);
        setError(null);
        setSaved(false);
        try {
            await updateMyProfile({ socialPlatform: platform, socialHandle: handle });
            setSaved(true);
            router.refresh();
        } catch (err: any) {
            setError(err?.message || "Failed to save");
        } finally {
            setSavingSocial(false);
        }
    };

    const removePhoto = async () => {
        if (uploading) return;
        setUploading(true);
        setError(null);
        setSaved(false);
        try {
            await updateMyProfile({ avatarUrl: "" });
            setPhoto("");
            setSaved(true);
            router.refresh();
        } catch (err: any) {
            setError(err?.message || "Failed to remove the picture");
        } finally {
            setUploading(false);
        }
    };

    const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || uploading) return;
        setError(null);
        setPendingFile(file);
    };

    const uploadCropped = async (cropped: File) => {
        setPendingFile(null);
        setUploading(true);
        setError(null);
        setSaved(false);
        try {
            const formData = new FormData();
            formData.append("file", cropped);
            const url = await uploadProfileImage(formData);
            await updateMyProfile({ avatarUrl: url });
            setPhoto(url);
            setSaved(true);
            router.refresh();
        } catch (err: any) {
            setError(err?.message || "Failed to upload the photo");
        } finally {
            setUploading(false);
        }
    };

    const saveBio = async () => {
        if (saving) return;
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            await updateMyProfile({ bio: bioText });
            setSaved(true);
            router.refresh();
        } catch (err: any) {
            setError(err?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {pendingFile && (
                <ImageCropper
                    file={pendingFile}
                    aspect={1}
                    outputWidth={600}
                    title="Frame your picture"
                    onCancel={() => setPendingFile(null)}
                    onApply={uploadCropped}
                />
            )}

            <div className="py-6 border-b border-[var(--rule)]">
                <span className="overline block mb-3">Your username</span>
                <p className="type-doc text-lg">{atHandle(username)}</p>
                <p className="overline mt-3">
                    This is the name on everything you post
                </p>
            </div>

            <div className="py-6 border-b border-[var(--rule)]">
                <span className="overline block mb-3">Your picture</span>
                <div className="flex items-center gap-5 flex-wrap">
                    <Avatar username={username} avatarUrl={photo} size={80} />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="ink-link text-sm font-medium disabled:opacity-30"
                    >
                        {uploading ? "Working…" : photo ? "Change your picture" : "Add a picture"}
                    </button>
                    {photo && (
                        <button
                            type="button"
                            onClick={removePhoto}
                            disabled={uploading}
                            className="ink-link text-sm font-medium disabled:opacity-30"
                        >
                            Remove
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={pickPhoto}
                        className="hidden"
                    />
                </div>
                <p className="overline mt-3">
                    Optional. The face sealed against your contract is separate, and cannot be changed
                </p>
            </div>

            <div className="py-6 border-b border-[var(--rule)]">
                <span className="overline block mb-3">Where people can find you</span>
                <div className="flex items-baseline gap-4">
                    <select
                        value={platform}
                        onChange={(e) => {
                            setPlatform(e.target.value);
                            setSaved(false);
                        }}
                        aria-label="Platform"
                        className="type-doc bg-transparent border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-2 cursor-pointer"
                    >
                        {SOCIAL_PLATFORMS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                    <div className="flex items-baseline gap-1 flex-1 border-b border-[var(--rule)] focus-within:border-[var(--ink)]">
                        {currentPlatform.prefix && (
                            <span className="type-doc text-[var(--ink-soft)]">
                                {currentPlatform.prefix}
                            </span>
                        )}
                        <input
                            type="text"
                            maxLength={60}
                            value={handle}
                            onChange={(e) => {
                                setHandle(e.target.value);
                                setSaved(false);
                            }}
                            placeholder={currentPlatform.placeholder}
                            aria-label="Your handle"
                            className="type-doc flex-1 bg-transparent border-0 focus:outline-none py-2 placeholder:text-[var(--ink-soft)]"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-6 mt-4">
                    <button
                        type="button"
                        onClick={saveSocial}
                        disabled={savingSocial || !socialChanged}
                        className="bg-[var(--ink)] text-[var(--paper)] px-7 py-3 text-sm font-medium tracking-wide disabled:opacity-25"
                    >
                        {savingSocial ? "Saving…" : "Save link"}
                    </button>
                    <span className="overline">
                        Optional. Shown on your profile — clear it to remove
                    </span>
                </div>
            </div>

            <div className="py-6 border-b border-[var(--rule)]">
                <label className="block">
                    <span className="overline block mb-3">Your bio</span>
                    <textarea
                        rows={3}
                        maxLength={300}
                        value={bioText}
                        onChange={(e) => {
                            setBioText(e.target.value);
                            setSaved(false);
                        }}
                        placeholder="A line about who you are. Anyone reading your contract sees this."
                        className="type-doc w-full bg-transparent text-base leading-relaxed border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-2 resize-none placeholder:text-[var(--ink-soft)]"
                    />
                </label>
                <div className="flex items-center gap-6 mt-4">
                    <button
                        type="button"
                        onClick={saveBio}
                        disabled={saving || bioText === bio}
                        className="bg-[var(--ink)] text-[var(--paper)] px-7 py-3 text-sm font-medium tracking-wide disabled:opacity-25"
                    >
                        {saving ? "Saving…" : "Save bio"}
                    </button>
                    <span className="overline">{300 - bioText.length} left</span>
                </div>
            </div>

            {(error || saved) && (
                <p
                    className="text-sm mt-4"
                    style={error ? { color: "var(--stamp-red)" } : undefined}
                    role={error ? "alert" : "status"}
                >
                    {error || "Saved."}
                </p>
            )}
        </div>
    );
}
