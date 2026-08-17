"use client";

import { useRef, useState, useCallback } from "react";

// Strokes are stored in a fixed 600×200 coordinate space so a signature
// can be redrawn identically anywhere (see SignatureReplay).
export const SIG_W = 600;
export const SIG_H = 200;

export type SignatureStrokes = number[][][]; // strokes → points → [x, y]

type Props = {
    onChange: (strokes: SignatureStrokes) => void;
};

export default function SignatureCanvas({ onChange }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<SignatureStrokes>([]);
    const drawingRef = useRef(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const toLocal = (e: React.PointerEvent): [number, number] => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * SIG_W;
        const y = ((e.clientY - rect.top) / rect.height) * SIG_H;
        return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    };

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, SIG_W, SIG_H);
        ctx.strokeStyle = "#161513";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const stroke of strokesRef.current) {
            if (stroke.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(stroke[0][0], stroke[0][1]);
            for (let i = 1; i < stroke.length; i++) {
                ctx.lineTo(stroke[i][0], stroke[i][1]);
            }
            ctx.stroke();
        }
    }, []);

    const onPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        canvasRef.current?.setPointerCapture(e.pointerId);
        drawingRef.current = true;
        strokesRef.current.push([toLocal(e)]);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!drawingRef.current) return;
        const stroke = strokesRef.current[strokesRef.current.length - 1];
        stroke.push(toLocal(e));
        redraw();
        if (isEmpty) setIsEmpty(false);
    };

    const onPointerUp = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        // Drop accidental dots
        strokesRef.current = strokesRef.current.filter((s) => s.length >= 2);
        onChange([...strokesRef.current]);
    };

    const clear = () => {
        strokesRef.current = [];
        redraw();
        setIsEmpty(true);
        onChange([]);
    };

    return (
        <div>
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={SIG_W}
                    height={SIG_H}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="w-full touch-none cursor-crosshair"
                    style={{ aspectRatio: `${SIG_W} / ${SIG_H}`, borderBottom: "1px solid var(--ink)" }}
                    aria-label="Signature area. Draw your signature here."
                />
                {isEmpty && (
                    <span
                        className="overline absolute left-0 bottom-3 pointer-events-none"
                        aria-hidden="true"
                    >
                        Sign here
                    </span>
                )}
            </div>
            <div className="flex justify-end pt-2">
                <button
                    type="button"
                    onClick={clear}
                    disabled={isEmpty}
                    className="overline ink-link disabled:opacity-30"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}
