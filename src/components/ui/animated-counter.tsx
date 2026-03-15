"use client";

import { useEffect, useState } from "react";

export function AnimatedCounter({ value }: { value: number }) {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const duration = 400; // ms
        const startValue = displayValue;
        const endValue = value;

        if (startValue === endValue) return;

        const easeOutQuad = (t: number) => t * (2 - t);

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easedProgress = easeOutQuad(progress);

            const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
            setDisplayValue(currentValue);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [value, displayValue]);

    return <span>{displayValue}</span>;
}
