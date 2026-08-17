"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile, uploadProfileImage } from "@/app/actions/profile";
import ImageCropper from "@/components/ledger/ImageCropper";

type Props = { avatarUrl: string; bio: string };

export default function ProfileEditor({ avatarUrl, bio }: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [photo, setPhoto] = useState(avatarUrl);
    const [bioText, setBioText] = useState(bio);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                    title="Frame your face"
                    onCancel={() => setPendingFile(null)}
                    onApply={uploadCropped}
                />
            )}

            <div className="py-6 border-b border-[var(--rule)]">
                <span className="overline block mb-3">Your picture</span>
                <div className="flex items-center gap-5">
                    {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={photo}
                            alt="Your picture"
                            className="size-20 object-cover border border-[var(--rule)]"
                        />
                    ) : (
                        <div className="size-20 border border-[var(--rule)] flex items-center justify-center">
                            <span className="overline">None</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="ink-link text-sm font-medium disabled:opacity-30"
                    >
                        {uploading ? "Uploading…" : photo ? "Change your picture" : "Add a picture"}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={pickPhoto}
                        className="hidden"
                    />
                </div>
                <p className="overline mt-3">
                    The photo on your contract stays as you signed it
                </p>
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
