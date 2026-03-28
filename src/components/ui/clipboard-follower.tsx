"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useDashboard } from "@/components/dashboard-context";
import { SafeImage as Image } from "@/components/ui/safe-image";

export function ClipboardFollower() {
    const { copiedItems, setCopiedItems, lastActionAt, isPasting } = useDashboard();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);
    const [isPopping, setIsPopping] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);

    const activeItems = copiedItems;

    const dismissSequence = useCallback(() => {
        setIsDismissing(true);
        setTimeout(() => {
            setCopiedItems([]);
            setIsVisible(false);
            setIsDismissing(false);
        }, 400); // Match duration of fade-out
    }, [setCopiedItems]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
            
            if (activeItems.length > 0 && !isDismissing) {
                if (!isVisible) setIsVisible(true);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [activeItems.length, isVisible, isDismissing]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && activeItems.length > 0) {
                dismissSequence();
            }
        };
        
        const handleDoubleClick = () => {
            if (activeItems.length > 0) {
                dismissSequence();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("dblclick", handleDoubleClick);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("dblclick", handleDoubleClick);
        };
    }, [activeItems.length, dismissSequence]);

    // Internal copy pop animation
    useEffect(() => {
        if (lastActionAt > 0 && copiedItems.length > 0) {
            setIsPopping(true);
            const timer = setTimeout(() => setIsPopping(false), 400);
            return () => clearTimeout(timer);
        }
    }, [lastActionAt, copiedItems.length]);

    const cards = useMemo(() => {
        if (activeItems.length === 0) return [];
        return activeItems.slice(0, 6);
    }, [activeItems]);

    if (activeItems.length === 0) return null;

    // Define classes for different states
    const visibilityClasses = isDismissing 
        ? "opacity-0 blur-md scale-90" // Fade blur out on shake/dismiss
        : isPasting 
            ? "opacity-0 scale-90 blur-md translate-y-4" 
            : isVisible 
                ? "opacity-100 scale-100 blur-0" 
                : "opacity-0 scale-75 blur-sm";

    return (
        <div
            className={`fixed pointer-events-none z-[100] transition-all duration-500 ease-out ${visibilityClasses} ${isPopping ? "animate-pop-up-scale" : ""}`}
            style={{
                left: mousePos.x + 20,
                top: mousePos.y + 20,
            }}
        >
            <div className="relative w-[110px] aspect-[4/3] bg-[#f6f5f4]/70 backdrop-blur-md rounded-[14px] border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-visible">
                {isPopping && (
                    <div className="absolute inset-0 bg-white/40 rounded-[14px] animate-ping pointer-events-none" />
                )}

                <div className="flex -space-x-[14px]">
                    {cards.map((item, idx) => {
                        const totalCards = cards.length;
                        const middleIdx = (totalCards - 1) / 2;
                        const rot = (idx - middleIdx) * 8;
                        const scale = 1 - Math.abs(idx - middleIdx) * 0.05;
                        
                        let zIndex = 10;
                        if (totalCards === 1) zIndex = 30;
                        else if (totalCards === 2) zIndex = 10 + idx;
                        else if (totalCards === 3) zIndex = idx === 1 ? 30 : 10;
                        else zIndex = Math.abs(idx - middleIdx) < 1.5 ? 30 : (idx < middleIdx ? 10 + idx : 10 + (totalCards - 1 - idx));

                        return (
                            <div
                                key={`${item.id}-${idx}`}
                                className="w-[36px] h-[48px] rounded-[5px] bg-[#e8e7e5] border-[1.5px] border-[#f6f5f4] shadow-md overflow-hidden transition-all duration-500 ease-in-out"
                                style={{
                                    transform: `rotate(${rot}deg) scale(${scale})`,
                                    zIndex: zIndex,
                                }}
                            >
                                <Image src={item.url} alt="" width={36} height={48} className="w-full h-full object-cover" />
                            </div>
                        );
                    })}
                </div>

                {activeItems.length > 1 && (
                    <div className="absolute -top-2.5 -right-2.5 bg-foreground text-background w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-2xl border-2 border-background z-40 transform transition-transform duration-300 hover:scale-110">
                        {activeItems.length}
                    </div>
                )}
            </div>

            {!isPasting && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-40 transition-opacity duration-300">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-foreground">
                        Cmd + V to paste
                    </p>
                </div>
            )}
        </div>
    );
}
