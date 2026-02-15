"use client";

import { useEffect, useCallback, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    initialIndex?: number;
}

export default function ImageViewer({
    isOpen,
    onClose,
    images,
    initialIndex = 0,
}: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Sync internal state when opened
    useEffect(() => {
        if (isOpen) setCurrentIndex(initialIndex);
    }, [isOpen, initialIndex]);

    const showNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev: number) => (prev + 1) % images.length);
    }, [images.length]);

    const showPrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev: number) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight") showNext();
            if (e.key === "ArrowLeft") showPrev();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, showNext, showPrev]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors z-[10002]"
            >
                <X size={24} />
            </button>

            {/* Previous Button */}
            {images.length > 1 && (
                <button
                    onClick={showPrev}
                    className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors z-[10002] hidden md:flex"
                >
                    <ChevronLeft size={32} />
                </button>
            )}

            {/* Image Container */}
            <div
                className="relative w-full h-full max-w-7xl max-h-screen p-4 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image */}
                <img
                    src={images[currentIndex]}
                    alt={`Image ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-sm select-none"
                />

                {/* Counter */}
                {images.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-xs rounded-full font-medium backdrop-blur-md">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>

            {/* Next Button */}
            {images.length > 1 && (
                <button
                    onClick={showNext}
                    className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors z-[10002] hidden md:flex"
                >
                    <ChevronRight size={32} />
                </button>
            )}
        </div>
    );
}
