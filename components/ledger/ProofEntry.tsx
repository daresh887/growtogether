import Link from "next/link";
import type { CheckinRecord } from "@/app/actions/contracts";
import { atHandle } from "@/utils/identity";
import Avatar from "./Avatar";
import Comments from "./Comments";
import ReactionButtons from "./ReactionButtons";

type Props = {
    entry: CheckinRecord;
    canComment?: boolean;
    /** The landing's demo posts have no profile behind them, so their
     *  authors' names render as plain text instead of a dead link. */
    linkAuthor?: boolean;
};

/**
 * One post: whoever posted it, under the username and picture they chose,
 * with their commitment, what they wrote, their photos, likes and
 * comments. The feed never carries a real name — that stays sealed until
 * the contract behind the post is broken.
 */
export default function ProofEntry({ entry, canComment = false, linkAuthor = true }: Props) {
    const date = new Date(entry.createdAt).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    // Which day of their run this post is. The first post is day 1.
    const day = entry.dayNumber ?? 1;

    const handle = entry.username || "someone";

    const commitment = (entry.commitment || "").replace(/\.+$/, "");
    const shortCommitment = commitment.length > 70 ? commitment.slice(0, 69).trimEnd() + "…" : commitment;

    return (
        <li className="py-7 border-b border-[var(--rule)]">
            <div className="flex gap-4">
                <Avatar username={handle} avatarUrl={entry.avatarUrl} size={48} />

                <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-3">
                        {linkAuthor ? (
                            <Link href={`/contracts/${entry.contractId}`} className="font-semibold ink-link">
                                {atHandle(handle)}
                            </Link>
                        ) : (
                            <span className="font-semibold">{atHandle(handle)}</span>
                        )}
                        <span className="overline">{date}</span>
                        {/* How far into the contract this post is. */}
                        <span className="type-doc font-bold text-sm tabular-nums ml-auto shrink-0">
                            [DAY {day}]
                        </span>
                    </p>
                    {shortCommitment && <p className="overline mt-1">{shortCommitment}</p>}

                    <p className="mt-2 leading-relaxed whitespace-pre-wrap">{entry.content}</p>

                    {entry.images.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {entry.images.map((url) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    key={url}
                                    src={url}
                                    alt={`Photo posted by ${atHandle(handle)}`}
                                    loading="lazy"
                                    className="max-h-72 max-w-full border border-[var(--rule)]"
                                />
                            ))}
                        </div>
                    )}

                    <ReactionButtons
                        checkinId={entry.id}
                        likes={entry.likes}
                        dislikes={entry.dislikes}
                        myReaction={entry.myReaction}
                        canReact={canComment}
                    />

                    <Comments targetId={entry.id} comments={entry.comments} canComment={canComment} />
                </div>
            </div>
        </li>
    );
}
