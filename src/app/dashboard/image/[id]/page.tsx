"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useFiles, FileItem } from "@/hooks/use-files";
import { useComments } from "@/hooks/use-comments";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download } from "lucide-react";

type PanelView = "info" | "comment" | "version" | null;

export default function ImageDetailClient() {
    const params = useParams();
    const router = useRouter();
    const [backUrl, setBackUrl] = useState("/dashboard");
    const [localFileId, setLocalFileId] = useState<string>(params.id as string);

    // Read & clear the back URL from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("img.backUrl");
        if (stored) {
            setBackUrl(stored);
            localStorage.removeItem("img.backUrl");
        }
    }, []);

    // Sync state if user uses browser back/forward buttons
    useEffect(() => {
        setLocalFileId(params.id as string);
    }, [params.id]);

    const fileId = localFileId;
    const { files, isLoaded, addFiles } = useFiles();
    const { comments, addComment } = useComments(fileId);
    const [activePanel, setActivePanel] = useState<PanelView>(null);
    const [newComment, setNewComment] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allFiles = files.filter(f => f.url && f.type.startsWith("image/"));

    const currentIndex = allFiles.findIndex((f) => f.id === fileId);
    const currentFile = allFiles[currentIndex];

    // Navigate to another image by ID
    const navigateTo = (index: number) => {
        if (index >= 0 && index < allFiles.length) {
            const nextId = allFiles[index].id;
            window.history.pushState(null, "", `/dashboard/image/${nextId}`);
            setLocalFileId(nextId);
        }
    };

    const handleDownload = async () => {
        if (!currentFile) return;
        try {
            const response = await fetch(currentFile.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            // Nil
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === "ArrowLeft" || e.key === "ArrowUp") navigateTo(currentIndex - 1);
            else if (e.key === "ArrowRight" || e.key === "ArrowDown") navigateTo(currentIndex + 1);
            else if (e.key === "Escape") router.push(backUrl);
            // Panel toggles
            else if (e.key.toLowerCase() === "i") setActivePanel(prev => prev === "info" ? null : "info");
            else if (e.key.toLowerCase() === "c") setActivePanel(prev => prev === "comment" ? null : "comment");
            else if (e.key.toLowerCase() === "v") setActivePanel(prev => prev === "version" ? null : "version");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, allFiles.length, router]);

    // Handle File Upload for returning to the grid to see the newly uploaded file?
    // User requested "opens files for image selection" on the Upload New Version button
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
            // Optionally clear the input
            if (fileInputRef.current) fileInputRef.current.value = "";
            router.push(backUrl);
        }
    };

    // If we can't find the file (e.g. page refreshed and in-memory files lost), return to dashboard
    useEffect(() => {
        if (isLoaded && !currentFile && files.length === 0) {
            router.push(backUrl);
        }
    }, [currentFile, files.length, isLoaded, router]);

    if (!isLoaded) return null; // Wait for files to load from LocalStorage
    if (!currentFile) return null;

    // Calculate left navigation thumbnails (max 5)
    let startIdx = Math.max(0, currentIndex - 2);
    let endIdx = Math.min(allFiles.length - 1, startIdx + 4);

    if (endIdx - startIdx < 4) {
        startIdx = Math.max(0, endIdx - 4);
    }

    const thumbFiles = allFiles.slice(startIdx, endIdx + 1);

    return (
        <TooltipProvider delayDuration={300}>
            <div
                className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden animate-blur-fade-in"
            >

                {/* Hidden File Input for uploading new version */}
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />

                {/* Blurred Header Simulator (Header fades blur out) */}
                <div className="absolute top-0 left-0 right-0 h-[73px] bg-background/50 backdrop-blur-md z-10 pointer-events-none" />

                {/* Top Left: Back Arrow */}
                <div className="absolute top-[24px] left-[24px] w-[80px] flex justify-center z-50">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => router.push(backUrl)}
                                className="w-[36px] h-[36px] rounded-full bg-transparent hover:bg-muted text-foreground transition-colors flex items-center justify-center cursor-pointer"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p>Back to grid (Esc)</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Center: Main Image */}
                <div className="relative w-full max-w-[1000px] h-[60vh] flex items-center justify-center">
                    <div
                        key={currentFile.id}
                        className="relative w-full h-full rounded-[16px] overflow-hidden animate-blur-fade-in"
                    >
                        <Image
                            src={currentFile.url}
                            alt={currentFile.name}
                            fill
                            className="object-contain"
                            unoptimized
                        />
                        {/* Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 transform -rotate-12 select-none">
                            <span className="text-[64px] font-bold tracking-widest text-foreground uppercase">WATERMARK</span>
                        </div>
                    </div>
                </div>

                {/* Center-Left: Thumbnails (Fixed) */}
                <div className="absolute left-[24px] top-1/2 -translate-y-1/2 w-[80px] flex-shrink-0 flex flex-col justify-center items-center gap-[12px] z-20">
                    {thumbFiles.map((file) => {
                        const actualIndex = allFiles.findIndex(f => f.id === file.id);
                        const isSelected = actualIndex === currentIndex;
                        return (
                            <button
                                key={file.id}
                                onClick={() => navigateTo(actualIndex)}
                                className={`group relative flex-shrink-0 w-[60px] h-[80px] rounded-[8px] overflow-hidden border transition-all duration-300 cursor-pointer ${isSelected ? "border-foreground scale-110 shadow-md ring-4 ring-foreground/10" : "border-border/50 opacity-60 hover:opacity-100 hover:scale-105"
                                    }`}
                            >
                                <Image src={file.url} alt={file.name} fill className="object-cover" unoptimized />
                                {!isSelected && (
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Center-Right: Toolbar (Fixed) */}
                <div className="absolute right-[24px] top-1/2 -translate-y-1/2 flex items-center gap-[16px] z-20">
                    {activePanel && (
                        <div
                            className="w-[280px] h-[400px] bg-background border border-border rounded-[16px] p-[24px] shadow-sm flex flex-col animate-panel-in"
                        >
                            {activePanel === "info" && (
                                <>
                                    <h3 className="text-foreground mb-4 flex items-center gap-[8px]" style={{ fontSize: "16px", fontWeight: 600 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                        Information
                                    </h3>
                                    <div className="flex flex-col gap-4 text-muted-foreground" style={{ fontSize: "14px" }}>
                                        <div className="flex flex-col gap-[2px]">
                                            <strong className="text-foreground font-medium text-[13px] uppercase tracking-wider opacity-60">Filename</strong>
                                            <span className="truncate" title={currentFile.name}>{currentFile.name}</span>
                                        </div>
                                        <div className="flex flex-col gap-[2px]">
                                            <strong className="text-foreground font-medium text-[13px] uppercase tracking-wider opacity-60">Type</strong>
                                            <span>{currentFile.type || "Unknown image type"}</span>
                                        </div>
                                        <div className="flex flex-col gap-[2px]">
                                            <strong className="text-foreground font-medium text-[13px] uppercase tracking-wider opacity-60">Date added</strong>
                                            <span>{new Date(currentFile.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                            {activePanel === "comment" && (
                                <>
                                    <h3 className="text-foreground mb-4 flex items-center gap-[8px] flex-shrink-0" style={{ fontSize: "16px", fontWeight: 600 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        Comments
                                    </h3>

                                    <div className="flex-1 overflow-y-auto w-full flex flex-col gap-[12px] mb-4 pr-1">
                                        {comments.length === 0 ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <p className="text-muted-foreground/60 text-center" style={{ fontSize: "14px" }}>No comments yet.</p>
                                            </div>
                                        ) : (
                                            comments.map((comment) => (
                                                <div key={comment.id} className="bg-muted/30 p-[12px] rounded-[8px] border border-border/50">
                                                    <p className="text-foreground" style={{ fontSize: "13px" }}>{comment.text}</p>
                                                    <span className="text-muted-foreground/60 mt-2 block" style={{ fontSize: "10px" }}>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (newComment.trim()) {
                                                addComment(newComment.trim());
                                                setNewComment("");
                                            }
                                        }}
                                        className="mt-auto flex gap-[8px] flex-shrink-0"
                                    >
                                        <input
                                            type="text"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Add comment..."
                                            className="flex-1 h-[36px] rounded-[8px] border border-border bg-background px-[12px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-300 focus:border-foreground"
                                            style={{ fontSize: "13px" }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newComment.trim()}
                                            className="h-[36px] px-[12px] rounded-[8px] bg-foreground text-background flex items-center justify-center disabled:opacity-50 transition-colors"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                            </svg>
                                        </button>
                                    </form>
                                </>
                            )}
                            {activePanel === "version" && (
                                <>
                                    <h3 className="text-foreground mb-4 flex items-center gap-[8px]" style={{ fontSize: "16px", fontWeight: 600 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                        </svg>
                                        Versions
                                    </h3>
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="p-3 border border-border rounded-[8px] flex items-center justify-between">
                                            <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>v1 (Current)</span>
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full mt-auto h-[40px] rounded-[8px] bg-foreground text-background flex items-center justify-center shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-300"
                                        style={{ fontSize: "13px", fontWeight: 500 }}
                                    >
                                        Upload New Version
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    <div className="w-[54px] bg-background border border-border rounded-[16px] overflow-hidden flex flex-col shadow-sm">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setActivePanel(activePanel === "info" ? null : "info")}
                                    className={`w-full aspect-square flex items-center justify-center transition-colors cursor-pointer ${activePanel === "info" ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>Information (i)</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setActivePanel(activePanel === "comment" ? null : "comment")}
                                    className={`w-full aspect-square flex items-center justify-center border-t border-border focus:outline-none transition-colors cursor-pointer ${activePanel === "comment" ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>Comments (c)</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setActivePanel(activePanel === "version" ? null : "version")}
                                    className={`w-full aspect-square flex items-center justify-center border-t border-border focus:outline-none transition-colors cursor-pointer ${activePanel === "version" ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                    </svg>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>Versions (v)</p>
                            </TooltipContent>
                        </Tooltip>


                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => { /* Handle delete placeholder */ }}
                                    className="w-full aspect-square flex items-center justify-center border-t border-border focus:outline-none transition-colors cursor-pointer text-destructive hover:bg-destructive/10"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>Delete (Delete)</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Bottom Center: Prev < Pay > Next */}
                <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 flex items-center gap-[24px] z-20">
                    <button
                        onClick={() => navigateTo(currentIndex - 1)}
                        disabled={currentIndex === 0}
                        className="w-[48px] h-[48px] rounded-full flex items-center justify-center bg-transparent text-foreground transition-all duration-300 hover:bg-[#f6f5f4] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer group"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1 group-disabled:translate-x-0">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>

                    <button
                        onClick={handleDownload}
                        className="px-[48px] h-[48px] rounded-[12px] bg-foreground text-background flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                        style={{ fontSize: "15px", fontWeight: 500 }}
                    >
                        <Download size={18} className="mr-2" />
                        Download
                    </button>

                    <button
                        onClick={() => navigateTo(currentIndex + 1)}
                        disabled={currentIndex === allFiles.length - 1}
                        className="w-[48px] h-[48px] rounded-full flex items-center justify-center bg-transparent text-foreground transition-all duration-300 hover:bg-[#f6f5f4] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer group"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1 group-disabled:translate-x-0">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>


            </div>
        </TooltipProvider>
    );
}
