"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/components/dashboard-context";
import DashboardHeader from "@/components/dashboard-header";
import ManagerAside from "@/components/manager-aside";
import { useAuth } from "@/components/auth-context";
import { FilesProvider } from "@/components/files-context";
import { ClientsProvider } from "@/components/clients-context";
import { ClipboardFollower } from "@/components/ui/clipboard-follower";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { activeTab, setActiveTab, isManagerOpen, setIsManagerOpen, isHeaderVisible, clientPageName } = useDashboard();

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-hidden">
            <DashboardHeader
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isVisible={isHeaderVisible}
                onToggleManager={clientPageName ? undefined : () => setIsManagerOpen(prev => !prev)}
                isManagerOpen={isManagerOpen}
            />

            <div className="flex flex-1 w-full relative overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
                    {children}
                </div>
                {!clientPageName && (
                    <ManagerAside isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
                )}
            </div>
            <ClipboardFollower />
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    // Show nothing while checking auth or redirecting
    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground" style={{ fontSize: "15px" }}>
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <DashboardProvider>
            <FilesProvider>
                <ClientsProvider>
                    <DashboardLayoutContent>{children}</DashboardLayoutContent>
                </ClientsProvider>
            </FilesProvider>
        </DashboardProvider>
    );
}
