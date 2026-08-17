import { cn } from "@/lib/utils";

type StampProps = {
    children: React.ReactNode;
    tone?: "ink" | "red";
    slam?: boolean;
    rotate?: number;
    size?: "md" | "lg";
    className?: string;
};

/**
 * The status vocabulary of the entire app: IN EFFECT, HONORED, BREACHED,
 * REDEEMED, WITNESSED. Red is reserved for BREACHED. `slam` plays the
 * one orchestrated animation — use it only when a status lands, never
 * for stamps that are simply being displayed.
 */
export function Stamp({ children, tone = "ink", slam = false, rotate = -5, size = "md", className }: StampProps) {
    return (
        <span
            className={cn(
                "stamp",
                tone === "red" && "stamp--red",
                slam && "stamp--slam",
                size === "lg" && "stamp--lg",
                className
            )}
            style={{ "--stamp-rot": `${rotate}deg` } as React.CSSProperties}
        >
            {children}
        </span>
    );
}

/**
 * SVG filter that roughens stamp edges into imperfect ink.
 * Render exactly once per page that shows stamps.
 */
export function StampFilter() {
    return (
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
            <filter id="stamp-roughen">
                <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" />
            </filter>
        </svg>
    );
}
