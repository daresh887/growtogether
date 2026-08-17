"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCheckin, uploadProofImage } from "@/app/actions/contracts";
import ImageCropper from "@/components/ledger/ImageCropper";

const MAX_PHOTOS = 4;

type Props = {
    contractId: string;
    // The introduction reuses this composer with its own wording.
    label?: string;
    placeholder?: string;
    submitLabel?: string;
    busyLabel?: string;
    autoFocus?: boolean;
    /** Where a filed post lands you. The composer has its own page now, and
     *  you should leave it once the post is on your profile. */
    returnTo?: string;
};

export default function CheckinComposer({
    contractId,
    label = "Post today’s proof",
    placeholder = "What did you do today? Be specific. This is your evidence.",
    submitLabel = "Post proof",
    busyLabel = "Posting…",
    autoFocus = false,
    returnTo,
}: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [content, setContent] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || images.length >= MAX_PHOTOS || uploading) return;
        setError(null);
        setPendingFile(file);
    };

    const uploadCropped = async (cropped: File) => {
        setPendingFile(null);
        setUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", cropped);
            const url = await uploadProofImage(formData);
            setImages((prev) => [...prev, url]);
        } catch (err: any) {
            setError(err?.message || "Failed to upload the photo");
        } finally {
            setUploading(false);
        }
    };

    const submit = async () => {
        if (content.trim().length < 3 || busy || uploading) return;
        setBusy(true);
        setError(null);
        try {
            await createCheckin(contractId, content.trim(), images);
            setContent("");
            setImages([]);
            if (returnTo) router.push(returnTo);
            router.refresh();
        } catch (e: any) {
            setError(e?.message || "Failed to post proof");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mb-10">
            {pendingFile && (
                <ImageCropper
                    file={pendingFile}
                    aspect={4 / 3}
                    outputWidth={1200}
                    title="Choose what stays visible"
                    onCancel={() => setPendingFile(null)}
                    onApply={uploadCropped}
                />
            )}

            <label className="block mb-4">
                <span className="overline block mb-3">{label}</span>
                <textarea
                    rows={3}
                    maxLength={2000}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className="w-full bg-transparent text-base leading-relaxed border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-2 resize-none placeholder:text-[var(--ink-soft)]"
                />
            </label>

            {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {images.map((url, i) => (
                        <div key={url} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={url}
                                alt={`Proof photo ${i + 1}`}
                                className="h-24 w-32 object-cover border border-[var(--rule)]"
                            />
                            <button
                                type="button"
                                onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                                aria-label="Remove photo"
                                className="absolute top-1 right-1 bg-[var(--ink)] text-[var(--paper)] size-5 text-xs leading-none"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <p className="text-sm mb-4" style={{ color: "var(--stamp-red)" }} role="alert">
                    {error}
                </p>
            )}

            <div className="flex items-center gap-6">
                <button
                    onClick={submit}
                    disabled={content.trim().length < 3 || busy || uploading}
                    className="btn-ink"
                >
                    {busy ? busyLabel : submitLabel}
                </button>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={images.length >= MAX_PHOTOS || uploading}
                    className="overline ink-link disabled:opacity-30"
                >
                    {uploading ? "Uploading…" : `Add a photo (${images.length}/${MAX_PHOTOS})`}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={pickPhoto}
                    className="hidden"
                />
            </div>
        </div>
    );
}
