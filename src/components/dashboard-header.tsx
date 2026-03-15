"use client";

import { useState, useRef, useEffect } from "react";
import { SafeImage as Image } from "@/components/ui/safe-image";
import { Tab, tabs } from "@/components/dashboard-tabs";
import { useDashboard } from "@/components/dashboard-context";
import { useClients } from "@/hooks/use-clients";
import { useRouter } from "next/navigation";
import { Share, ChevronDown, Pencil, Trash2, Search, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-context";

interface DashboardHeaderProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isVisible?: boolean;
    onToggleManager?: () => void;
    isManagerOpen?: boolean;
}

export default function DashboardHeader({ activeTab, setActiveTab, isVisible = true, onToggleManager, isManagerOpen = false }: DashboardHeaderProps) {
    const activeIndex = tabs.indexOf(activeTab);
    const { clientPageName, clientPageId, setClientPageName } = useDashboard();
    const { renameClient, removeClient } = useClients();
    const { user } = useAuth();
    const router = useRouter();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [shareState, setShareState] = useState<"idle" | "copying" | "copied" | "error">("idle");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                setIsDropdownOpen(false);
                setIsRenaming(false);
            }
            if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
                setIsSearchExpanded(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto-focus rename input
    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [isRenaming]);

    const handleRenameStart = () => {
        setRenameValue(clientPageName || "");
        setIsRenaming(true);
        setIsDropdownOpen(false);
    };

    const handleRenameSubmit = async () => {
        if (clientPageId && renameValue.trim() && renameValue.trim() !== clientPageName) {
            await renameClient(clientPageId, renameValue.trim());
            setClientPageName(renameValue.trim());
        }
        setIsRenaming(false);
    };

    const handleDelete = async () => {
        if (clientPageId) {
            await removeClient(clientPageId);
            router.push("/dashboard");
        }
        setIsDropdownOpen(false);
    };

    return (
        <header
            className="fixed top-0 z-50 w-full border-b border-border bg-background"
            style={{
                transform: isVisible ? "translateY(0)" : "translateY(-100%)",
                pointerEvents: isVisible ? "auto" : "none",
                transition: "transform 0.3s ease-in-out",
            }}
        >
            <div className="flex items-center justify-between px-[24px] h-[73px]">

                {/* Left: Merged Profile & Search Bar */}
                <div className="flex-1 max-w-[320px] relative z-20">
                    <div
                        ref={searchContainerRef}
                        className={`flex items-center rounded-full border border-border bg-[#e8e7e5] p-[4px] transition-all duration-300 focus-within:border-foreground overflow-hidden ${isSearchExpanded ? "w-full min-w-[200px]" : "w-[84px] min-[1220px]:w-full"
                            }`}
                        onClick={() => {
                            if (!isSearchExpanded && window.innerWidth < 1220) {
                                setIsSearchExpanded(true);
                                setTimeout(() => {
                                    document.getElementById("dashboard-search-input")?.focus();
                                }, 100);
                            }
                        }}
                    >
                        <button className="flex h-[38px] w-[38px] flex-shrink-0 overflow-hidden rounded-full ring-1 ring-border transition-all duration-300 hover:ring-foreground/30 z-10 cursor-pointer">
                            <Image
                                src="/profile-photo-v2.jpg"
                                alt="Profile"
                                width={38}
                                height={38}
                                className="h-full w-full rounded-full object-cover object-center"
                            />
                        </button>

                        {/* Search Icon (Only visible on small screens when collapsed) */}
                        <div className={`flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isSearchExpanded ? "w-0 opacity-0 min-[1220px]:hidden" : "w-[38px] opacity-100 min-[1220px]:w-0 min-[1220px]:opacity-0"
                            }`}>
                            <Search size={18} className="text-muted-foreground mr-[4px]" />
                        </div>

                        {/* Search Input */}
                        <input
                            id="dashboard-search-input"
                            type="text"
                            placeholder="Search everything"
                            className={`bg-transparent text-foreground placeholder:text-muted-foreground outline-none transition-all duration-300 ${isSearchExpanded ? "flex-1 px-[12px] w-full min-w-[100px] opacity-100" : "w-0 px-0 opacity-0 min-[1220px]:flex-1 min-[1220px]:px-[12px] min-[1220px]:w-full min-[1220px]:opacity-100"
                                }`}
                            style={{ fontSize: "14px" }}
                        />
                    </div>
                </div>

                {/* Center: Tabs OR Client Page Pills */}
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    {clientPageName ? (
                        <div className="inline-flex items-center gap-[12px] pointer-events-auto animate-blur-fade-in">
                            {/* Files breadcrumb (back) */}
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-[8px] py-[4px] -mx-[8px] rounded-[6px] hover:bg-muted/50"
                                style={{ fontSize: "14px", fontWeight: 400 }}
                            >
                                Files
                            </button>

                            {/* Separator */}
                            <span className="text-muted-foreground/50" style={{ fontSize: "14px" }}>/</span>

                            {/* Client Name (with dropdown) */}
                            <div className="relative" ref={dropdownRef}>
                                {isRenaming ? (
                                    <input
                                        ref={renameInputRef}
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleRenameSubmit();
                                            if (e.key === "Escape") setIsRenaming(false);
                                        }}
                                        onBlur={handleRenameSubmit}
                                        className="rounded-[6px] bg-background px-[8px] py-[4px] text-foreground outline-none border border-border"
                                        style={{ fontSize: "14px", fontWeight: 500, minWidth: "100px" }}
                                    />
                                ) : (
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center gap-[4px] text-foreground hover:text-muted-foreground transition-colors cursor-pointer px-[8px] py-[4px] -mx-[8px] rounded-[6px] hover:bg-muted/50"
                                        style={{ fontSize: "14px", fontWeight: 500 }}
                                    >
                                        {clientPageName}
                                        <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>
                                )}

                                {/* Dropdown */}
                                {isDropdownOpen && (
                                    <div className="absolute top-full mt-[8px] left-1/2 -translate-x-1/2 bg-background border border-border rounded-[12px] shadow-xl overflow-hidden min-w-[160px] animate-blur-fade-in z-50">
                                        <button
                                            onClick={handleRenameStart}
                                            className="w-full flex items-center gap-[10px] px-[16px] py-[12px] text-foreground hover:bg-muted transition-colors cursor-pointer"
                                            style={{ fontSize: "14px", fontWeight: 400 }}
                                        >
                                            <Pencil size={14} />
                                            Rename
                                        </button>
                                        <div className="h-[1px] bg-border" />
                                        <button
                                            onClick={handleDelete}
                                            className="w-full flex items-center gap-[10px] px-[16px] py-[12px] text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
                                            style={{ fontSize: "14px", fontWeight: 400 }}
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="inline-flex items-center rounded-full p-[4px] relative bg-transparent pointer-events-auto">
                            {/* Sliding pill indicator */}
                            <div
                                className="absolute rounded-full bg-[#e8e7e5]"
                                style={{
                                    width: 100,
                                    height: "calc(100% - 8px)",
                                    top: 4,
                                    left: 4,
                                    transform: `translateX(${activeIndex * 100}px)`,
                                    transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                }}
                            />
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        id={`header-tab-${tab.toLowerCase()}`}
                                        onClick={() => setActiveTab(tab)}
                                        className={`relative flex items-center justify-center rounded-full w-[100px] py-[8px] transition-colors duration-300 cursor-pointer ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        style={{ fontSize: "14px", fontWeight: 400 }}
                                    >
                                        <span className="relative z-10">{tab}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: Storage toggle OR Share button */}
                <div className="flex-1 flex justify-end pointer-events-none">
                    {clientPageName ? (
                        <button
                            className={`pointer-events-auto flex items-center justify-center gap-[8px] rounded-full px-[16px] py-[6px] transition-all duration-300 cursor-pointer ${shareState === "copied"
                                    ? "bg-foreground text-background"
                                    : shareState === "error"
                                        ? "bg-destructive text-background"
                                        : "bg-[#e8e7e5] text-foreground hover:bg-[#dcdbd9]"
                                }`}
                            style={{ fontSize: "14px", fontWeight: 500 }}
                            disabled={shareState === "copying"}
                            onClick={async () => {
                                if (!clientPageId || !user || shareState !== "idle") return;
                                setShareState("copying");
                                try {
                                    // Upsert share token
                                    const { data, error } = await supabase
                                        .from("client_shares")
                                        .upsert(
                                            { client_id: clientPageId, user_id: user.id },
                                            { onConflict: "client_id,user_id" }
                                        )
                                        .select("token")
                                        .single();

                                    if (error) throw error;

                                    const shareUrl = `${window.location.origin}/share/${data.token}`;
                                    await navigator.clipboard.writeText(shareUrl);
                                    setShareState("copied");
                                    setTimeout(() => setShareState("idle"), 2000);
                                } catch (err) {
                                    console.error("Share failed:", err);
                                    setShareState("error");
                                    setTimeout(() => setShareState("idle"), 2000);
                                }
                            }}
                        >
                            {shareState === "copied" ? (
                                <><Check size={16} /> Copied!</>
                            ) : shareState === "error" ? (
                                <><Share size={16} /> Error</>
                            ) : shareState === "copying" ? (
                                <><Share size={16} className="animate-pulse" /> Sharing...</>
                            ) : (
                                <><Share size={16} /> Share</>
                            )}
                        </button>
                    ) : onToggleManager ? (
                        <button
                            id="header-storage-toggle"
                            onClick={onToggleManager}
                            className={`pointer-events-auto flex items-center justify-center gap-[8px] rounded-full px-[16px] py-[6px] transition-colors cursor-pointer ${isManagerOpen
                                ? "bg-foreground text-background hover:bg-foreground/90"
                                : "bg-[#e8e7e5] text-foreground hover:bg-[#dcdbd9]"
                                }`}
                            style={{ fontSize: "14px", fontWeight: 500 }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="14" x="3" y="5" rx="3" />
                                <path d="M10 5v14" />
                                <path d="M6 9h1" />
                                <path d="M6 12h1" />
                                <path d="M6 15h1" />
                            </svg>
                            Storage
                        </button>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
