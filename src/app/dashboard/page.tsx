"use client";

import { useDashboard } from "@/components/dashboard-context";
import DashboardTabs from "@/components/dashboard-tabs";

export default function DashboardPage() {
    const { activeTab } = useDashboard();

    return (
        <main className="flex-1 flex flex-col min-w-0 px-[24px] pt-[73px]">
            <DashboardTabs activeTab={activeTab} />
        </main>
    );
}
