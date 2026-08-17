"use client";

import { useState } from "react";
import type { CommentRecord } from "@/app/actions/contracts";
import CommentForm from "./CommentForm";

type Props = {
    targetId: string;
    /** Post comments go on checkins; wall comments go on a failed contract. */
    kind?: "checkin" | "wall";
    comments: CommentRecord[];
    canComment: boolean;
    placeholder?: string;
};

function CommentRow({
    comment,
    canComment,
    onReply,
}: {
    comment: CommentRecord;
    canComment: boolean;
    onReply: () => void;
}) {
    return (
        <div className="flex gap-3 mt-3 first:mt-0">
            {comment.authorPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={comment.authorPhoto}
                    alt={`Photo of ${comment.authorName}`}
                    className="size-6 object-cover border border-[var(--rule)] shrink-0 mt-0.5"
                />
            ) : (
                <div className="size-6 border border-[var(--rule)] shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <p className="text-sm leading-relaxed min-w-0">
                <span className="font-medium">{comment.authorName}</span> {comment.content}
                {canComment && (
                    <>
                        {" "}
                        <button type="button" onClick={onReply} className="overline ink-link">
                            Reply
                        </button>
                    </>
                )}
            </p>
        </div>
    );
}

export default function Comments({
    targetId,
    kind = "checkin",
    comments,
    canComment,
    placeholder = "Comment",
}: Props) {
    const [replyTo, setReplyTo] = useState<string | null>(null);

    if (comments.length === 0 && !canComment) return null;

    return (
        <div className="mt-4 border-l border-[var(--rule)] pl-4">
            {comments.map((comment) => (
                <div key={comment.id}>
                    <CommentRow
                        comment={comment}
                        canComment={canComment}
                        onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    />
                    {(comment.replies.length > 0 || replyTo === comment.id) && (
                        <div className="ml-9">
                            {comment.replies.map((reply) => (
                                <CommentRow
                                    key={reply.id}
                                    comment={reply}
                                    canComment={canComment}
                                    onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                                />
                            ))}
                            {replyTo === comment.id && (
                                <CommentForm
                                    targetId={targetId}
                                    kind={kind}
                                    parentId={comment.id}
                                    placeholder="Reply"
                                    onDone={() => setReplyTo(null)}
                                />
                            )}
                        </div>
                    )}
                </div>
            ))}
            {canComment && <CommentForm targetId={targetId} kind={kind} placeholder={placeholder} />}
        </div>
    );
}
