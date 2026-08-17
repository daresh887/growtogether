import { monogram } from "@/utils/identity";

/**
 * Someone's picture, or the letter that stands in for it.
 *
 * Having no picture is a real choice here, not a missing value, so the
 * fallback is deliberate rather than apologetic: a monogram taken from
 * the username. It is never taken from the sealed name.
 */
export default function Avatar({
    username,
    avatarUrl,
    size = 40,
    sizeClass,
    className = "",
}: {
    username: string;
    avatarUrl?: string | null;
    /** Rendered square, in pixels. Ignored when `sizeClass` is given. */
    size?: number;
    /** Tailwind sizing instead, for avatars that change with the viewport. */
    sizeClass?: string;
    className?: string;
}) {
    // Inline width/height would beat any responsive class, so it is one or
    // the other rather than both.
    const box = sizeClass
        ? undefined
        : { width: `${size}px`, height: `${size}px` };
    const shared = `${sizeClass ?? ""} border border-[var(--rule)] shrink-0 ${className}`;

    if (avatarUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt={`@${username}`}
                style={box}
                className={`object-cover ${shared}`}
            />
        );
    }

    return (
        <span
            aria-label={`@${username}`}
            title={`@${username}`}
            style={{ ...box, fontSize: sizeClass ? undefined : Math.max(11, Math.round(size * 0.4)) }}
            className={
                "inline-flex items-center justify-center select-none " +
                "font-semibold tracking-wide text-[var(--ink-soft)] " +
                (sizeClass ? "text-2xl " : "") +
                shared
            }
        >
            {monogram(username)}
        </span>
    );
}
