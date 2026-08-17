"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SIG_W, SIG_H, type SignatureStrokes } from "./SignatureCanvas";

type Props = {
    strokes: SignatureStrokes;
    className?: string;
};

/**
 * Redraws a stored signature as a stroke animation when it scrolls into
 * view — the contract feels freshly signed every time someone reads it.
 * Respects prefers-reduced-motion (renders instantly).
 */
export default function SignatureReplay({ strokes, className }: Props) {
    const ref = useRef<SVGSVGElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.4 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
        if (!visible || !ref.current) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const paths = Array.from(ref.current.querySelectorAll("path"));
        let delay = 0;
        for (const path of paths) {
            const length = path.getTotalLength();
            path.style.strokeDasharray = `${length}`;
            path.style.strokeDashoffset = `${length}`;
            path.style.transition = `stroke-dashoffset ${Math.min(length / 550, 0.7)}s ease-out ${delay}s`;
            delay += Math.min(length / 550, 0.7) * 0.85;
            // Force layout so the transition runs from the offset state
            path.getBoundingClientRect();
            path.style.strokeDashoffset = "0";
        }
    }, [visible]);

    if (!strokes || strokes.length === 0) return null;

    return (
        <svg
            ref={ref}
            viewBox={`0 0 ${SIG_W} ${SIG_H}`}
            className={className}
            aria-label="Signature"
            role="img"
        >
            {strokes.map((stroke, i) => (
                <path
                    key={i}
                    d={`M ${stroke.map(([x, y]) => `${x} ${y}`).join(" L ")}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={visible ? undefined : { opacity: 0 }}
                />
            ))}
        </svg>
    );
}
