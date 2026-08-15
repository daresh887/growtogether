// Shared vocabulary for the 1:1 accountability buddy feature.
// Used by onboarding, the buddy hub, and the matching engine so
// labels and ids never drift apart.

export const BUDDY_STYLES = [
    { id: "straight", emoji: "🔥", label: "Straight shooter", blurb: "Calls you out when you slack. No excuses." },
    { id: "hype", emoji: "📣", label: "Hype partner", blurb: "Celebrates every win, big or small." },
    { id: "analyst", emoji: "🧠", label: "Analytical planner", blurb: "Loves systems, metrics and weekly reviews." },
    { id: "zen", emoji: "🧘", label: "Calm & steady", blurb: "Consistent, patient, zero drama." },
] as const;

export const BUDDY_CADENCES = [
    { id: "daily", emoji: "☀️", label: "Every day", short: "Daily" },
    { id: "weekdays", emoji: "💼", label: "Weekdays", short: "Weekdays" },
    { id: "few_week", emoji: "🗓️", label: "A few times a week", short: "3x / week" },
    { id: "weekly", emoji: "📅", label: "Once a week", short: "Weekly" },
] as const;

export const BUDDY_REGIONS = [
    { id: "americas", emoji: "🌎", label: "Americas" },
    { id: "europe", emoji: "🌍", label: "Europe / Africa" },
    { id: "asia", emoji: "🌏", label: "Asia / Pacific" },
] as const;

// Mirrors the interest list used in onboarding & groups
export const BUDDY_FOCUS_AREAS = [
    { id: "fitness", emoji: "💪", label: "Fitness" },
    { id: "learning", emoji: "📚", label: "Learning" },
    { id: "coding", emoji: "💻", label: "Coding" },
    { id: "art", emoji: "🎨", label: "Art" },
    { id: "writing", emoji: "✍️", label: "Writing" },
    { id: "music", emoji: "🎵", label: "Music" },
    { id: "hustling", emoji: "🚀", label: "Hustling" },
    { id: "self-improvement", emoji: "🧘", label: "Self Improvement" },
    { id: "languages", emoji: "🌍", label: "Languages" },
    { id: "reading", emoji: "📖", label: "Reading" },
    { id: "cooking", emoji: "🍳", label: "Cooking" },
    { id: "other", emoji: "✨", label: "Other" },
] as const;

export const BUDDY_INTENSITIES = [
    { value: 1, label: "Gentle nudges" },
    { value: 2, label: "Light touch" },
    { value: 3, label: "Steady pressure" },
    { value: 4, label: "Push me hard" },
    { value: 5, label: "Full intensity" },
] as const;

export type BuddyStyleId = (typeof BUDDY_STYLES)[number]["id"];
export type BuddyCadenceId = (typeof BUDDY_CADENCES)[number]["id"];
export type BuddyRegionId = (typeof BUDDY_REGIONS)[number]["id"];

export function styleById(id: string) {
    return BUDDY_STYLES.find(s => s.id === id);
}
export function cadenceById(id: string) {
    return BUDDY_CADENCES.find(c => c.id === id);
}
export function regionById(id: string) {
    return BUDDY_REGIONS.find(r => r.id === id);
}
export function focusById(id: string) {
    return BUDDY_FOCUS_AREAS.find(f => f.id === id);
}

// Key used to hand onboarding answers to the buddy setup wizard after signup
export const ONBOARDING_PREFS_KEY = "gt_onboarding_prefs";

export type OnboardingPrefs = {
    mode: "group" | "buddy" | "both";
    buddyStyles: string[];
    cadence: string;
    interests: string[];
};
