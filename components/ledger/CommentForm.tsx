"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addComment, addWallComment } from "@/app/actions/contracts";

type Props = {
    targetId: string;
    /** Post comments go on checkins; wall comments go on a failed contract. */
    kind?: "checkin" | "wall";
    parentId?: string;
    placeholder?: string;
    onDone?: () => void;
};

export default function CommentForm({
    targetId,
    kind = "checkin",
    parentId,
    placeholder = "Comment",
    onDone,
}: Props) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (content.trim().length < 1 || busy) return;
        setBusy(true);
        setError(null);
        try {
            if (kind === "wall") await addWallComment(targetId, content.trim(), parentId);
            else await addComment(targetId, content.trim(), parentId);
            setContent("");
            onDone?.();
            router.refresh();
        } catch (e: any) {
            setError(e?.message || "Failed to comment");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-3">
            <div className="flex items-baseline gap-4">
                <input
                    type="text"
                    maxLength={500}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                    }}
                    placeholder={placeholder}
                    autoFocus={!!parentId}
                    className="flex-1 bg-transparent text-sm border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-1.5 placeholder:text-[var(--ink-soft)]"
                />
                <button
                    onClick={submit}
                    disabled={content.trim().length < 1 || busy}
                    className="overline ink-link disabled:opacity-30"
                >
                    {busy ? "Sending…" : "Send"}
                </button>
            </div>
            {error && (
                <p className="text-sm mt-2" style={{ color: "var(--stamp-red)" }} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
