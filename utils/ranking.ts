// How the feed decides what is popular right now.

/**
 * A signal is worth half as much every two days. Two days is deliberate:
 * the app's own rhythm is a daily post, so a 48-hour half-life keeps
 * yesterday's conversation alive while today's overtakes it.
 */
export const HEAT_HALF_LIFE_HOURS = 48;

/**
 * What each kind of engagement is worth before decay. Writing costs more
 * than tapping, so it counts for more. A dislike is real engagement but
 * negative sentiment, so it subtracts what a like adds.
 */
export const HEAT_WEIGHTS = {
    like: 1,
    dislike: -1,
    comment: 3,
    reply: 2,
    /** The post itself, so a fresh post with no engagement still outranks a
     *  dead one — and so the order among untouched posts is by recency. */
    post: 1,
} as const;

const HOUR_MS = 3_600_000;

/** What one signal is worth now, given when it happened. */
function decay(atIso: string, nowMs: number): number {
    const at = new Date(atIso).getTime();
    if (!Number.isFinite(at)) return 0;
    // Clamp: a timestamp from the future is worth exactly one, never more.
    const ageHours = Math.max(0, (nowMs - at) / HOUR_MS);
    return Math.pow(2, -ageHours / HEAT_HALF_LIFE_HOURS);
}

type Reaction = { value: number; createdAt: string };
type Comment = { createdAt: string; replies?: { createdAt: string }[] };

/**
 * How hot a post is right now.
 *
 * Every engagement is worth something, and what it is worth decays with the
 * age of that engagement — not the age of the post. A comment left an hour
 * ago on a week-old post is a week-old post being talked about today, and
 * ranks like it.
 *
 * Contributions are summed rather than averaged, so volume still counts:
 * ten fresh likes beat three fresh likes, and a post being argued about in
 * the replies beats one that was quietly liked at the same moment.
 *
 *   heat = Σ  weight(signal) × 2 ^ ( −age_in_hours / 48 )
 *
 * Both halves of the ask fall out of that one line: how much engagement a
 * post has, and how recently it got it.
 */
export function heatScore(
    post: { createdAt: string; reactions: Reaction[]; comments: Comment[] },
    now: number = Date.now()
): number {
    let heat = HEAT_WEIGHTS.post * decay(post.createdAt, now);

    for (const reaction of post.reactions) {
        const weight = reaction.value === 1 ? HEAT_WEIGHTS.like : HEAT_WEIGHTS.dislike;
        heat += weight * decay(reaction.createdAt, now);
    }

    for (const comment of post.comments) {
        heat += HEAT_WEIGHTS.comment * decay(comment.createdAt, now);
        for (const reply of comment.replies || []) {
            heat += HEAT_WEIGHTS.reply * decay(reply.createdAt, now);
        }
    }

    return heat;
}
