"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { SafeImage as Image } from "@/components/ui/safe-image";
import { Tab, tabs } from "@/components/dashboard-context";
import { useDashboard } from "@/components/dashboard-context";
import { useClients } from "@/hooks/use-clients";
import { useFiles } from "@/hooks/use-files";
import { useRouter } from "next/navigation";
import {
    Share, ChevronDown, Pencil, Trash2, Search, Check,
    LogOut, MessageSquare, Settings, ImageIcon, Users, ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-context";
import { FeedbackModal } from "@/components/feedback-modal";

interface DashboardHeaderProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isVisible?: boolean;
    onToggleManager?: () => void;
    isManagerOpen?: boolean;
}

// ─── Result types ────────────────────────────────────────────────────────────
type ResultKind = "asset" | "client" | "action";

interface SearchResult {
    id: string;
    kind: ResultKind;
    label: string;
    sub?: string;
    thumbnailUrl?: string;
    onSelect: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardHeader({
    activeTab,
    setActiveTab,
    isVisible = true,
    onToggleManager,
    isManagerOpen = false,
}: DashboardHeaderProps) {
    const activeIndex = tabs.indexOf(activeTab);
    const { clientPageName, clientPageId, setClientPageName } = useDashboard();
    const { renameClient, removeClient, clients } = useClients();
    const { files } = useFiles();
    const { user, signOut } = useAuth();
    const router = useRouter();

    // ── Existing state ──
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [shareState, setShareState] = useState<"idle" | "copying" | "copied" | "error">("idle");
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    // ── Search / palette state ──
    const [searchQuery, setSearchQuery] = useState("");
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [highlightStyle, setHighlightStyle] = useState({ top: 0, left: 0, width: 0, height: 0, opacity: 0 });

    const dropdownRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // ── Close palette & dropdown on outside click ──
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                setIsDropdownOpen(false);
                setIsRenaming(false);
            }
            if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
                setIsSearchExpanded(false);
                setIsPaletteOpen(false);
                searchInputRef.current?.blur();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── Auto-focus rename input ──
    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [isRenaming]);

    // ── Build flat results list ──
    const MAX_PER_SECTION = 5;

    const allResults = useMemo<SearchResult[]>(() => {
        const q = searchQuery.toLowerCase().trim();

        // Assets
        const assetResults: SearchResult[] = files
            .filter((f) => !q || f.name.toLowerCase().includes(q))
            .slice(0, MAX_PER_SECTION)
            .map((f) => ({
                id: `asset-${f.id}`,
                kind: "asset",
                label: f.name,
                thumbnailUrl: f.url,
                onSelect: () => {
                    router.push(`/dashboard/image/${f.id}`);
                    closePalette();
                },
            }));

        // Clients
        const clientResults: SearchResult[] = clients
            .filter((c) => !q || c.name.toLowerCase().includes(q))
            .slice(0, MAX_PER_SECTION)
            .map((c) => ({
                id: `client-${c.id}`,
                kind: "client",
                label: c.name,
                sub: c.contact,
                onSelect: () => {
                    router.push(`/dashboard/client/${c.id}`);
                    closePalette();
                },
            }));

        // Static actions
        const staticActions: Array<Omit<SearchResult, "id">> = [
            {
                kind: "action",
                label: "Home / Profile",
                sub: "View your personal profile and assets",
                onSelect: () => {
                    setActiveTab("Profile");
                    if (window.location.pathname !== "/dashboard") router.push("/dashboard");
                    closePalette();
                },
            },
            {
                kind: "action",
                label: "Clients",
                sub: "View and manage all your clients",
                onSelect: () => {
                    setActiveTab("Clients");
                    if (window.location.pathname !== "/dashboard") router.push("/dashboard");
                    closePalette();
                },
            },
            {
                kind: "action",
                label: "Feedback",
                sub: "Send us your feedback",
                onSelect: () => {
                    closePalette();
                    setIsFeedbackOpen(true);
                },
            },
            {
                kind: "action",
                label: "Settings",
                sub: "Manage your account settings",
                onSelect: () => {
                    setActiveTab("Settings");
                    if (window.location.pathname !== "/dashboard") router.push("/dashboard");
                    closePalette();
                },
            },
            {
                kind: "action",
                label: "Logout",
                sub: "Sign out of your account",
                onSelect: async () => {
                    closePalette();
                    await signOut();
                    router.push("/");
                },
            },
        ];

        const actionResults: SearchResult[] = staticActions
            .filter((a) => !q || a.label.toLowerCase().includes(q) || (a.sub || "").toLowerCase().includes(q))
            .map((a, i) => ({ ...a, id: `action-${i}` }));

        return [...assetResults, ...clientResults, ...actionResults];
    }, [searchQuery, files, clients, signOut, router]);

    const groupedResults = useMemo(() => ({
        assets: allResults.filter((r) => r.kind === "asset"),
        clients: allResults.filter((r) => r.kind === "client"),
        actions: allResults.filter((r) => r.kind === "action"),
    }), [allResults]);

    const hasResults = allResults.length > 0;

    // ── Reset highlight when results change ──
    useEffect(() => {
        setHighlightedIndex(0);
    }, [allResults]);

    // ── Update sliding background pill ──
    useEffect(() => {
        if (isPaletteOpen && listRef.current && hasResults) {
            // Wait slightly for DOM to render layout of results
            const updateHighlight = () => {
                const row = listRef.current?.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement;
                if (row) {
                    setHighlightStyle({
                        top: row.offsetTop,
                        left: row.offsetLeft,
                        width: row.offsetWidth,
                        height: row.offsetHeight,
                        opacity: 1,
                    });
                    
                    // Simple logic to keep the focused element in view
                    const container = listRef.current;
                    if (container) {
                        const rowTop = row.offsetTop;
                        const rowBottom = rowTop + row.offsetHeight;
                        const containerTop = container.scrollTop;
                        const containerBottom = containerTop + container.clientHeight;
                        
                        // Using a small buffer for headers
                        if (rowTop < containerTop + 20) {
                            container.scrollTo({ top: rowTop - 30, behavior: 'smooth' });
                        } else if (rowBottom > containerBottom) {
                            container.scrollTo({ top: rowBottom - container.clientHeight + 10, behavior: 'smooth' });
                        }
                    }
                }
            };
            
            updateHighlight();
            // A secondary request animation frame bounds check in case image thumbnails load
            requestAnimationFrame(updateHighlight);
        } else {
            setHighlightStyle((prev) => ({ ...prev, opacity: 0 }));
        }
    }, [highlightedIndex, isPaletteOpen, allResults, hasResults]);

    const closePalette = useCallback(() => {
        setIsPaletteOpen(false);
        setSearchQuery("");
        setIsSearchExpanded(false);
        searchInputRef.current?.blur();
    }, []);

    const openPalette = useCallback(() => {
        setIsPaletteOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
    }, []);

    // ── Global Keyboard Shortcuts ──
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.key === "Escape") (e.target as HTMLElement).blur();
                return;
            }

            if (e.key === "~" || e.key === "`" || e.key === "/") {
                e.preventDefault();
                if (window.innerWidth < 1220) {
                    setIsSearchExpanded(true);
                }
                openPalette();
            }

            if (e.key === "1") { setActiveTab("Profile"); if (window.location.pathname !== "/dashboard") router.push("/dashboard"); }
            if (e.key === "2") { setActiveTab("Clients"); if (window.location.pathname !== "/dashboard") router.push("/dashboard"); }
            if (e.key === "3") { setActiveTab("Settings"); if (window.location.pathname !== "/dashboard") router.push("/dashboard"); }
            if (e.key === "4") document.getElementById("header-storage-toggle")?.click();
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [openPalette]);

    // ── Keyboard navigation ──
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            closePalette();
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        }
        if (e.key === "Enter") {
            e.preventDefault();
            allResults[highlightedIndex]?.onSelect();
        }
    };

    // ─── Rename / delete handlers ─────────────────────────────────────────
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

    // ─── Result row (plain function, NOT a component, to avoid remount-on-rerender) ──
    const renderResultRow = (result: SearchResult, globalIndex: number) => {
        const isHighlighted = highlightedIndex === globalIndex;
        return (
            <button
                key={result.id}
                data-index={globalIndex}
                onMouseEnter={() => setHighlightedIndex(globalIndex)}
                onMouseDown={(e) => e.preventDefault()} // keep input focused so onClick fires
                onClick={result.onSelect}
                className={`w-full flex items-center gap-[12px] px-[12px] py-[8px] text-left transition-colors cursor-pointer rounded-[8px] relative z-10`}
            >
                {/* Icon / Thumbnail */}
                <div className="flex-shrink-0 w-[32px] h-[32px] rounded-[6px] overflow-hidden flex items-center justify-center bg-[#e8e7e5]">
                    {result.kind === "asset" && result.thumbnailUrl ? (
                        <Image
                            src={result.thumbnailUrl}
                            alt={result.label}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                        />
                    ) : result.kind === "asset" ? (
                        <ImageIcon size={14} className="text-muted-foreground" />
                    ) : result.kind === "client" ? (
                        <Users size={14} className="text-muted-foreground" />
                    ) : result.label === "Logout" ? (
                        <LogOut size={14} className="text-muted-foreground" />
                    ) : result.label === "Feedback" ? (
                        <MessageSquare size={14} className="text-muted-foreground" />
                    ) : (
                        <Settings size={14} className="text-muted-foreground" />
                    )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <div className="text-foreground truncate" style={{ fontSize: "13px", fontWeight: 500 }}>
                        {result.label}
                    </div>
                    {result.sub && (
                        <div className="text-muted-foreground truncate" style={{ fontSize: "12px" }}>
                            {result.sub}
                        </div>
                    )}
                </div>

                <ArrowUpRight size={13} className="flex-shrink-0 text-muted-foreground opacity-40" />
            </button>
        );
    };

    // ── Build ordered rows for global index tracking ──
    let globalRowIndex = 0;
    const renderSection = (label: string, items: SearchResult[]) => {
        if (items.length === 0) return null;
        const startIndex = globalRowIndex;
        globalRowIndex += items.length;
        return (
            <div key={label}>
                <div
                    className="px-[12px] pt-[10px] pb-[4px] text-muted-foreground"
                    style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}
                >
                    {label}
                </div>
                {items.map((result, i) => renderResultRow(result, startIndex + i))}
            </div>
        );
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

                {/* Left: Profile + Search */}
                <div className="flex-1 max-w-[320px] relative z-20">
                    <div
                        ref={searchContainerRef}
                        className={`flex items-center rounded-full border border-border bg-[#e8e7e5] p-[4px] transition-all duration-300 focus-within:border-foreground overflow-hidden ${isSearchExpanded ? "w-full min-w-[200px]" : "w-[84px] min-[1220px]:w-full"
                            }`}
                        onClick={() => {
                            if (!isSearchExpanded && window.innerWidth < 1220) {
                                setIsSearchExpanded(true);
                            }
                            openPalette();
                        }}
                    >
                        {/* Avatar */}
                        <button className="flex h-[38px] w-[38px] flex-shrink-0 overflow-hidden rounded-full ring-1 ring-border transition-all duration-300 hover:ring-foreground/30 z-10 cursor-pointer">
                            <Image
                                src="/profile-photo-v2.jpg"
                                alt="Profile"
                                width={38}
                                height={38}
                                className="h-full w-full rounded-full object-cover object-center"
                            />
                        </button>

                        {/* Search icon – small screens collapsed */}
                        <div className={`flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isSearchExpanded ? "w-0 opacity-0 min-[1220px]:hidden" : "w-[38px] opacity-100 min-[1220px]:w-0 min-[1220px]:opacity-0"
                            }`}>
                            <Search size={18} className="text-muted-foreground mr-[4px]" />
                        </div>

                        {/* Search input */}
                        <input
                            ref={searchInputRef}
                            id="dashboard-search-input"
                            type="text"
                            placeholder="Search everything (/)"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!isPaletteOpen) setIsPaletteOpen(true);
                            }}
                            onFocus={() => setIsPaletteOpen(true)}
                            onKeyDown={handleKeyDown}
                            className={`bg-transparent text-foreground placeholder:text-muted-foreground outline-none transition-all duration-300 ${isSearchExpanded ? "flex-1 px-[12px] w-full min-w-[100px] opacity-100" : "w-0 px-0 opacity-0 min-[1220px]:flex-1 min-[1220px]:px-[12px] min-[1220px]:w-full min-[1220px]:opacity-100"
                                }`}
                            style={{ fontSize: "14px" }}
                        />
                    </div>

                    {/* Command Palette Dropdown */}
                    {isPaletteOpen && (
                        <div
                            className="absolute top-full mt-[8px] left-0 w-full min-w-[280px] max-w-[360px] bg-background border border-border rounded-[14px] shadow-xl overflow-hidden animate-blur-fade-in z-50"
                            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}
                        >
                            {/* Inner scroll container */}
                            <div className="max-h-[420px] overflow-y-auto p-[6px] relative" ref={listRef}>
                                {/* Sliding Background Pill */}
                                {hasResults && (
                                    <div
                                        className="absolute bg-[#e8e7e5] rounded-[8px] pointer-events-none z-0"
                                        style={{
                                            top: highlightStyle.top,
                                            left: highlightStyle.left,
                                            width: highlightStyle.width,
                                            height: highlightStyle.height,
                                            opacity: highlightStyle.opacity,
                                            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                        }}
                                    />
                                )}
                                {hasResults ? (
                                    <>
                                        {renderSection("Assets", groupedResults.assets)}
                                        {renderSection("Clients", groupedResults.clients)}
                                        {renderSection("Actions", groupedResults.actions)}
                                    </>
                                ) : (
                                    <div
                                        className="flex flex-col items-center justify-center py-[32px] text-muted-foreground gap-[8px]"
                                    >
                                        <Search size={20} className="opacity-40" />
                                        <span style={{ fontSize: "13px" }}>
                                            No results for &ldquo;{searchQuery}&rdquo;
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Footer hint */}
                            <div className="border-t border-border px-[14px] py-[8px] flex items-center gap-[12px]">
                                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                                    <kbd className="font-mono bg-[#e8e7e5] rounded px-[4px] py-[1px] mr-[4px]">↑↓</kbd>navigate
                                </span>
                                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                                    <kbd className="font-mono bg-[#e8e7e5] rounded px-[4px] py-[1px] mr-[4px]">↵</kbd>open
                                </span>
                                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                                    <kbd className="font-mono bg-[#e8e7e5] rounded px-[4px] py-[1px] mr-[4px]">Esc</kbd>close
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Center: Tabs OR Client breadcrumb */}
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    {clientPageName ? (
                        <div className="inline-flex items-center gap-[12px] pointer-events-auto animate-blur-fade-in">
                            <button
                                onClick={() => {
                                    setActiveTab("Clients");
                                    router.push("/dashboard");
                                }}
                                className="flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-[8px] py-[4px] -mx-[8px] rounded-[6px] hover:bg-muted/50"
                                style={{ fontSize: "14px", fontWeight: 400 }}
                            >
                                All Clients
                            </button>

                            <span className="text-muted-foreground/50" style={{ fontSize: "14px" }}>/</span>

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
            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </header>
    );
}
