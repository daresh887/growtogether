import Link from "next/link";

/** A plus. The composer's mark. */
function PlusMark() {
    return (
        <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true" fill="none">
            <path
                d="M4.5 0.5v8M0.5 4.5h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
            />
        </svg>
    );
}

/** A ledger page, three ruled lines. The feed's mark. */
function RuledMark() {
    return (
        <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true" fill="none">
            <path
                d="M0.5 1h10M0.5 4.5h10M0.5 8h6.5"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="square"
            />
        </svg>
    );
}

/**
 * The one header for all ledger pages. Two boxed controls and no more: the
 * feed you always want a way back to, and the one action the whole app is
 * for. Posting is filled because it is the thing to do; the feed is outlined
 * because it is somewhere to go. Everything else stays a quiet link.
 */
export default function LedgerHeader({
    signedIn,
    current,
}: {
    signedIn: boolean;
    /** Marks the button for the page you are already on. */
    current?: "feed" | "profile" | "settings" | "post";
}) {
    return (
        <header className="flex flex-wrap gap-y-4 items-center justify-between px-6 sm:px-10 pt-8">
            <Link href="/" className="font-semibold tracking-tight">
                LockIn Buddy
            </Link>

            <nav className="flex items-center gap-6 sm:gap-8">
                <Link
                    href="/feed"
                    aria-current={current === "feed" ? "page" : undefined}
                    className={`overline nav-button${current === "feed" ? " nav-button--current" : ""}`}
                >
                    <RuledMark />
                    The feed
                </Link>

                {signedIn ? (
                    <>
                        <Link
                            href="/post"
                            aria-current={current === "post" ? "page" : undefined}
                            className="overline nav-button nav-button--ink"
                        >
                            <PlusMark />
                            Post
                        </Link>
                        <Link
                            href="/dashboard"
                            aria-current={current === "profile" ? "page" : undefined}
                            className="overline ink-link"
                            style={current === "profile" ? { color: "var(--ink)" } : undefined}
                        >
                            Your profile
                        </Link>
                        <Link
                            href="/settings"
                            aria-current={current === "settings" ? "page" : undefined}
                            className="overline ink-link"
                            style={current === "settings" ? { color: "var(--ink)" } : undefined}
                        >
                            Settings
                        </Link>
                    </>
                ) : (
                    // One door. Signing in already routes you to the ritual if
                    // you have no contract, so a separate "Lock in" link was the
                    // same destination wearing a confusing second label.
                    <Link href="/login" className="overline ink-link">
                        Sign in
                    </Link>
                )}
            </nav>
        </header>
    );
}
