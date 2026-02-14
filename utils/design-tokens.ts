/**
 * GrowTogether Design Tokens
 * Single source of truth for all visual properties.
 *
 * Palette rationale: warm neutrals + a vibrant teal accent.
 * Avoids the "AI dark dashboard" look (no purple/green gradient combos).
 * Feels human, editorial, and grounded.
 */

// ──────────────────────────────────────────────
// COLORS
// ──────────────────────────────────────────────

export const colors = {
    // Backgrounds
    bg: "#0C0C0E",
    surface: "#151518",
    surfaceRaised: "#1C1C20",
    surfaceHover: "#222228",

    // Borders
    border: "#2A2A30",
    borderLight: "#38383F",

    // Brand
    primary: "#3B82F6",   // a clean, trustworthy blue
    primaryHover: "#2563EB",
    primaryMuted: "#3B82F620",
    primaryLight: "#60A5FA",   // lighter blue (compat alias)
    primaryBg: "#3B82F618",   // compat alias for bg tint

    accent: "#14B8A6",   // teal — fresh, growth-oriented
    accentHover: "#0D9488",
    accentMuted: "#14B8A615",
    accentBg: "#14B8A618",

    // Semantic
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    accentAlt: "#EF4444",   // compat alias → danger

    // Text
    text: "#F1F1F4",
    textPrimary: "#F1F1F4",   // compat alias → text
    textSecondary: "#A1A1AA",
    textMuted: "#636370",

    // Misc accents
    gold: "#EAB308",
    goldMuted: "#EAB30820",
    goldBg: "#EAB30818",
    streak: "#F97316",   // orange for streak — warm, energetic
    streakMuted: "#F9731615",
} as const;

// ──────────────────────────────────────────────
// TYPOGRAPHY
// ──────────────────────────────────────────────

export const typography = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heading: {
        xl: { fontSize: "32px", fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.2 },
        lg: { fontSize: "24px", fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.25 },
        md: { fontSize: "18px", fontWeight: 600, lineHeight: 1.3 },
        sm: { fontSize: "15px", fontWeight: 600, lineHeight: 1.4 },
    },
    body: {
        md: { fontSize: "14px", lineHeight: 1.6 },
        sm: { fontSize: "13px", lineHeight: 1.5 },
    },
    label: {
        md: { fontSize: "13px", fontWeight: 600, letterSpacing: "0.02em" },
        sm: { fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const },
    },
} as const;

// ──────────────────────────────────────────────
// SPACING & LAYOUT
// ──────────────────────────────────────────────

export const spacing = {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px",
    xxxl: "48px",
} as const;

export const radii = {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    full: "9999px",
} as const;

// ──────────────────────────────────────────────
// SHADOWS
// ──────────────────────────────────────────────

export const shadows = {
    sm: "0 1px 3px rgba(0,0,0,0.3)",
    md: "0 4px 12px rgba(0,0,0,0.25)",
    lg: "0 8px 24px rgba(0,0,0,0.3)",
    glow: (color: string) => `0 4px 20px ${color}40`,
} as const;

// ──────────────────────────────────────────────
// TRANSITIONS
// ──────────────────────────────────────────────

export const transitions = {
    fast: "all 0.15s ease",
    normal: "all 0.25s ease",
    smooth: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

// ──────────────────────────────────────────────
// NAV ITEMS (used by Navbar)
// ──────────────────────────────────────────────

export const navItems = [
    { href: "/dashboard", label: "Home", iconId: "home" },
    { href: "/groups", label: "Explore", iconId: "compass" },
    { href: "/my-groups", label: "My Groups", iconId: "users" },
    { href: "/profile", label: "Profile", iconId: "user" },
    { href: "/settings", label: "Settings", iconId: "settings" },
] as const;
