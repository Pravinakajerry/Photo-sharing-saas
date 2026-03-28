"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export const tabs = ["Profile", "Clients", "Settings"] as const;
export type Tab = (typeof tabs)[number];

export const settingsTabs = ["Account", "Profile", "Payment", "Customize"] as const;
export type SettingsTab = (typeof settingsTabs)[number];

interface DashboardContextType {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    settingsTab: SettingsTab;
    setSettingsTab: (tab: SettingsTab) => void;
    isManagerOpen: boolean;
    setIsManagerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isHeaderVisible: boolean;
    setHeaderVisible: (visible: boolean) => void;
    clientPageName: string | null;
    setClientPageName: (name: string | null) => void;
    clientPageId: string | null;
    setClientPageId: (id: string | null) => void;
    copiedItems: { id: string; url: string }[];
    setCopiedItems: (items: { id: string; url: string }[]) => void;
    lastActionAt: number;
    setLastActionAt: (time: number) => void;
    isPasting: boolean;
    setIsPasting: (pasting: boolean) => void;
    newlyAddedIds: Set<string>;
    setNewlyAddedIds: (ids: Set<string>) => void;
    selectedIds: Set<string>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [activeTab, setActiveTab] = useState<Tab>("Profile");
    const [settingsTab, setSettingsTab] = useState<SettingsTab>("Account");
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isHeaderVisible, setHeaderVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [clientPageName, setClientPageName] = useState<string | null>(null);
    const [clientPageId, setClientPageId] = useState<string | null>(null);
    const [copiedItems, setCopiedItems] = useState<{ id: string; url: string }[]>([]);
    const [lastActionAt, setLastActionAt] = useState<number>(0);
    const [isPasting, setIsPasting] = useState(false);
    const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY < lastScrollY || currentScrollY < 50) {
                setHeaderVisible(true);
            } else if (currentScrollY > 50 && currentScrollY > lastScrollY) {
                setHeaderVisible(false);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    return (
        <DashboardContext.Provider value={{
            activeTab,
            setActiveTab,
            settingsTab,
            setSettingsTab,
            isManagerOpen,
            setIsManagerOpen,
            isHeaderVisible,
            setHeaderVisible,
            clientPageName,
            setClientPageName,
            clientPageId,
            setClientPageId,
            copiedItems,
            setCopiedItems,
            lastActionAt,
            setLastActionAt,
            isPasting,
            setIsPasting,
            newlyAddedIds,
            setNewlyAddedIds,
            selectedIds,
            setSelectedIds
        }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }
    return context;
}
