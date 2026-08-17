"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reactToCheckin } from "@/app/actions/contracts";

type Props = {
    checkinId: string;
    likes: number;
    dislikes: number;
    myReaction: -1 | 0 | 1;
    canReact: boolean;
};

export default function ReactionButtons({ checkinId, likes, dislikes, myReaction, canReact }: Props) {
    const router = useRouter();
    const [state, setState] = useState({ likes, dislikes, myReaction });
    const [busy, setBusy] = useState(false);

    const react = async (value: -1 | 1) => {
        if (!canReact || busy) return;
        const next = state.myReaction === value ? 0 : value;

        // Optimistic counts
        setState((prev) => ({
            likes: prev.likes + (next === 1 ? 1 : 0) - (prev.myReaction === 1 ? 1 : 0),
            dislikes: prev.dislikes + (next === -1 ? 1 : 0) - (prev.myReaction === -1 ? 1 : 0),
            myReaction: next,
        }));
        setBusy(true);
        try {
            await reactToCheckin(checkinId, next);
            router.refresh();
        } catch {
            setState({ likes, dislikes, myReaction });
        } finally {
            setBusy(false);
        }
    };

    const btn = (active: boolean) =>
        `overline ${active ? "border-b border-[var(--ink)]" : canReact ? "ink-link" : ""} ${
            canReact ? "" : "cursor-default"
        }`;

    return (
        <div className="flex gap-5 mt-3">
            <button
                type="button"
                onClick={() => react(1)}
                disabled={!canReact}
                aria-pressed={state.myReaction === 1}
                aria-label="Like this post"
                className={btn(state.myReaction === 1)}
            >
                ↑ {state.likes}
            </button>
            <button
                type="button"
                onClick={() => react(-1)}
                disabled={!canReact}
                aria-pressed={state.myReaction === -1}
                aria-label="Dislike this post"
                className={btn(state.myReaction === -1)}
            >
                ↓ {state.dislikes}
            </button>
        </div>
    );
}
