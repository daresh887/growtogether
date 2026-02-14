"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { colors, transitions, radii, navItems } from "@/utils/design-tokens";

// ────────────────────────────────────────
// SVG ICONS (clean, minimal, 24×24)
// ────────────────────────────────────────

const icons: Record<string, React.ReactNode> = {
    home: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" />
        </svg>
    ),
    compass: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3" />
        </svg>
    ),
    users: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
    ),
    user: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
    ),
    logout: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
};

// ────────────────────────────────────────
// NAVBAR COMPONENT
// ────────────────────────────────────────

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        if (href === "/profile") return pathname?.startsWith("/profile");
        if (href === "/settings") return pathname === "/settings";
        return pathname?.startsWith(href);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <>
            {/* ─── Desktop Side Rail ─── */}
            <nav
                style={{
                    position: "fixed",
                    left: "0",
                    top: "0",
                    bottom: "0",
                    width: "72px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "20px 0 16px",
                    background: colors.surface,
                    borderRight: `1px solid ${colors.border}`,
                    zIndex: 1000,
                }}
                className="navbar-desktop"
            >
                {/* Logo / Brand Mark */}
                <div
                    style={{
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "28px",
                        fontSize: "28px",
                    }}
                >
                    🚀
                </div>

                {/* Nav Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    width: "56px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "3px",
                                    padding: "10px 0",
                                    borderRadius: radii.md,
                                    textDecoration: "none",
                                    color: active ? colors.primary : colors.textMuted,
                                    background: active ? colors.primaryMuted : "transparent",
                                    transition: transitions.fast,
                                    position: "relative",
                                }}
                                title={item.label}
                            >
                                {icons[item.iconId]}
                                <span style={{
                                    fontSize: "10px",
                                    fontWeight: active ? 600 : 500,
                                    letterSpacing: "0.01em",
                                }}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    style={{
                        width: "56px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                        padding: "10px 0",
                        borderRadius: radii.md,
                        border: "none",
                        cursor: "pointer",
                        background: "transparent",
                        color: colors.textMuted,
                        transition: transitions.fast,
                    }}
                    title="Log Out"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = colors.danger;
                        e.currentTarget.style.background = `${colors.danger}10`;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = colors.textMuted;
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    {icons.logout}
                    <span style={{ fontSize: "10px", fontWeight: 500 }}>Log out</span>
                </button>
            </nav >

            {/* ─── Mobile Bottom Bar ─── */}
            < nav
                style={{
                    position: "fixed",
                    bottom: "0",
                    left: "0",
                    right: "0",
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
                    background: colors.surface,
                    borderTop: `1px solid ${colors.border}`,
                    zIndex: 1000,
                }
                }
                className="navbar-mobile"
            >
                {
                    navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "2px",
                                    padding: "6px 12px",
                                    borderRadius: radii.sm,
                                    textDecoration: "none",
                                    color: active ? colors.primary : colors.textMuted,
                                    background: active ? colors.primaryMuted : "transparent",
                                    transition: transitions.fast,
                                }}
                            >
                                {icons[item.iconId]}
                                <span style={{
                                    fontSize: "10px",
                                    fontWeight: active ? 600 : 500,
                                }}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })
                }

                < button
                    onClick={handleLogout}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2px",
                        padding: "6px 12px",
                        borderRadius: radii.sm,
                        border: "none",
                        cursor: "pointer",
                        background: "transparent",
                        color: colors.textMuted,
                        transition: transitions.fast,
                    }}
                    title="Log Out"
                >
                    {icons.logout}
                    < span style={{ fontSize: "10px", fontWeight: 500 }}> Log out</span >
                </button >
            </nav >

            {/* Responsive styles */}
            < style jsx global > {`
                @media (min-width: 1024px) {
                    .navbar-mobile {
                        display: none !important;
                    }
                }
                @media (max-width: 1023px) {
                    .navbar-desktop {
                        display: none !important;
                    }
                }
            `}</style >
        </>
    );
}

export default Navbar;
