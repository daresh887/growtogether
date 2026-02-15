"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSign: (signatureData: string) => void;
    groupName: string;
    groupEmoji: string;
    contractText: string;
    rules: string[];
}

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
    type: "confetti" | "sparkle";
}

export default function ContractModal({
    isOpen,
    onClose,
    onSign,
    groupName,
    groupEmoji,
    contractText,
    rules,
}: ContractModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);

    const animationRef = useRef<number | undefined>(undefined);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    // Initialize canvas
    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "hsl(var(--muted))";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = "hsl(var(--primary))";
                ctx.lineWidth = 3;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }
        }
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        lastPoint.current = { x, y };
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current || !lastPoint.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastPoint.current = { x, y };
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPoint.current = null;
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "hsl(var(--muted))";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        setHasSignature(false);
    };

    const createParticles = useCallback(() => {
        const particleColors = ["#6C5CE7", "#A29BFE", "#00D9A5", "#FFD93D", "#FF6B6B"];
        const newParticles: Particle[] = [];
        for (let i = 0; i < 80; i++) {
            newParticles.push({
                id: i,
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 20,
                vx: (Math.random() - 0.5) * 15,
                vy: -Math.random() * 20 - 10,
                color: particleColors[Math.floor(Math.random() * particleColors.length)],
                size: Math.random() * 12 + 6,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 15,
                opacity: 1,
                type: Math.random() > 0.3 ? "confetti" : "sparkle",
            });
        }
        return newParticles;
    }, []);

    const animateParticles = useCallback(() => {
        setParticles(prev => {
            const updated = prev
                .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.5, rotation: p.rotation + p.rotationSpeed, opacity: p.opacity - 0.008 }))
                .filter(p => p.opacity > 0);
            if (updated.length > 0) animationRef.current = requestAnimationFrame(animateParticles);
            return updated;
        });
    }, []);

    const handleSign = async () => {
        if (!hasSignature || !canvasRef.current) return;
        setIsSigning(true);
        const signatureData = canvasRef.current.toDataURL("image/png");
        await new Promise(resolve => setTimeout(resolve, 300));
        setShowCelebration(true);
        setParticles(createParticles());
        animationRef.current = requestAnimationFrame(animateParticles);
        setTimeout(() => setShowWelcome(true), 1500);
        setTimeout(() => {
            onSign(signatureData);
            setShowCelebration(false);
            setShowWelcome(false);
            setIsSigning(false);
            setHasSignature(false);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }, 3500);
    };

    useEffect(() => {
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, []);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[10000]"
            onClick={e => e.target === e.currentTarget && !isSigning && onClose()}
        >
            {/* Celebration Particles */}
            {showCelebration && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    {particles.map(p => (
                        <div
                            key={p.id}
                            className="absolute"
                            style={{
                                left: p.x, top: p.y, width: p.size,
                                height: p.type === "confetti" ? p.size * 0.6 : p.size,
                                background: p.color,
                                borderRadius: p.type === "sparkle" ? "50%" : "2px",
                                transform: `rotate(${p.rotation}deg)`,
                                opacity: p.opacity,
                                boxShadow: p.type === "sparkle" ? `0 0 ${p.size}px ${p.color}` : undefined,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Welcome Message */}
            {showWelcome && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-[10001] animate-in fade-in duration-500">
                    <div className="text-[120px] mb-6 animate-bounce">{groupEmoji}</div>
                    <h1 className="text-5xl font-extrabold bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent mb-4 text-center">
                        Welcome to {groupName}!
                    </h1>
                    <p className="text-xl text-muted-foreground">You&apos;re officially committed 🔥</p>
                </div>
            )}

            {/* Contract Modal */}
            {!showWelcome && (
                <Card className="max-w-xl w-[90%] max-h-[90vh] overflow-auto shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-400">
                    {/* Header */}
                    <div className="p-8 pb-6 border-b border-border text-center">
                        <div className="text-6xl mb-4">{groupEmoji}</div>
                        <h2 className="text-2xl font-extrabold bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent mb-2">
                            Commitment Contract
                        </h2>
                        <p className="text-sm text-muted-foreground">By signing below, you agree to hold yourself accountable</p>
                    </div>

                    <CardContent className="p-8 space-y-6">
                        {/* Main Contract Text */}
                        <div className="bg-muted rounded-2xl p-6 border border-border">
                            <p className="text-muted-foreground italic leading-relaxed">&quot;{contractText}&quot;</p>
                        </div>

                        {/* Rules */}
                        {rules.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">📜 Group Rules I Agree To</h3>
                                <div className="space-y-2">
                                    {rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-xl border border-border">
                                            <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                                            <span className="text-sm text-muted-foreground leading-relaxed">{rule}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Signature Pad */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">✍️ Your Signature</h3>
                                {hasSignature && (
                                    <button onClick={clearSignature} className="text-xs font-semibold text-destructive cursor-pointer hover:underline">Clear</button>
                                )}
                            </div>
                            <div className={cn("border-2 border-dashed rounded-2xl overflow-hidden relative", hasSignature ? "border-green-500" : "border-border")}>
                                <canvas
                                    ref={canvasRef}
                                    width={536}
                                    height={150}
                                    className="w-full h-[150px] cursor-crosshair touch-none"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                {!hasSignature && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-sm text-muted-foreground">
                                        Draw your signature here
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sign Button */}
                        <Button
                            onClick={handleSign}
                            disabled={!hasSignature || isSigning}
                            className={cn("w-full h-14 text-lg font-extrabold rounded-2xl", hasSignature && "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30")}
                        >
                            {isSigning ? (
                                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Sealing your commitment...</>
                            ) : (
                                <><PenLine size={18} className="mr-2" /> Sign & Commit</>
                            )}
                        </Button>

                        {/* Cancel */}
                        <Button variant="ghost" onClick={onClose} disabled={isSigning} className="w-full text-muted-foreground">
                            Maybe later
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
