"use client";

import { useFiles, FileItem } from "@/hooks/use-files";
import { useDashboard } from "@/components/dashboard-context";
import { SafeImage as Image } from "@/components/ui/safe-image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, FolderOpen, Pencil, Copy, Clipboard, Download, Trash2, Search, CheckSquare } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ManagerAsideProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ManagerAside({ isOpen, onClose }: ManagerAsideProps) {
    const router = useRouter();
    const { files, renameFile, removeFile, deletingIds } = useFiles();
    const { selectedIds, setSelectedIds } = useDashboard();
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [hoveredFile, setHoveredFile] = useState<FileItem | null>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [isAnyMenuOpen, setIsAnyMenuOpen] = useState(false);
    const [editingFileId, setEditingFileId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [clipboardIds, setClipboardIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (hoveredFile) {
                setCursorPos({ x: e.clientX, y: e.clientY });
            }
        };

        if (hoveredFile) {
            window.addEventListener("mousemove", handleMouseMove);
        } else {
            window.removeEventListener("mousemove", handleMouseMove);
        }

        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [hoveredFile]);

    const displayFiles = searchQuery
        ? files.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : files;

    const hasSelection = selectedIds.size > 0;

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Keyboard shortcuts for selection
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Ctrl/Cmd + A (Select All)
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                if (selectedIds.size === displayFiles.length && displayFiles.length > 0) {
                    setSelectedIds(new Set()); // Deselect all
                } else {
                    setSelectedIds(new Set(displayFiles.map(f => f.id))); // Select all
                }
            }
            
            // Ctrl/Cmd + C (Copy)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (selectedIds.size > 0) {
                    e.preventDefault();
                    setClipboardIds(new Set(selectedIds));
                }
            }
            
            // Ctrl/Cmd + V (Paste/Duplicate)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (clipboardIds.size > 0) {
                    e.preventDefault();
                    // In a real app, this might duplicate the files. 
                    // For now, we'll just console log as useFiles doesn't have a duplicate method.
                    console.log("Pasting/duplicating files:", Array.from(clipboardIds));
                }
            }
            
            // Delete key
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
                e.preventDefault();
                removeFile(Array.from(selectedIds));
                setSelectedIds(new Set());
            }
            
            // Escape to clear selection
            if (e.key === 'Escape' && selectedIds.size > 0) {
                e.preventDefault();
                setSelectedIds(new Set());
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, displayFiles, selectedIds, clipboardIds, removeFile]);

    return (
        <aside
            className="h-[100vh] bg-background border-l border-border flex flex-col shrink-0 overflow-hidden pt-[73px]"
            style={{
                width: isOpen ? 320 : 0,
                opacity: isOpen ? 1 : 0,
                transition: "width 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease",
            }}
        >
            <div className="flex items-center justify-between gap-3 px-[20px] py-[16px] border-b border-border w-[320px]">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-[14px] h-[14px]" strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-[36px] bg-[#e8e7e5] rounded-[8px] pl-[34px] pr-[12px] text-[13px] text-foreground placeholder:text-muted-foreground/60 border border-transparent focus:bg-background focus:border-border/50 focus:outline-none focus:ring-4 focus:ring-border/10 transition-all"
                    />
                </div>

                {/* View Toggle (List/Grid) */}
                <div className="inline-flex items-center rounded-full p-[3px] relative bg-[#e8e7e5] shrink-0">
                    {/* Sliding pill indicator */}
                    <div
                        className="absolute rounded-full bg-background shadow-sm"
                        style={{
                            width: 32,
                            height: 32,
                            top: 3,
                            left: 3,
                            transform: `translateX(${viewMode === "grid" ? 32 : 0}px)`,
                            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                    />
                    <button
                        onClick={() => setViewMode("list")}
                        className={`relative flex items-center justify-center rounded-full w-[32px] h-[32px] transition-colors duration-300 cursor-pointer ${viewMode === "list" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <svg className="relative z-10" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6" />
                            <line x1="8" y1="12" x2="21" y2="12" />
                            <line x1="8" y1="18" x2="21" y2="18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" />
                            <line x1="3" y1="12" x2="3.01" y2="12" />
                            <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`relative flex items-center justify-center rounded-full w-[32px] h-[32px] transition-colors duration-300 cursor-pointer ${viewMode === "grid" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <svg className="relative z-10" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="7" height="7" x="3" y="3" rx="1" />
                            <rect width="7" height="7" x="14" y="3" rx="1" />
                            <rect width="7" height="7" x="14" y="14" rx="1" />
                            <rect width="7" height="7" x="3" y="14" rx="1" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-[12px] flex flex-col gap-[2px] w-[320px]">
                <div
                    key={viewMode}
                    className="w-full h-full animate-blur-fade-in"
                >
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-2 gap-[12px]">
                            {displayFiles.length > 0 ? (
                                displayFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        onClick={() => router.push(`/dashboard/image/${file.id}`)}
                                        className={`relative group flex flex-col overflow-hidden rounded-[8px] border bg-[#f6f5f4] transition-all duration-300 cursor-pointer border-border/20 ${deletingIds.has(file.id) ? "opacity-0 blur-md scale-90 pointer-events-none" : "opacity-100 blur-0 scale-100"}`}
                                    >
                                        <div className="aspect-square w-full bg-[#e8e7e5] flex items-center justify-center overflow-hidden">
                                            {file.type.startsWith("image/") ? (
                                                <Image
                                                    src={file.url}
                                                    alt={file.name}
                                                    width={140}
                                                    height={140}
                                                    className="w-full h-full object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <svg className="text-muted-foreground/60" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="p-[8px] flex items-center justify-between bg-background border-t border-border/30">
                                            <span className="truncate text-foreground" style={{ fontSize: "12px", fontWeight: 400 }}>
                                                {file.name}
                                            </span>
                                        </div>

                                        {/* Three Dot Menu Overlay for Grid */}
                                        <div className="absolute top-[8px] right-[8px] z-20">
                                            <DropdownMenu onOpenChange={(open) => {
                                                setIsAnyMenuOpen(open);
                                                if (open) setHoveredFile(null);
                                            }}>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        onMouseEnter={() => setHoveredFile(null)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-[24px] h-[24px] flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-sm opacity-0 group-hover:opacity-100"
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[140px]" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem
                                                        className="gap-[8px]"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/dashboard/image/${file.id}`);
                                                        }}
                                                    >
                                                        <FolderOpen size={14} /> Open
                                                    </DropdownMenuItem>
                                                    {editingFileId === file.id ? (
                                                        <DropdownMenuItem
                                                            onSelect={(e) => e.preventDefault()}
                                                            className="gap-[8px] p-0 h-8 flex items-center"
                                                        >
                                                            <Pencil size={14} className="ml-2 shrink-0 text-muted-foreground" />
                                                            <input
                                                                autoFocus
                                                                className="w-full h-full text-sm bg-transparent border-none focus:outline-none placeholder-muted-foreground pr-2"
                                                                value={renameValue}
                                                                onChange={(e) => {
                                                                    setRenameValue(e.target.value);
                                                                    renameFile(file.id, e.target.value);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === 'Escape') setEditingFileId(null);
                                                                    e.stopPropagation();
                                                                }}
                                                                onBlur={() => setEditingFileId(null)}
                                                            />
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="gap-[8px]"
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                setEditingFileId(file.id);
                                                                setRenameValue(file.name);
                                                            }}
                                                        >
                                                            <Pencil size={14} /> Rename
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="gap-[8px]">
                                                        <Copy size={14} /> Copy
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-[8px]">
                                                        <Clipboard size={14} /> Paste
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="gap-[8px]">
                                                        <Download size={14} /> Download
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-[8px] text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFile([file.id]);
                                                        }}
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 flex justify-center py-[20px]">
                                    <p className="text-muted-foreground" style={{ fontSize: "13px" }}>No files available</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // List View
                        <>
                            {displayFiles.length > 0 ? (
                                displayFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        onClick={() => router.push(`/dashboard/image/${file.id}`)}
                                        onMouseEnter={() => {
                                            if (isAnyMenuOpen) return;
                                            if (file.type.startsWith("image/")) {
                                                setHoveredFile(file);
                                            }
                                        }}
                                        onMouseLeave={() => setHoveredFile(null)}
                                        className={`group flex items-center gap-[8px] py-[6px] rounded-[6px] transition-all duration-300 pr-[12px] cursor-default ${
                                            selectedIds.has(file.id) ? "bg-muted shadow-sm" : "hover:bg-muted"
                                        } ${deletingIds.has(file.id) ? "opacity-0 blur-md scale-95 pointer-events-none" : "opacity-100 blur-0 scale-100"}`}
                                        style={{ paddingLeft: "12px" }}
                                    >
                                        <div
                                            className="relative w-[18px] h-[18px] flex items-center justify-center cursor-pointer shrink-0"
                                            onClick={(e) => toggleSelection(e, file.id)}
                                        >
                                            {/* File Icon (default state) */}
                                            <div className={`absolute inset-0 transition-opacity duration-200 ${selectedIds.has(file.id) || hasSelection ? "opacity-0" : "opacity-100 group-hover:opacity-0"}`}>
                                                <svg className="text-muted-foreground/60 w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                            </div>
                                            
                                            {/* Checkbox (hover or selected or hasSelection) */}
                                            <div className={`absolute inset-0 transition-opacity duration-200 ${selectedIds.has(file.id) ? "opacity-100" : (hasSelection ? "opacity-30 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100")}`}>
                                                {selectedIds.has(file.id) ? (
                                                    <CheckSquare className="w-[14px] h-[14px] text-foreground" strokeWidth={2.5} />
                                                ) : (
                                                    <div className="w-[14px] h-[14px] rounded-[3px] border-[1.5px] border-muted-foreground/50 transition-colors group-hover:border-foreground/70" />
                                                )}
                                            </div>
                                        </div>

                                        <span className={`truncate text-foreground transition-colors ${selectedIds.has(file.id) ? "font-medium" : "font-normal"}`} style={{ fontSize: "13px" }}>
                                            {file.name}
                                        </span>

                                        {/* Three Dot Menu for List */}
                                        <div className="ml-auto">
                                            <DropdownMenu onOpenChange={(open) => {
                                                setIsAnyMenuOpen(open);
                                                if (open) setHoveredFile(null);
                                            }}>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        onMouseEnter={() => setHoveredFile(null)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-[28px] h-[28px] flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[140px]" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem
                                                        className="gap-[8px]"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/dashboard/image/${file.id}`);
                                                        }}
                                                    >
                                                        <FolderOpen size={14} /> Open
                                                    </DropdownMenuItem>
                                                    {editingFileId === file.id ? (
                                                        <DropdownMenuItem
                                                            onSelect={(e) => e.preventDefault()}
                                                            className="gap-[8px] p-0 h-8 flex items-center"
                                                        >
                                                            <Pencil size={14} className="ml-2 shrink-0 text-muted-foreground" />
                                                            <input
                                                                autoFocus
                                                                className="w-full h-full text-sm bg-transparent border-none focus:outline-none placeholder-muted-foreground pr-2"
                                                                value={renameValue}
                                                                onChange={(e) => {
                                                                    setRenameValue(e.target.value);
                                                                    renameFile(file.id, e.target.value);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === 'Escape') setEditingFileId(null);
                                                                    e.stopPropagation();
                                                                }}
                                                                onBlur={() => setEditingFileId(null)}
                                                            />
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="gap-[8px]"
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                setEditingFileId(file.id);
                                                                setRenameValue(file.name);
                                                            }}
                                                        >
                                                            <Pencil size={14} /> Rename
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="gap-[8px]">
                                                        <Copy size={14} /> Copy
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-[8px]">
                                                        <Clipboard size={14} /> Paste
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="gap-[8px]">
                                                        <Download size={14} /> Download
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-[8px] text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFile([file.id]);
                                                        }}
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center py-[20px]" style={{ fontSize: "13px" }}>
                                    No files available
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Cursor Hover Preview */}
            {hoveredFile && (
                <div
                    className="fixed z-[100] pointer-events-none rounded-[12px] overflow-hidden border border-border shadow-2xl bg-background animate-preview-in"
                    style={{
                        left: cursorPos.x - 220,
                        top: cursorPos.y - 120,
                        width: 200,
                        height: 'auto'
                    }}
                >
                    <Image
                        src={hoveredFile.url}
                        alt={hoveredFile.name}
                        width={200}
                        height={200}
                        className="w-full h-auto object-cover"
                        unoptimized
                    />
                    <div className="p-[8px] border-t border-border bg-[#f6f5f4]">
                        <p className="text-foreground truncate" style={{ fontSize: "12px", fontWeight: 500 }}>
                            {hoveredFile.name}
                        </p>
                    </div>
                </div>
            )}
        </aside>
    );
}
