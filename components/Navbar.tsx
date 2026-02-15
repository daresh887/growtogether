"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Home,
    Compass,
    Users,
    User,
    Settings,
    LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/groups", label: "Explore", icon: Compass },
    { href: "/my-groups", label: "My Groups", icon: Users },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
] as const;

export default function Navbar() {
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
            {/* Desktop Side Rail */}
            <nav className="fixed left-0 top-0 bottom-0 w-16 hidden lg:flex flex-col items-center py-5 bg-card border-r border-border z-50">
                {/* Brand */}
                <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center text-sm font-bold mb-6">
                    G
                </div>

                {/* Nav Items */}
                <div className="flex flex-col gap-1 flex-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={item.label}
                                className={cn(
                                    "w-12 flex flex-col items-center gap-0.5 py-2.5 rounded-md text-muted-foreground transition-colors",
                                    active && "text-foreground bg-accent"
                                )}
                            >
                                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                                <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    title="Log out"
                    className="w-12 flex flex-col items-center gap-0.5 py-2.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                    <LogOut size={18} strokeWidth={1.5} />
                    <span className="text-[10px] font-medium">Log out</span>
                </button>
            </nav>

            {/* Mobile Bottom Bar */}
            <nav className="fixed bottom-0 left-0 right-0 flex lg:hidden justify-around items-center px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] bg-card border-t border-border z-50">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-muted-foreground transition-colors",
                                active && "text-foreground bg-accent"
                            )}
                        >
                            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                            <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-muted-foreground transition-colors cursor-pointer"
                    title="Log out"
                >
                    <LogOut size={18} strokeWidth={1.5} />
                    <span className="text-[10px] font-medium">Log out</span>
                </button>
            </nav>
        </>
    );
}
