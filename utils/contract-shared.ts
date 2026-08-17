// Shared between the signing ritual, the wall, and the server actions.

// The registers — curated by the platform, never user-created.
// A discipline (free text on the contract) narrows the filing;
// disciplines with real density get promoted to registers later.
// The slugs are what the database stores and what the feed's ?c= reads, so
// they stay put. Only the names people see are written here.
export type CategorySlug = "build" | "train" | "learn" | "create" | "discipline";

export type Category = {
    slug: CategorySlug;
    name: string;
    /** What the register is for, in one sentence. */
    description: string;
    /** What actually gets filed here. Kept lowercase so it reads as a list. */
    examples: string[];
    /** How the commitment step asks for terms once this register is chosen.
     *  Generic advice is easy to nod along to; naming the units of the work
     *  is what stops someone writing "get fit" and calling it a contract. */
    prompt: {
        heading: string;
        guidance: string;
        /** Completes "I will …" */
        commitment: string;
        /** Completes "I will post …" */
        proof: string;
    };
};

export const CATEGORIES: Category[] = [
    {
        slug: "build",
        name: "Building",
        description: "For people building a business.",
        examples: ["indie hacking", "ecommerce", "dropshipping", "app building"],
        prompt: {
        heading: "State your commitment.",
        guidance:
            "Be specific. Vague promises are easy to break.",
        commitment: "ship one meaningful improvement to my product",
        proof: "a screenshot of what I shipped, with a short note",
        },
    },
    {
        slug: "train",
        name: "Training",
        description: "For people training their body.",
        examples: ["the gym", "running", "sport", "cutting weight"],
        prompt: {
        heading: "State your commitment.",
        guidance:
            "Be specific. Vague promises are easy to break.",
        commitment: "train for 60 minutes and log every set",
        proof: "a photo from the gym and the numbers I hit",
        },
    },
    {
        slug: "learn",
        name: "Learning",
        description: "For people studying.",
        examples: ["school", "languages", "exams", "a new skill"],
        prompt: {
        heading: "State your commitment.",
        guidance:
            "Be specific. Vague promises are easy to break.",
        commitment: "study for 90 minutes with my phone in another room",
        proof: "a photo of the book I used to study and what I learned",
        },
    },
    {
        slug: "create",
        name: "Creating",
        description: "For people making things.",
        examples: ["art", "music", "writing", "video"],
        prompt: {
        heading: "State your commitment.",
        guidance:
            "Be specific. Vague promises are easy to break.",
        commitment: "write 500 words of the new chapter",
        proof: "a photo of what I made today, finished or not",
        },
    },
    {
        slug: "discipline",
        name: "Discipline",
        description: "For people fixing habits.",
        examples: ["waking early", "quitting vices", "staying consistent"],
        prompt: {
        heading: "State your commitment.",
        guidance:
            "Be specific. Vague promises are easy to break.",
        commitment: "be out of bed by 5:30 with no snooze",
        proof: "a timestamped photo taken the minute I was up",
        },
    },
];

export function categorySpec(slug: string): Category | undefined {
    return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryName(slug: string): string {
    return categorySpec(slug)?.name || slug;
}

/** How the commitment step should read for a register. */
export function commitmentPrompt(slug: string): Category["prompt"] {
    return (
        categorySpec(slug)?.prompt || {
            heading: "State your commitment.",
            guidance:
                "Say exactly what you will do. Be specific. Vague promises are easy to break.",
            commitment: "ship one meaningful improvement to my product",
            proof: "a screenshot of what I shipped, with a short note",
        }
    );
}

/** "For people building a business. Indie hacking, ecommerce, dropshipping." */
export function categoryBlurb(slug: string): string {
    const category = categorySpec(slug);
    if (!category) return "";
    const list = category.examples.join(", ");
    return `${category.description} ${list.charAt(0).toUpperCase()}${list.slice(1)}.`;
}

// How a filing reads on the record: "Build · dropshipping"
export function filedUnder(category: string, discipline: string): string {
    return discipline ? `${categoryName(category)} · ${discipline}` : categoryName(category);
}

export type Cadence = "daily" | "weekdays" | "three_per_week" | "weekly";

/**
 * A cadence is a window and a quota, never a calendar.
 *
 * `windowHours` is how long the window lasts, `required` is how many posts
 * it demands. `rolling` windows restart from your last post — a daily
 * contract gives you 24 hours from signing, then 24 hours from every post
 * after that. Fixed windows run back-to-back from the moment you signed,
 * so a 3× a week contract shows 1/3 done and one week on the clock.
 */
export const CADENCES: {
    value: Cadence;
    label: string;
    phrase: string;
    windowHours: number;
    required: number;
    rolling: boolean;
}[] = [
    {
        value: "daily",
        label: "Every 24 hours",
        phrase: "at least once every 24 hours",
        windowHours: 24,
        required: 1,
        rolling: true,
    },
    {
        value: "weekdays",
        label: "5× a week",
        phrase: "at least five times each week",
        windowHours: 168,
        required: 5,
        rolling: false,
    },
    {
        value: "three_per_week",
        label: "3× a week",
        phrase: "at least three times each week",
        windowHours: 168,
        required: 3,
        rolling: false,
    },
    {
        value: "weekly",
        label: "Every week",
        phrase: "at least once each week",
        windowHours: 168,
        required: 1,
        rolling: false,
    },
];

export function cadenceSpec(cadence: string) {
    return CADENCES.find((c) => c.value === cadence) || CADENCES[0];
}

export function cadencePhrase(cadence: string): string {
    return cadenceSpec(cadence).phrase;
}

// How a window is named in a countdown: "this week", "these 24 hours".
export function windowNoun(windowHours: number): string {
    return windowHours === 168 ? "this week" : `these ${windowHours} hours`;
}

// How a window is named after a count: "2/3 posts for this week".
export function windowWord(windowHours: number): string {
    return windowHours === 168 ? "week" : "day";
}

// Where to find the signer. Structured so the record can show
// "X @darius" instead of a pasted URL.
export type SocialPlatform = {
    id: string;
    label: string;
    prefix: string; // shown before the handle, e.g. "@"
    base: string; // "" means the handle is itself a URL
    placeholder: string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
    { id: "x", label: "X", prefix: "@", base: "https://x.com/", placeholder: "yourhandle" },
    { id: "instagram", label: "Instagram", prefix: "@", base: "https://instagram.com/", placeholder: "yourhandle" },
    { id: "linkedin", label: "LinkedIn", prefix: "in/", base: "https://linkedin.com/in/", placeholder: "your-profile" },
    { id: "tiktok", label: "TikTok", prefix: "@", base: "https://tiktok.com/@", placeholder: "yourhandle" },
    { id: "youtube", label: "YouTube", prefix: "@", base: "https://youtube.com/@", placeholder: "yourchannel" },
    { id: "github", label: "GitHub", prefix: "", base: "https://github.com/", placeholder: "yourusername" },
    { id: "website", label: "Website", prefix: "", base: "", placeholder: "yoursite.com" },
];

export function socialPlatform(id: string): SocialPlatform | undefined {
    return SOCIAL_PLATFORMS.find((p) => p.id === id);
}

// Strips what people paste out of habit: @, full URLs, trailing slashes.
export function cleanHandle(platformId: string, raw: string): string {
    let handle = (raw || "").trim().replace(/^@+/, "").replace(/\/+$/, "");
    if (platformId === "website") return handle.replace(/^https?:\/\//, "");
    const platform = socialPlatform(platformId);
    if (platform?.base) {
        const bare = platform.base.replace(/^https?:\/\//, "").replace(/@$/, "");
        handle = handle.replace(/^https?:\/\//, "");
        if (handle.toLowerCase().startsWith(bare.toLowerCase())) {
            handle = handle.slice(bare.length).replace(/^@+/, "");
        }
    }
    return handle.split(/[/?#]/)[0];
}

export function socialUrl(platformId: string, handle: string): string {
    const platform = socialPlatform(platformId);
    if (!platform) return "";
    if (!platform.base) return `https://${handle}`;
    return `${platform.base}${handle}`;
}

// How a link reads on the record: "X @darius", "Website darius.com"
export function socialLabel(platformId: string, handle: string, fallbackUrl: string): string {
    const platform = socialPlatform(platformId);
    if (!platform || !handle) return fallbackUrl.replace(/^https?:\/\//, "");
    return `${platform.label} ${platform.prefix}${handle}`;
}

// How long the contract holds you. null means lifetime.
// One month is the floor: anything shorter is not a commitment.
export const MIN_DURATION_DAYS = 30;
export const MAX_DURATION_DAYS = 3650;

export const DURATIONS: { days: number | null; label: string }[] = [
    { days: 30, label: "1 month" },
    { days: 90, label: "3 months" },
    { days: 180, label: "6 months" },
    { days: 365, label: "1 year" },
    { days: null, label: "Lifetime" },
];

// Reads inside the contract: "for one month", "for 45 days", "for life".
export function durationPhrase(days: number | null): string {
    if (days === null) return "for life";
    if (days === 30) return "for one month";
    if (days === 90) return "for three months";
    if (days === 180) return "for six months";
    if (days === 365) return "for one year";
    return `for ${days} days`;
}

// The punishment. One for everyone, not optional, acknowledged at lock-in.
// Completes the sentence "If I break this contract, …".
export const STANDARD_PENALTY =
    "the seal comes off — my real name, my face and my signature are published on the front page of LockIn Buddy, under the username everybody already knows. Everyone will see that I quit";

// What gets published on a breach, shown at lock-in as § clauses.
export const PUNISHMENT_TERMS = [
    "Until you fail you are only your username. Nobody can see your real name or your face — not us on the page, not anyone reading the database.",
    "Break the contract and the seal comes off: the real name and the photo you signed with go on the front page.",
    "Your signature is published with them, next to the commitment you made.",
    "It stays attached to the username people watched you post under, so everyone knows exactly who quit.",
];

export type ContractStatus = "active" | "breached" | "honored" | "redeemed" | "void";

// How each status renders as a stamp. Red is reserved for BREACHED.
export function stampFor(status: ContractStatus, effectiveAt: string): { text: string; tone: "ink" | "red" } {
    switch (status) {
        case "breached":
            return { text: "Failed", tone: "red" };
        case "honored":
            return { text: "Completed", tone: "ink" };
        case "redeemed":
            return { text: "Redeemed", tone: "ink" };
        case "void":
            return { text: "Void", tone: "ink" };
        default:
            return new Date(effectiveAt) > new Date()
                ? { text: "Locked in", tone: "ink" }
                : { text: "In effect", tone: "ink" };
    }
}
