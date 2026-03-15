"use client";

import { useEffect } from "react";
import { useDashboard } from "@/components/dashboard-context";
import DashboardTabs from "@/components/dashboard-tabs";

export default function DashboardPage() {
    const { activeTab, setActiveTab, setIsManagerOpen } = useDashboard();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.key === "Escape") (e.target as HTMLElement).blur();
                return;
            }

            if (e.key === "~" || e.key === "`" || e.key === "/") {
                e.preventDefault();
                document.getElementById("dashboard-search-input")?.focus();
            }

            if (e.key === "1") document.getElementById("header-tab-files")?.click();
            if (e.key === "2") document.getElementById("header-tab-clients")?.click();
            if (e.key === "3") document.getElementById("header-tab-payment")?.click();
            if (e.key === "4") document.getElementById("header-tab-settings")?.click();
            if (e.key === "5") document.getElementById("header-storage-toggle")?.click();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <main className="flex-1 flex flex-col min-w-0 px-[24px] pt-[73px]">
            <DashboardTabs activeTab={activeTab} />
        </main>
    );
}
