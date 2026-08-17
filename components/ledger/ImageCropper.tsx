"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
    file: File;
    aspect: number; // width / height of the visible area
    outputWidth: number;
    title?: string;
    onCancel: () => void;
    onApply: (file: File) => void;
};

const VIEW_W = 360;

/**
 * Drag to move, zoom to choose what stays visible. Everything outside
 * the frame is cut. No dependencies: the crop is drawn to a canvas and
 * handed back as a JPEG file.
 */
export default function ImageCropper({
    file,
    aspect,
    outputWidth,
    title = "Choose what stays visible",
    onCancel,
    onApply,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const dragRef = useRef<{ x: number; y: number } | null>(null);

    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const viewH = Math.round(VIEW_W / aspect);

    // Keep the frame covered: the image can never be dragged past an edge.
    const clamp = useCallback(
        (next: { x: number; y: number }, atScale: number) => {
            const img = imgRef.current;
            if (!img) return next;
            const w = img.naturalWidth * atScale;
            const h = img.naturalHeight * atScale;
            return {
                x: Math.min(0, Math.max(VIEW_W - w, next.x)),
                y: Math.min(0, Math.max(viewH - h, next.y)),
            };
        },
        [viewH]
    );

    useEffect(() => {
        // A superseded load must not report anything: the cleanup below
        // revokes its URL, which fires onerror for an image nobody wants.
        let cancelled = false;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            if (cancelled) return;
            imgRef.current = img;
            const cover = Math.max(VIEW_W / img.naturalWidth, viewH / img.naturalHeight);
            setMinScale(cover);
            setScale(cover);
            setOffset({
                x: (VIEW_W - img.naturalWidth * cover) / 2,
                y: (viewH - img.naturalHeight * cover) / 2,
            });
            setError(null);
            setReady(true);
        };
        img.onerror = () => {
            if (!cancelled) setError("That image could not be opened");
        };
        img.src = url;
        return () => {
            cancelled = true;
            URL.revokeObjectURL(url);
        };
    }, [file, viewH]);

    // Redraw whenever the view changes
    useEffect(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !ready) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = 2;
        canvas.width = VIEW_W * dpr;
        canvas.height = viewH * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, VIEW_W, viewH);
        ctx.drawImage(
            img,
            offset.x,
            offset.y,
            img.naturalWidth * scale,
            img.naturalHeight * scale
        );
    }, [ready, scale, offset, viewH]);

    const onPointerDown = (e: React.PointerEvent) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current) return;
        setOffset(
            clamp({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }, scale)
        );
    };

    const onPointerUp = () => {
        dragRef.current = null;
    };

    const changeScale = (next: number) => {
        const img = imgRef.current;
        if (!img) return;
        const capped = Math.min(Math.max(next, minScale), minScale * 5);
        // Zoom around the centre of the frame so the subject stays put
        const cx = VIEW_W / 2;
        const cy = viewH / 2;
        const ratio = capped / scale;
        setOffset((prev) => clamp({ x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio }, capped));
        setScale(capped);
    };

    const apply = () => {
        const img = imgRef.current;
        if (!img || busy) return;
        setBusy(true);
        const outputHeight = Math.round(outputWidth / aspect);
        const canvas = document.createElement("canvas");
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setError("Could not prepare the image");
            setBusy(false);
            return;
        }
        const ratio = outputWidth / VIEW_W;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outputWidth, outputHeight);
        ctx.drawImage(
            img,
            offset.x * ratio,
            offset.y * ratio,
            img.naturalWidth * scale * ratio,
            img.naturalHeight * scale * ratio
        );
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setError("Could not prepare the image");
                    setBusy(false);
                    return;
                }
                onApply(new File([blob], "photo.jpg", { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.85
        );
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(255,255,255,0.92)" }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="w-full max-w-sm">
                <p className="overline mb-4">{title}</p>

                <div
                    className="border border-[var(--ink)] overflow-hidden touch-none select-none"
                    style={{ width: "100%", maxWidth: VIEW_W }}
                >
                    <canvas
                        ref={canvasRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onWheel={(e) => changeScale(scale * (e.deltaY < 0 ? 1.08 : 0.93))}
                        style={{
                            width: "100%",
                            height: "auto",
                            aspectRatio: `${VIEW_W} / ${viewH}`,
                            cursor: dragRef.current ? "grabbing" : "grab",
                            display: "block",
                        }}
                    />
                </div>

                <label className="block mt-5">
                    <span className="overline block mb-2">Zoom</span>
                    <input
                        type="range"
                        min={minScale}
                        max={minScale * 5}
                        step={minScale / 100}
                        value={scale}
                        onChange={(e) => changeScale(Number(e.target.value))}
                        className="w-full accent-[var(--ink)]"
                        aria-label="Zoom"
                    />
                </label>

                <p className="overline mt-2">Drag the image to reframe it</p>

                {error && (
                    <p className="text-sm mt-4" style={{ color: "var(--stamp-red)" }} role="alert">
                        {error}
                    </p>
                )}

                <div className="flex items-center gap-8 mt-8">
                    <button type="button" onClick={onCancel} className="overline ink-link">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={apply}
                        disabled={!ready || busy}
                        className="bg-[var(--ink)] text-[var(--paper)] px-7 py-3 text-sm font-medium tracking-wide disabled:opacity-25"
                    >
                        {busy ? "Cutting…" : "Use this"}
                    </button>
                </div>
            </div>
        </div>
    );
}
