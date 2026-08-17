// The landing page's cast. Three people who do not exist, hardcoded so the
// front page always has something true-to-life to show — a failed contract
// with a wall, and live posts with likes and comments — no matter what is
// in the database. None of this ever appears in the real feed.
//
// Only Dereck's profile is reachable (the contract page special-cases his
// id): his failure is the landing's proof that the threat is real. The rest
// of the cast exists only as posts — their names don't link anywhere. All of
// it is read-only: you cannot comment on, react to, or post at a person who
// is not real.

import type { CheckinRecord, CommentRecord, ContractRecord } from "@/app/actions/contracts";

// Relative dates, computed at render: the landing always reads as "this
// week", never as a stale museum piece.
const daysAgo = (days: number, hours = 0) =>
    new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();

// Real signatures fill the 600x200 canvas; these sketched ones must too,
// or they render tiny next to real ones. Scales and centers into the box.
function fit(strokes: number[][][]): number[][][] {
    const xs = strokes.flat().map(([x]) => x);
    const ys = strokes.flat().map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(520 / (maxX - minX), 150 / (maxY - minY));
    const dx = (600 - (maxX - minX) * scale) / 2;
    const dy = (200 - (maxY - minY) * scale) / 2;
    return strokes.map((stroke) =>
        stroke.map(([x, y]) => [
            Math.round((x - minX) * scale + dx),
            Math.round((y - minY) * scale + dy),
        ])
    );
}

const FORFEIT =
    "my name, my face, and everything on this contract will be published on the front page. Everyone will see that I quit";

// ---------------------------------------------------------------------------
// Dereck: signed, posted three times, stopped. The failure the landing shows.
// ---------------------------------------------------------------------------

const dereck: ContractRecord = {
    id: "demo-dereck",
    userId: "demo-user-dereck",
    signerName: "Dereck Johnson",
    photoUrl: "https://i.pravatar.cc/600?img=12",
    // No social links: there is no real account they could point at.
    socialUrl: "",
    socialPlatform: "",
    socialHandle: "",
    category: "build",
    discipline: "indie hacking",
    commitment: "ship one meaningful improvement to my product every single day",
    cadence: "daily",
    proofDescription: "a screenshot of what I shipped, with a short note",
    durationDays: 30,
    endsAt: daysAgo(-21),
    forfeit: FORFEIT,
    promise:
        "I will not quit this time. I have abandoned every project I ever started and this contract is where that ends",
    status: "breached",
    effectiveAt: daysAgo(9),
    breachedAt: daysAgo(5),
    resolvedAt: null,
    createdAt: daysAgo(9),
    strokes: fit([
        [[12, 64], [34, 22], [57, 66], [80, 25], [102, 60], [124, 30]],
        [[140, 48], [210, 44], [262, 50]],
    ]),
};

const dereckWall: CommentRecord[] = [
    {
        id: "demo-wall-1",
        authorId: "demo-user-alex",
        authorName: "Pieter Hanks",
        authorPhoto: "https://i.pravatar.cc/600?img=60",
        content: 'Three days. You wrote "no excuses this time" in your bio and lasted three days.',
        createdAt: daysAgo(4),
        replies: [
            {
                id: "demo-wall-2",
                authorId: "demo-user-johan",
                authorName: "Anne Miller",
                authorPhoto: "https://i.pravatar.cc/600?img=5",
                content: "he even picked the punishment himself lmao",
                createdAt: daysAgo(4, -3),
                replies: [],
            },
        ],
    },
    {
        id: "demo-wall-3",
        authorId: "demo-user-johan",
        authorName: "Anne Miller",
        authorPhoto: "https://i.pravatar.cc/600?img=5",
        content: "The barbers deserved better, Dereck.",
        createdAt: daysAgo(2),
        replies: [],
    },
];

// ---------------------------------------------------------------------------
// Alex and Johan: alive and posting. The proof the landing shows.
// ---------------------------------------------------------------------------

const alex: ContractRecord = {
    id: "demo-alex",
    userId: "demo-user-alex",
    signerName: "Alex Hanks",
    photoUrl: "https://i.pravatar.cc/600?img=60",
    socialUrl: "https://instagram.com/alexlifts",
    socialPlatform: "instagram",
    socialHandle: "alexlifts",
    category: "train",
    discipline: "powerlifting",
    commitment: "train six days a week and log every single session until I pull 200kg",
    cadence: "daily",
    proofDescription: "a photo from the gym and the numbers I hit",
    durationDays: null,
    endsAt: null,
    forfeit: FORFEIT,
    promise: "I will show up on the days I do not feel like it, because those are the only days that count",
    status: "active",
    effectiveAt: daysAgo(6),
    breachedAt: null,
    resolvedAt: null,
    createdAt: daysAgo(6),
    strokes: fit([
        [[10, 55], [42, 18], [74, 58]],
        [[30, 42], [58, 42]],
        [[92, 20], [92, 60], [122, 60]],
    ]),
};

const johan: ContractRecord = {
    id: "demo-johan",
    userId: "demo-user-johan",
    signerName: "Anne Miller",
    photoUrl: "https://i.pravatar.cc/600?img=5",
    socialUrl: "https://x.com/johanwrites",
    socialPlatform: "x",
    socialHandle: "johanwrites",
    category: "create",
    discipline: "writing a novel",
    commitment: "write at least 500 words of my novel every single day",
    cadence: "daily",
    proofDescription: "a photo of the day's pages with the word count",
    durationDays: 90,
    endsAt: daysAgo(-86),
    forfeit: FORFEIT,
    promise: "I will finish this book even if every page fights me. Four false starts is enough",
    status: "active",
    effectiveAt: daysAgo(4),
    breachedAt: null,
    resolvedAt: null,
    createdAt: daysAgo(4),
    strokes: fit([
        [[14, 50], [14, 20], [40, 20], [40, 62], [14, 62]],
        [[60, 30], [60, 60], [86, 60], [86, 30]],
    ]),
};

// A post from one of the cast, with everything a ProofEntry renders.
function post(
    contract: ContractRecord,
    id: string,
    content: string,
    createdAt: string,
    dayNumber: number,
    extra: Partial<CheckinRecord> = {}
): CheckinRecord {
    return {
        id,
        contractId: contract.id,
        userId: contract.userId,
        content,
        images: [],
        comments: [],
        likes: 0,
        dislikes: 0,
        myReaction: 0,
        createdAt,
        heat: 0,
        dayNumber,
        signerName: contract.signerName,
        photoUrl: contract.photoUrl,
        discipline: contract.discipline,
        category: contract.category,
        commitment: contract.commitment,
        cadence: contract.cadence,
        streak: dayNumber,
        ...extra,
    };
}

const alexPosts: CheckinRecord[] = [
    post(
        alex,
        "demo-post-alex-4",
        "Bench and rows. Nothing heroic, just showed up. That's the whole point.",
        daysAgo(0, 10),
        4,
        { likes: 3 }
    ),
    post(
        alex,
        "demo-post-alex-3",
        "Deadlift day. 100kg x1, a 10kg PR. This contract thing might actually work.",
        daysAgo(3),
        3,
        {
            likes: 7,
            comments: [
                {
                    id: "demo-comment-1",
                    authorId: "demo-user-johan",
                    authorName: "David Garcia",
                    authorPhoto: "https://i.pravatar.cc/600?img=59",
                    content: "10kg PR in week one is wild. The accountability is working",
                    createdAt: daysAgo(2),
                    replies: [
                        {
                            id: "demo-comment-2",
                            authorId: "demo-user-alex",
                            authorName: "Alex Hanks",
                            authorPhoto: "https://i.pravatar.cc/600?img=60",
                            content: "knowing you all are watching is worth 10kg on its own",
                            createdAt: daysAgo(2, -1),
                            replies: [],
                        },
                    ],
                },
            ],
        }
    ),
    post(
        alex,
        "demo-post-alex-2",
        "Squats 5x5 at 140kg, then the accessory work I usually skip. All of it.",
        daysAgo(5),
        2,
        { likes: 2 }
    ),
    post(
        alex,
        "demo-post-alex-1",
        "Day 1. Alex, 24, powerlifting for three years but always skipping the boring work. Current deadlift 170kg. Target 200. Every session gets logged here.",
        daysAgo(6, -1),
        1,
        { likes: 4 }
    ),
];

const johanPosts: CheckinRecord[] = [
    post(
        johan,
        "demo-post-johan-2",
        "I wrote 640 words today. Almost gave up but got extra movivation from the community, I'm pumped to keep going!",
        daysAgo(1),
        4,
        { likes: 5 }
    ),
    post(
        johan,
        "demo-post-johan-1",
        "Day 1 of writing for my novel everyday starts NOW. I've started this novel four times in three years and never got past chapter 3. I swear I'll write every day.",
        daysAgo(4, -2),
        1,
        { likes: 2 }
    ),
];

const dereckPosts: CheckinRecord[] = [
    post(
        dereck,
        "demo-post-dereck-3",
        "Rough day. Only managed a small bugfix but it counts. Shipping is shipping.",
        daysAgo(7),
        3
    ),
    post(
        dereck,
        "demo-post-dereck-2",
        "Shipped the reminder emails. Two users asked for it, done in a day.",
        daysAgo(8),
        2
    ),
    post(
        dereck,
        "demo-post-dereck-1",
        "Day 1. I'm Dereck, building a scheduling tool for barbers. Starting from 4 paying users. If I stop shipping, you all get to watch me eat my words.",
        daysAgo(9, -2),
        1
    ),
];

// ---------------------------------------------------------------------------
// What the pages consume
// ---------------------------------------------------------------------------

/** The landing's "They gave up" entry. */
export const DEMO_GAVE_UP: ContractRecord[] = [dereck];

/** The landing's "What people are posting" list, already in display order. */
export const DEMO_LANDING_POSTS: CheckinRecord[] = [
    alexPosts[1], // the PR, with its comment thread
    johanPosts[0],
    alexPosts[0],
    johanPosts[1],
];

type DemoProfile = {
    bio: string;
    data: {
        contract: ContractRecord;
        streak: number;
        checkins: CheckinRecord[];
        isOwner: boolean;
        wallComments: CommentRecord[];
    };
};

// The demo id can never collide with a real contract: real ids are UUIDs.
const DEMO_PROFILES: Record<string, DemoProfile> = {
    "demo-dereck": {
        bio: "Building a SaaS to $10k MRR. No excuses this time.",
        data: { contract: dereck, streak: 0, checkins: dereckPosts, isOwner: false, wallComments: dereckWall },
    },
};

/** The demo profile for an id, or null if the id is a real contract's. */
export function getDemoProfile(id: string): DemoProfile | null {
    return DEMO_PROFILES[id] || null;
}
