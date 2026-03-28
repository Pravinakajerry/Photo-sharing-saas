"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { SafeImage as Image } from "@/components/ui/safe-image";
import { Download, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useFiles } from "@/hooks/use-files";
import { useAuth } from "@/components/auth-context";
import type { FileItem } from "@/hooks/use-files";

interface Comment {
    id: string;
    file_id: string;
    content: string;
    x_coord: number;
    y_coord: number;
    author_name: string;
    author_avatar_url?: string;
    created_at: string;
}

interface ShareData {
    clientName: string;
    files: FileItem[];
}

interface ImageDetailViewProps {
    currentFile: FileItem;
    onClose: () => void;
    onNavigate: (index: number) => void;
    allFiles?: FileItem[];
    readOnly?: boolean;
    clientId?: string;
    clientName?: string;
}

type PanelView = "info" | "comment" | "version" | "favorite" | "logs" | null;

export default function ImageDetailView({ currentFile, onClose, onNavigate, allFiles: externalFiles, readOnly = false, clientId, clientName }: ImageDetailViewProps) {
    const [activePanel, setActivePanel] = useState<PanelView>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHoveringImage, setIsHoveringImage] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [shareState, setShareState] = useState<"idle" | "sharing" | "copied" | "error">("idle");
    const commentInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const { user } = useAuth();

    // Only call useFiles when not in readOnly mode (share page has no FilesProvider)
    const filesContext = readOnly ? null : (() => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useFiles();
    })();
    const hookFiles = filesContext?.files || [];
    const removeFile = filesContext?.removeFile || (async () => { });

    const allFiles = externalFiles || hookFiles.filter(f => f.url && f.type.startsWith("image/"));
    const currentIndex = allFiles.findIndex(f => f.id === currentFile.id);

    const handleDelete = useCallback(() => {
        if (readOnly) return;
        removeFile([currentFile.id]);
        if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
        } else if (allFiles.length > 1) {
            onNavigate(Math.min(currentIndex, allFiles.length - 2));
        } else {
            onClose();
        }
    }, [currentFile, removeFile, currentIndex, allFiles.length, onNavigate, onClose, readOnly]);


    // Fetch comments
    const fetchComments = useCallback(async () => {
        const { data, error } = await supabase
            .from("comments")
            .select("*")
            .eq("file_id", currentFile.id)
            .order("created_at", { ascending: true });

        if (error) {
            // Silently fail or handle gracefully without logs
        } else {
            setComments(data || []);
        }
    }, [currentFile.id]);

    // Fetch favorites
    const fetchFavoriteStatus = useCallback(async () => {
        let query = supabase
            .from("favorites")
            .select("id")
            .eq("file_id", currentFile.id);

        if (readOnly && clientId) {
            query = query.eq("client_id", clientId);
        } else if (user) {
            query = query.eq("user_id", user.id);
        } else {
            return;
        }

        const { data, error } = await query.maybeSingle();
        if (!error) {
            setIsFavorite(!!data);
        }
    }, [currentFile.id, user, readOnly, clientId]);

    useEffect(() => {
        fetchComments();
        fetchFavoriteStatus();
    }, [fetchComments, fetchFavoriteStatus]);

    const handleToggleFavorite = async () => {
        if (isFavorite) {
            // Remove favorite
            let query = supabase
                .from("favorites")
                .delete()
                .eq("file_id", currentFile.id);

            if (readOnly && clientId) {
                query = query.eq("client_id", clientId);
            } else if (user) {
                query = query.eq("user_id", user.id);
            }

            const { error } = await query;
            if (!error) setIsFavorite(false);
        } else {
            // Add favorite
            const newFavorite: any = { file_id: currentFile.id };
            if (readOnly && clientId) {
                newFavorite.client_id = clientId;
            } else if (user) {
                newFavorite.user_id = user.id;
            } else {
                return;
            }

            const { error } = await supabase
                .from("favorites")
                .insert([newFavorite]);
            if (!error) setIsFavorite(true);
        }
    };

    const handleDownload = async () => {
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
            // Silent fail
        }
    };

    const handleShare = async () => {
        if (!user || shareState !== "idle") return;
        setShareState("sharing");

        try {
            // 1. Create a specific client for this asset share
            const shareClientName = `Share: ${currentFile.name}`;

            // Check if client already exists
            const { data: existingClient } = await supabase
                .from("clients")
                .select("id")
                .eq("user_id", user.id)
                .eq("name", shareClientName)
                .maybeSingle();

            let targetClientId = existingClient?.id;

            if (!targetClientId) {
                const { data: newClient, error: clientErr } = await supabase
                    .from("clients")
                    .insert({ user_id: user.id, name: shareClientName })
                    .select("id")
                    .single();
                if (clientErr) throw clientErr;
                targetClientId = newClient.id;
            }

            // 2. Ensure file is linked to this client
            const { error: linkErr } = await supabase
                .from("client_files")
                .upsert(
                    { client_id: targetClientId, file_id: currentFile.id },
                    { onConflict: "client_id,file_id" }
                );
            if (linkErr) throw linkErr;

            // 3. Upsert share token
            const { data: share, error: shareErr } = await supabase
                .from("client_shares")
                .upsert(
                    { client_id: targetClientId, user_id: user.id },
                    { onConflict: "client_id,user_id" }
                )
                .select("token")
                .single();
            if (shareErr) throw shareErr;

            // 4. Copy URL
            const shareUrl = `${window.location.origin}/share/${share.token}`;
            await navigator.clipboard.writeText(shareUrl);
            setShareState("copied");
            setTimeout(() => setShareState("idle"), 2000);
        } catch (err) {
            setShareState("error");
            setTimeout(() => setShareState("idle"), 2000);
        }
    };

    const handleSaveComment = async (e: React.KeyboardEvent) => {
        if (e.key !== "Enter" || !commentText.trim() || isSavingComment) return;

        setIsSavingComment(true);
        const newComment = {
            file_id: currentFile.id,
            content: commentText.trim(),
            x_coord: mousePos.x,
            y_coord: mousePos.y,
            author_name: "Client",
        };

        const { data, error } = await supabase
            .from("comments")
            .insert([newComment])
            .select()
            .single();

        if (error) {
            alert("Failed to save comment: " + (error.message || "Unknown error"));
        } else {
            setComments(prev => [...prev, data]);
            setCommentText("");
            // Panel will show the new comment automatically through state
        }
        setIsSavingComment(false);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key) {
                case "ArrowLeft":
                case "ArrowUp":
                    if (currentIndex > 0) onNavigate(currentIndex - 1);
                    break;
                case "ArrowRight":
                case "ArrowDown":
                    if (currentIndex < allFiles.length - 1) onNavigate(currentIndex + 1);
                    break;
                case "Escape":
                    onClose();
                    break;
                case "i":
                    setActivePanel(prev => prev === "info" ? null : "info");
                    break;
                case "c":
                    setActivePanel(prev => prev === "comment" ? null : "comment");
                    break;
                case "v":
                    setActivePanel(prev => prev === "version" ? null : "version");
                    break;
                case "l":
                    setActivePanel(prev => prev === "logs" ? null : "logs");
                    break;
                case "Backspace":
                case "Delete":
                    if (!readOnly) handleDelete();
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, allFiles.length, onNavigate, onClose, handleDelete]);

    if (!currentFile) return null;

    // Calculate left navigation thumbnails (max 5)
    // we want currentIndex to be roughly in the middle if possible
    let startIdx = Math.max(0, currentIndex - 2);
    let endIdx = Math.min(allFiles.length - 1, startIdx + 4);

    if (endIdx - startIdx < 4) {
        startIdx = Math.max(0, endIdx - 4);
    }

    const thumbFiles = allFiles.slice(startIdx, endIdx + 1);

    return (
        <div
            className="fixed inset-0 z-[100] bg-background flex flex-col pt-[32px] pb-[40px] px-[24px] animate-blur-fade-in h-screen overflow-hidden"
            onContextMenu={(e) => {
                if (readOnly) e.preventDefault();
            }}
        >
            {/* Top action bar: Back button & Share */}
            <div className="w-full flex mx-auto mb-4 items-center justify-between">
                <div className="w-[80px] flex justify-center">
                    <button
                        onClick={onClose}
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-foreground transition-colors hover:bg-muted cursor-pointer"
                        title="Back to grid (Esc)"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                </div>

                {!readOnly && (
                    <button
                        onClick={handleShare}
                        disabled={shareState === "sharing"}
                        className={`flex items-center gap-[8px] px-[24px] py-[10px] rounded-[10px] border-2 border-foreground transition-all duration-300 font-bold cursor-pointer ${shareState === "copied"
                            ? "bg-foreground text-background"
                            : shareState === "error"
                                ? "bg-red-500 border-red-500 text-white"
                                : "bg-white text-foreground hover:bg-muted"
                            }`}
                        style={{ fontSize: '15px' }}
                    >
                        {shareState === "copied" ? "Copied!" : shareState === "error" ? "Error" : shareState === "sharing" ? "Sharing..." : "Share"}
                    </button>
                )}
            </div>

            <div className={`flex-1 w-full flex items-stretch justify-between mx-auto gap-[32px] relative`}>

                {/* LEFT COLUMN: Thumbnails (Balanced with Right Column for Centering) */}
                <div className="w-[300px] flex-shrink-0 flex flex-col justify-center items-start gap-[12px]">
                    <div className="flex flex-col gap-[12px] items-center w-[80px]">
                        {thumbFiles.map((file) => {
                            const actualIndex = allFiles.findIndex(f => f.id === file.id);
                            const isSelected = actualIndex === currentIndex;
                            return (
                                <button
                                    key={file.id}
                                    onClick={() => onNavigate(actualIndex)}
                                    className={`group relative flex-shrink-0 w-[60px] h-[80px] rounded-[8px] overflow-hidden border transition-all duration-300 cursor-pointer ${isSelected ? "border-foreground scale-110 shadow-md ring-4 ring-foreground/10" : "border-border/50 opacity-60 hover:opacity-100 hover:scale-105"
                                        }`}
                                >
                                    <Image src={file.url} alt={file.name} fill className="object-cover" unoptimized />

                                    {/* Dark overlay on unselected */}
                                    {!isSelected && (
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CENTER COLUMN: Main Image & Bottom Nav */}
                <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                    <div className="w-full relative flex items-center justify-center flex-1 min-h-[400px]">
                        {/* Using a wrapping div for the image to maintain aspect ratio/max size while fitting */}
                        <div
                            key={currentFile.id}
                            className={`relative w-full h-full animate-blur-fade-in ${readOnly
                                ? "cursor-crosshair"
                                : "max-h-[70vh] rounded-[16px] overflow-hidden border border-border/50 bg-[#f6f5f4] shadow-sm"
                                }`}
                            onMouseEnter={() => readOnly && setIsHoveringImage(true)}
                            onMouseLeave={() => readOnly && setIsHoveringImage(false)}
                            onMouseMove={(e) => {
                                if (!readOnly) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMousePos({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top
                                });
                            }}
                            onClick={() => {
                                if (readOnly && commentInputRef.current) {
                                    commentInputRef.current.focus();
                                }
                            }}
                        >
                            <Image
                                src={currentFile.url}
                                alt={currentFile.name}
                                fill
                                className="object-contain"
                                unoptimized
                            />

                            {/* Existing Comments as Pins */}
                            {readOnly && comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="absolute z-40 animate-blur-fade-in group/pin"
                                    style={{
                                        left: comment.x_coord,
                                        top: comment.y_coord,
                                        transform: 'translate(-50%, -50%)' // Center the simple text pin
                                    }}
                                >
                                    <div className="bg-[#e8e7e5] text-foreground rounded-[4px] shadow-sm flex items-center justify-center whitespace-nowrap" style={{ padding: '8px', fontSize: '13px', fontWeight: 500 }}>
                                        {comment.content}
                                    </div>
                                </div>
                            ))}

                            {/* Floating Comment Input for Shared Links */}
                            {readOnly && isHoveringImage && (
                                <div
                                    className="absolute pointer-events-auto z-50"
                                    style={{
                                        left: mousePos.x,
                                        top: mousePos.y,
                                        transform: 'translate(12px, 12px)'
                                    }}
                                >
                                    <div className="bg-background/95 backdrop-blur-sm border border-border shadow-2xl rounded-[14px] p-[8px] flex items-center gap-[10px] animate-in fade-in zoom-in duration-200 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                                        <div className="w-[28px] h-[28px] rounded-full bg-foreground flex items-center justify-center text-background flex-shrink-0" style={{ fontSize: '12px', fontWeight: 600 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                        </div>
                                        <input
                                            ref={commentInputRef}
                                            type="text"
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={handleSaveComment}
                                            placeholder="Write a comment..."
                                            className="bg-transparent border-none outline-none text-foreground w-full py-[4px]"
                                            style={{ fontSize: '13px', fontWeight: 500 }}
                                            disabled={isSavingComment}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Watermark for Shared Links (Centered & Diagonal) */}
                            {readOnly && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                                    <div className="transform -rotate-[30deg] opacity-10 flex flex-col items-center">
                                        <span className="text-foreground tracking-[0.5em] text-center" style={{ fontSize: "min(12vw, 80px)", fontWeight: 800, whiteSpace: "nowrap" }}>
                                            {readOnly && clientName ? clientName.toUpperCase() : "FRAMEFLOW"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Nav: < Pay > */}
                    <div className="flex items-center gap-[24px] mt-[48px] flex-shrink-0 relative">
                        {/* Tooltip hint above Pay */}
                        <div className="absolute -top-[32px] left-1/2 -translate-x-1/2 text-muted-foreground/50 whitespace-nowrap" style={{ fontSize: "11px" }}>
                            Use arrow keys to navigate
                        </div>

                        <button
                            onClick={() => currentIndex > 0 && onNavigate(currentIndex - 1)}
                            disabled={currentIndex === 0}
                            className="w-[48px] h-[48px] rounded-full flex items-center justify-center border border-border bg-background text-foreground transition-all duration-300 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer group"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1 group-disabled:translate-x-0">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>

                        <button 
                            onClick={handleDownload}
                            className="px-[48px] h-[48px] rounded-[12px] bg-foreground text-background flex items-center justify-center transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg" 
                            style={{ fontSize: "15px", fontWeight: 500 }}
                        >
                            <Download size={18} className="mr-2" />
                            Download
                        </button>

                        <button
                            onClick={() => currentIndex < allFiles.length - 1 && onNavigate(currentIndex + 1)}
                            disabled={currentIndex === allFiles.length - 1}
                            className="w-[48px] h-[48px] rounded-full flex items-center justify-center border border-border bg-background text-foreground transition-all duration-300 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer group"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1 group-disabled:translate-x-0">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Toolbar & Info Panel */}
                <div className="flex-shrink-0 flex gap-[16px] items-center justify-end min-w-[300px]">

                    {/* Slide-out Panel */}
                    {activePanel && (
                        <div
                            className="w-[280px] h-full max-h-[70vh] bg-background border border-border rounded-[16px] p-[24px] shadow-sm flex flex-col animate-panel-in"
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
                                    <h3 className="text-foreground mb-4 flex items-center gap-[8px]" style={{ fontSize: "16px", fontWeight: 600 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        Comments
                                    </h3>
                                    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
                                        {comments.length === 0 ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <p className="text-muted-foreground/60 text-center" style={{ fontSize: "14px" }}>No comments yet.</p>
                                            </div>
                                        ) : (
                                            comments.map((comment) => (
                                                <div key={comment.id} className="flex flex-col gap-[4px] p-[12px] bg-muted/30 rounded-[12px]">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-foreground font-semibold" style={{ fontSize: "13px" }}>{comment.author_name}</span>
                                                        <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                                                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-foreground/80" style={{ fontSize: "14px", lineHeight: "1.4" }}>{comment.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
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
                                    <div className="flex flex-col gap-2">
                                        <div className="p-3 border border-border rounded-[8px] flex items-center justify-between">
                                            <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>v1 (Current)</span>
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        </div>
                                    </div>
                                </>
                            )}
                            {activePanel === "favorite" && (
                                <>
                                    <h3 className="text-foreground mb-4 flex items-center gap-[8px]" style={{ fontSize: "16px", fontWeight: 600 }}>
                                        <Heart width={18} height={18} strokeWidth={2} />
                                        Favorites
                                    </h3>
                                    <div className="flex-1 flex items-center justify-center">
                                        <p className="text-muted-foreground/60 text-center" style={{ fontSize: "14px" }}>Click to favorite.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Vertical Toolbar Strip */}
                    <div className="w-[54px] bg-background border border-border rounded-[16px] overflow-hidden flex flex-col shadow-sm">
                        <button
                            onClick={() => setActivePanel(activePanel === "info" ? null : "info")}
                            className={`w-full aspect-square flex items-center justify-center transition-colors cursor-pointer ${activePanel === "info" ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}
                            title="Information (i)"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </button>
                        {!readOnly && (
                            <button
                                onClick={() => setActivePanel(activePanel === "comment" ? null : "comment")}
                                className={`w-full aspect-square flex items-center justify-center border-t border-border focus:outline-none transition-colors cursor-pointer ${activePanel === "comment" ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}
                                title="Comments (c)"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={() => setActivePanel(activePanel === "version" ? null : "version")}
                            className={`w-full aspect-square flex items-center justify-center border-t border-border focus:outline-none transition-colors cursor-pointer ${activePanel === "version" ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}
                            title="Versions (v)"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </button>
                        <button
                            onClick={handleToggleFavorite}
                            className={`w-full aspect-square flex items-center justify-center border-t border-border focus:outline-none transition-colors cursor-pointer ${isFavorite ? "text-red-500 bg-red-50/50" : "text-foreground hover:bg-muted"}`}
                            title="Favorite (f)"
                        >
                            <Heart width={20} height={20} strokeWidth={2} fill={isFavorite ? "currentColor" : "none"} />
                        </button>
                        {!readOnly && (
                            <button
                                onClick={handleDelete}
                                className="w-full aspect-square flex items-center justify-center border-t border-border focus:outline-none transition-colors cursor-pointer text-destructive hover:bg-destructive/10"
                                title="Delete (delete)"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
