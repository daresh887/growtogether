// Who you are in public, and who you are underneath.
//
// The username is the whole of your public identity: it appears on the
// feed, on your contract, and under every comment you write. The real
// name and the face you signed with stay sealed until the day you break
// the contract. Both halves are validated here so the rules read the
// same everywhere they are enforced.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** Lowercase, trimmed, and stripped of a leading @ people type by habit. */
export function normalizeUsername(raw: string): string {
    return (raw || "").trim().replace(/^@+/, "").toLowerCase();
}

// Names that would let someone impersonate the platform or squat a route.
const RESERVED = new Set([
    "admin", "administrator", "root", "system", "support", "help", "staff",
    "moderator", "mod", "official", "lockinbuddy", "lockin", "team",
    "about", "settings", "login", "signup", "signin", "logout", "feed",
    "losers", "contracts", "contract", "post", "profile", "profiles",
    "dashboard", "api", "auth", "null", "undefined", "anonymous", "someone",
    "me", "you", "new", "edit", "delete",
]);

/**
 * Returns the cleaned username, or throws with the reason it is not
 * allowed. The caller shows the message verbatim.
 */
export function validateUsername(raw: string): string {
    const username = normalizeUsername(raw);

    if (username.length === 0) throw new Error("Choose a username");
    if (username.length < USERNAME_MIN) {
        throw new Error(`Your username must be at least ${USERNAME_MIN} characters`);
    }
    if (username.length > USERNAME_MAX) {
        throw new Error(`Your username must be under ${USERNAME_MAX} characters`);
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
        throw new Error("Usernames can only use letters, numbers and underscores");
    }
    if (!/[a-z0-9]/.test(username)) {
        throw new Error("Your username needs at least one letter or number");
    }
    if (RESERVED.has(username)) {
        throw new Error("That username is reserved. Pick another one");
    }
    return username;
}

/** The real name that goes under the seal. Published only on a breach. */
export function validateRealName(raw: string): string {
    const name = (raw || "").trim().replace(/\s+/g, " ");
    if (name.length < 5 || !name.includes(" ")) {
        throw new Error("Enter your real full name, first and last");
    }
    if (name.length > 80) throw new Error("Full name must be under 80 characters");
    return name;
}

/** How a username reads wherever it is shown. */
export function atHandle(username: string): string {
    return username ? `@${username}` : "@someone";
}

/**
 * The letter shown when someone has chosen not to upload a picture.
 * Deliberately derived from the username, never from the sealed name.
 */
export function monogram(username: string): string {
    const first = (username || "").replace(/[^a-z0-9]/gi, "").charAt(0);
    return (first || "?").toUpperCase();
}
