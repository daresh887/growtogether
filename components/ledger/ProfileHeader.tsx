import { Stamp } from "./Stamp";

type Props = {
    name: string;
    avatarUrl: string;
    bio: string;
    /** "Build · dropshipping" */
    filedUnder: string;
    socialUrl: string;
    socialLabel: string;
    posts: number;
    /** Only a decided fate is stamped; a live contract shows nothing. */
    stamp: { text: string; tone: "ink" | "red" } | null;
    /** A failed signer's name is struck through in red, permanently. */
    failed?: boolean;
};

/**
 * Who this is: face, name, what they are working on, how much they have
 * posted, and their own words. The contract lives beside this, not in it,
 * and the way to the composer is on the tape at the top of the page.
 */
export default function ProfileHeader({
    name,
    avatarUrl,
    bio,
    filedUnder,
    socialUrl,
    socialLabel,
    posts,
    stamp,
    failed = false,
}: Props) {
    return (
        <header className="pb-8">
            <div className="flex items-start gap-5">
                {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={avatarUrl}
                        alt={`Photo of ${name}`}
                        className="size-20 sm:size-24 object-cover border border-[var(--rule)] shrink-0"
                    />
                ) : (
                    <div
                        className="size-20 sm:size-24 border border-[var(--rule)] shrink-0"
                        aria-hidden="true"
                    />
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                            {failed ? <span className="struck">{name}</span> : name}
                        </h1>
                        {stamp && (
                            <Stamp tone={stamp.tone} rotate={-6}>
                                {stamp.text}
                            </Stamp>
                        )}
                    </div>

                    <p className="overline mt-2">
                        {filedUnder} · {posts} {posts === 1 ? "post" : "posts"}
                    </p>

                    {socialUrl && (
                        <a
                            href={socialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="overline ink-link inline-block mt-2"
                        >
                            {socialLabel}
                        </a>
                    )}
                </div>
            </div>

            {bio && <p className="mt-6 leading-relaxed text-[var(--ink-soft)] max-w-xl">{bio}</p>}
        </header>
    );
}
