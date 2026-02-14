"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSign: (signatureData: string) => void;
    groupName: string;
    groupEmoji: string;
    contractText: string;
    rules: string[];
}

const colors = {
    bg: "#0A0A0B",
    surface: "#141416",
    surfaceHover: "#1A1A1E",
    border: "#2A2A2E",
    primary: "#6C5CE7",
    primaryLight: "#A29BFE",
    accent: "#00D9A5",
    accentAlt: "#FF6B6B",
    gold: "#FFD93D",
    textPrimary: "#FFFFFF",
    textSecondary: "#B8B8C0",
    textMuted: "#6B6B74",
};

// Particle type for celebration effect
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
    type: 'confetti' | 'sparkle';
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
                ctx.fillStyle = "#1a1a1e";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = colors.primaryLight;
                ctx.lineWidth = 3;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }
        }
    }, [isOpen]);

    // Drawing handlers
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
            ctx.fillStyle = "#1a1a1e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        setHasSignature(false);
    };

    // Celebration particles
    const createParticles = useCallback(() => {
        const newParticles: Particle[] = [];
        const particleColors = [colors.primary, colors.primaryLight, colors.accent, colors.gold, "#FF6B6B", "#FFD93D", "#00D9A5"];

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
                type: Math.random() > 0.3 ? 'confetti' : 'sparkle',
            });
        }
        return newParticles;
    }, []);

    const animateParticles = useCallback(() => {
        setParticles(prev => {
            const updated = prev.map(p => ({
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                vy: p.vy + 0.5, // gravity
                rotation: p.rotation + p.rotationSpeed,
                opacity: p.opacity - 0.008,
            })).filter(p => p.opacity > 0);

            if (updated.length > 0) {
                animationRef.current = requestAnimationFrame(animateParticles);
            }
            return updated;
        });
    }, []);

    // Handle sign
    const handleSign = async () => {
        if (!hasSignature || !canvasRef.current) return;

        setIsSigning(true);

        // Get signature data
        const signatureData = canvasRef.current.toDataURL("image/png");

        // Trigger celebration
        await new Promise(resolve => setTimeout(resolve, 300));
        setShowCelebration(true);
        setParticles(createParticles());
        animationRef.current = requestAnimationFrame(animateParticles);

        // Show welcome after animation
        setTimeout(() => {
            setShowWelcome(true);
        }, 1500);

        // Complete after celebration
        setTimeout(() => {
            onSign(signatureData);
            // Reset states
            setShowCelebration(false);
            setShowWelcome(false);
            setIsSigning(false);
            setHasSignature(false);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }, 3500);
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.9)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
                fontFamily: "var(--font-inter), Inter, sans-serif",
                animation: showCelebration ? "celebrationPulse 0.6s ease-out" : undefined,
            }}
            onClick={(e) => e.target === e.currentTarget && !isSigning && onClose()}
        >
            {/* Celebration Particles */}
            {showCelebration && (
                <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
                    {particles.map(p => (
                        <div
                            key={p.id}
                            style={{
                                position: "absolute",
                                left: p.x,
                                top: p.y,
                                width: p.size,
                                height: p.type === 'confetti' ? p.size * 0.6 : p.size,
                                background: p.color,
                                borderRadius: p.type === 'sparkle' ? "50%" : "2px",
                                transform: `rotate(${p.rotation}deg)`,
                                opacity: p.opacity,
                                boxShadow: p.type === 'sparkle' ? `0 0 ${p.size}px ${p.color}` : undefined,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Welcome Message */}
            {showWelcome && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10001,
                        animation: "fadeIn 0.5s ease-out",
                    }}
                >
                    <div style={{ fontSize: "120px", marginBottom: "24px", animation: "gentleBounce 0.8s ease-out" }}>
                        {groupEmoji}
                    </div>
                    <h1 style={{
                        fontSize: "48px",
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: "16px",
                        textAlign: "center",
                    }}>
                        Welcome to {groupName}!
                    </h1>
                    <p style={{ color: colors.textSecondary, fontSize: "20px" }}>
                        You're officially committed 🔥
                    </p>
                </div>
            )}

            {/* Contract Modal */}
            {!showWelcome && (
                <div
                    style={{
                        background: colors.surface,
                        borderRadius: "28px",
                        border: `1px solid ${colors.border}`,
                        maxWidth: "600px",
                        width: "90%",
                        maxHeight: "90vh",
                        overflow: "auto",
                        boxShadow: `0 40px 100px rgba(0, 0, 0, 0.5), 0 0 0 1px ${colors.primary}30`,
                        animation: "slideUp 0.4s ease-out",
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: "32px 32px 24px",
                        borderBottom: `1px solid ${colors.border}`,
                        textAlign: "center",
                    }}>
                        <div style={{ fontSize: "56px", marginBottom: "16px" }}>{groupEmoji}</div>
                        <h2 style={{
                            fontSize: "28px",
                            fontWeight: 800,
                            marginBottom: "8px",
                            background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.primaryLight})`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}>
                            Commitment Contract
                        </h2>
                        <p style={{ color: colors.textMuted, fontSize: "14px" }}>
                            By signing below, you agree to hold yourself accountable
                        </p>
                    </div>

                    {/* Contract Content */}
                    <div style={{ padding: "24px 32px" }}>
                        {/* Main Contract Text */}
                        <div style={{
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "16px",
                            padding: "24px",
                            marginBottom: "24px",
                        }}>
                            <p style={{
                                fontSize: "16px",
                                lineHeight: 1.8,
                                color: colors.textSecondary,
                                fontStyle: "italic",
                                margin: 0,
                            }}>
                                "{contractText}"
                            </p>
                        </div>

                        {/* Rules */}
                        {rules.length > 0 && (
                            <div style={{ marginBottom: "24px" }}>
                                <h3 style={{
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    color: colors.textMuted,
                                    marginBottom: "12px",
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                }}>
                                    📜 Group Rules I Agree To
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {rules.map((rule, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: "12px",
                                                padding: "12px 16px",
                                                background: colors.bg,
                                                borderRadius: "12px",
                                                border: `1px solid ${colors.border}`,
                                            }}
                                        >
                                            <span style={{ color: colors.accent, fontWeight: 700 }}>✓</span>
                                            <span style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: 1.5 }}>
                                                {rule}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Signature Pad */}
                        <div style={{ marginBottom: "24px" }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "12px",
                            }}>
                                <h3 style={{
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    color: colors.textMuted,
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                }}>
                                    ✍️ Your Signature
                                </h3>
                                {hasSignature && (
                                    <button
                                        onClick={clearSignature}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: colors.accentAlt,
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div style={{
                                border: `2px dashed ${hasSignature ? colors.accent : colors.border}`,
                                borderRadius: "16px",
                                overflow: "hidden",
                                position: "relative",
                            }}>
                                <canvas
                                    ref={canvasRef}
                                    width={536}
                                    height={150}
                                    style={{
                                        width: "100%",
                                        height: "150px",
                                        cursor: "crosshair",
                                        touchAction: "none",
                                    }}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                {!hasSignature && (
                                    <div style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        pointerEvents: "none",
                                        color: colors.textMuted,
                                        fontSize: "14px",
                                    }}>
                                        Draw your signature here
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sign Button */}
                        <button
                            onClick={handleSign}
                            disabled={!hasSignature || isSigning}
                            style={{
                                width: "100%",
                                padding: "18px 32px",
                                borderRadius: "16px",
                                border: "none",
                                background: hasSignature
                                    ? `linear-gradient(135deg, ${colors.accent}, #00B894)`
                                    : colors.border,
                                color: hasSignature ? "#fff" : colors.textMuted,
                                fontSize: "18px",
                                fontWeight: 800,
                                cursor: hasSignature && !isSigning ? "pointer" : "not-allowed",
                                transition: "all 0.3s",
                                boxShadow: hasSignature ? `0 8px 32px ${colors.accent}40` : "none",
                                animation: hasSignature && !isSigning ? "subtleGlow 2.5s ease-in-out infinite" : undefined,
                            }}
                        >
                            {isSigning ? "✨ Sealing your commitment..." : "🖊️ Sign & Commit"}
                        </button>

                        {/* Cancel */}
                        <button
                            onClick={onClose}
                            disabled={isSigning}
                            style={{
                                width: "100%",
                                padding: "14px",
                                marginTop: "12px",
                                background: "transparent",
                                border: "none",
                                color: colors.textMuted,
                                fontSize: "14px",
                                cursor: isSigning ? "not-allowed" : "pointer",
                            }}
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            )}

            {/* Animations */}
            <style jsx global>{`
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes celebrationPulse {
                    0% { transform: scale(1); }
                    30% { transform: scale(1.01); }
                    100% { transform: scale(1); }
                }
                @keyframes gentleBounce {
                    0% { transform: translateY(20px); opacity: 0; }
                    50% { transform: translateY(-8px); opacity: 1; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes subtleGlow {
                    0%, 100% { box-shadow: 0 8px 32px rgba(0, 217, 165, 0.3); }
                    50% { box-shadow: 0 8px 36px rgba(0, 217, 165, 0.5); }
                }
            `}</style>
        </div>
    );
}
