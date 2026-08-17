"use client";

import { Fragment, useSyncExternalStore } from "react";
import Link from "next/link";
import type { DeadlineState } from "@/app/actions/contracts";
import { windowWord } from "@/utils/contract-shared";

type Cell = { value: string; unit: string };

const pad = (n: number) => String(n).padStart(2, "0");

// Three cells, never more: the coarsest units that still matter.
// Seconds only appear once the last day is gone, so the clock is calm
// until it isn't.
function cells(ms: number): Cell[] {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (days > 0) {
        return [
            { value: pad(days), unit: "days" },
            { value: pad(hours), unit: "hrs" },
            { value: pad(minutes), unit: "min" },
        ];
    }
    return [
        { value: pad(hours), unit: "hrs" },
        { value: pad(minutes), unit: "min" },
        { value: pad(seconds), unit: "sec" },
    ];
}

const PLACEHOLDER: Cell[] = [
    { value: "--", unit: "hrs" },
    { value: "--", unit: "min" },
    { value: "--", unit: "sec" },
];

/* One second hand for the whole app, subscribed to rather than owned: the
   wall clock is an external system, not React state. Zero means "the clock
   has not started" — the server renders that, so hydration never disagrees
   about what time it is.

   It beats twice a second so the colons can blink on the half-second off the
   same value the digits read. Two CSS animations would each keep their own
   timeline and drift apart the moment one of them remounts. */
const BEAT = 500;

let tick = 0;
const listeners = new Set<() => void>();
let hand: ReturnType<typeof setInterval> | null = null;

function subscribeToClock(onTick: () => void) {
    listeners.add(onTick);
    if (!hand) {
        tick = Date.now();
        hand = setInterval(() => {
            tick = Date.now();
            listeners.forEach((listener) => listener());
        }, BEAT);
    }
    return () => {
        listeners.delete(onTick);
        if (listeners.size === 0 && hand) {
            clearInterval(hand);
            hand = null;
        }
    };
}

/**
 * The tape: the running clock, pinned to the top of the viewport so it is
 * never scrolled away. It never counts calendar days — a rolling contract
 * shows the time left since the last post, a counted one shows the quota for
 * the current window and how long is left to fill it.
 *
 * The hairline along the bottom edge is the window draining in real time.
 * Past the deadline the clock does not stop; it inverts and counts the
 * overdraft upward in red.
 */
export default function DeadlineBar({
    deadline,
    hideLink = false,
}: {
    deadline: DeadlineState;
    /** Set on the composer itself, where the link would point at this page. */
    hideLink?: boolean;
}) {
    const target = "deadline" in deadline ? new Date(deadline.deadline).getTime() : 0;
    const now = useSyncExternalStore(
        subscribeToClock,
        () => tick,
        () => 0
    );

    if (deadline.state === "none") return null;

    const live = now > 0;
    const remaining = live ? target - now : 0;
    const overdue = deadline.state === "due" && live && remaining <= 0;
    const urgent = deadline.state === "due" && live && remaining > 0 && remaining < 3 * 3600 * 1000;
    const owesIntro = deadline.state === "due" && deadline.intro;

    // Past zero the clock reverses: how far into the overdraft you are.
    const clock = !live ? PLACEHOLDER : cells(overdue ? -remaining : remaining);

    // The window draining. "not_started" has no window to drain, so it sits full.
    const windowMs = "windowHours" in deadline ? deadline.windowHours * 3600 * 1000 : 0;
    const drained =
        !live || !windowMs ? 1 : Math.max(0, Math.min(1, remaining / windowMs));

    // One line, and it is a count. The clock says how long is left; the count
    // says what is owed. Nothing else needs saying.
    let message: string;

    if (deadline.state === "not_started") {
        message = "Not started yet.";
    } else {
        const count = `${deadline.done}/${deadline.required} posts for this ${windowWord(
            deadline.windowHours
        )}`;
        message = overdue ? `${count} · time is up` : count;
    }

    const tone = overdue ? "tape--overdue" : urgent ? "tape--urgent" : "";

    // Both colons read one boolean, so they can only ever blink together.
    const beat = live && Math.floor(now / BEAT) % 2 === 0;

    // z-40 keeps the tape under the image cropper's z-50: the clock yields to a modal.
    return (
        <div className={`tape sticky top-0 z-40 ${tone}`}>
            {/* On a narrow screen the sentence drops to its own line so the
                clock and the way out of it always share the first one. */}
            <div className="px-6 sm:px-10 py-3 flex items-center flex-wrap gap-x-5 sm:gap-x-8 gap-y-2">
                {/* The clock. Tabular typewriter digits, so nothing shifts on the
                    tick. Every column — colons included — is the same two rows at
                    the same size, so the glyphs sit on one baseline by structure
                    rather than by nudging. */}
                <div className="order-1 flex items-start gap-2 shrink-0">
                    {clock.map((cell, i) => (
                        <Fragment key={cell.unit}>
                            {i > 0 && (
                                <span aria-hidden className="flex flex-col items-center">
                                    <span
                                        className={`tape-digits tape-colon text-[1.75rem] sm:text-[1.875rem] leading-none ${
                                            beat ? "" : "tape-colon--off"
                                        }`}
                                    >
                                        :
                                    </span>
                                    <span className="tape-unit invisible">·</span>
                                </span>
                            )}
                            <span className="flex flex-col items-center">
                                <span className="tape-digits text-[1.75rem] sm:text-[1.875rem] font-bold leading-none tabular-nums">
                                    {cell.value}
                                </span>
                                <span className="tape-unit">{cell.unit}</span>
                            </span>
                        </Fragment>
                    ))}
                </div>

                <div className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 min-w-0">
                    <p className="text-[0.9375rem] leading-snug">{message}</p>
                </div>

                {/* The way to the desk stays up even once the quota is met —
                    being clear is not a reason to hide the composer. */}
                {(deadline.state === "due" || deadline.state === "safe") && !hideLink && (
                    <Link
                        href={`/contracts/${deadline.contractId}/post`}
                        className="order-2 sm:order-3 ml-auto overline tape-label ink-link shrink-0"
                    >
                        {/* The full instruction only where there is room for it. */}
                        <span className="sm:hidden">{owesIntro ? "Introduce →" : "Post →"}</span>
                        <span className="hidden sm:inline">
                            {owesIntro ? "Write your introduction →" : "Post proof →"}
                        </span>
                    </Link>
                )}
            </div>

            {/* The window, draining. */}
            <div className="tape-rail">
                <div className="tape-meter" style={{ transform: `scaleX(${drained})` }} />
            </div>
        </div>
    );
}
