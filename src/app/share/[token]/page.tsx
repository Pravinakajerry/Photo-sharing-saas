"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { SafeImage as Image } from "@/components/ui/safe-image";
import { supabase } from "@/lib/supabase";
import { useLassoSelection } from "@/hooks/use-lasso-selection";
import ImageDetailView from "@/components/image-detail-view";
import type { FileItem } from "@/hooks/use-files";

interface ShareData {
    clientId: string;
    clientName: string;
    files: FileItem[];
}

export default function SharedGalleryPage() {
    const params = useParams();
    const token = params.token as string;
    const [data, setData] = useState<ShareData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewingFile, setViewingFile] = useState<FileItem | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadSharedData = async () => {
            try {
                // 1. Look up the share token
                const { data: share, error: shareError } = await supabase
                    .from("client_shares")
                    .select("client_id")
                    .eq("token", token)
                    .single();

                if (shareError || !share) {
                    setError("This link is invalid or has expired.");
                    return;
                }

                // 2. Get the client name
                const { data: client, error: clientError } = await supabase
                    .from("clients")
                    .select("name")
                    .eq("id", share.client_id)
                    .single();

                if (clientError || !client) {
                    setError("Client not found.");
                    return;
                }

                // 3. Get linked files
                const { data: clientFiles, error: filesError } = await supabase
                    .from("client_files")
                    .select(`
                        file_id,
                        files (
                            id,
                            name,
                            url,
                            type,
                            created_at,
                            storage_path
                        )
                    `)
                    .eq("client_id", share.client_id)
                    .order("created_at", { ascending: false });

                if (filesError) throw filesError;

                const files: FileItem[] = (clientFiles || [])
                    .filter((cf: any) => cf.files)
                    .map((cf: any) => ({
                        id: cf.files.id,
                        name: cf.files.name,
                        url: cf.files.url,
                        type: cf.files.type,
                        createdAt: new Date(cf.files.created_at).getTime(),
                        storagePath: cf.files.storage_path || "",
                    }));

                setData({ clientId: share.client_id, clientName: client.name, files });
            } catch (err) {
                console.error("Failed to load shared gallery:", err);
                setError("Something went wrong.");
            } finally {
                setIsLoading(false);
            }
        };

        loadSharedData();
    }, [token]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-[16px] animate-pulse">
                    <div className="w-[48px] h-[48px] rounded-full bg-muted" />
                    <p className="text-muted-foreground" style={{ fontSize: "15px" }}>Loading gallery...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !data) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-[16px] max-w-[400px] text-center">
                    <div className="w-[64px] h-[64px] rounded-full bg-muted flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h1 className="text-foreground" style={{ fontSize: "20px", fontWeight: 600 }}>
                        Gallery Not Found
                    </h1>
                    <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
                        {error || "This shared gallery doesn't exist or has been removed."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col relative" onContextMenu={(e) => e.preventDefault()}>
            {/* Image Detail View */}
            {viewingFile && (
                <ImageDetailView
                    currentFile={viewingFile}
                    allFiles={data.files}
                    readOnly
                    clientId={data.clientId}
                    clientName={data.clientName}
                    onClose={() => setViewingFile(null)}
                    onNavigate={(index) => {
                        if (data.files[index]) {
                            setViewingFile(data.files[index]);
                        }
                    }}
                />
            )}

            {/* Header */}
            <header className={`fixed top-0 left-0 w-full z-40 bg-background/80 backdrop-blur-md border-b border-border/50 ${viewingFile ? "hidden" : ""}`}>
                <div className="w-full mx-auto px-[24px] h-[73px] flex items-center justify-between">
                    <div className="flex items-center gap-[12px]">
                        <div className="w-[36px] h-[36px] rounded-full bg-foreground flex items-center justify-center text-background" style={{ fontSize: "14px", fontWeight: 700 }}>
                            {data.clientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>
                                {data.clientName}
                            </h1>
                            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                                {data.files.length} photo{data.files.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-[8px]">
                        <span className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.5px" }}>
                            FRAMEFLOW
                        </span>
                    </div>
                </div>
            </header>

            {/* Header Spacer for Fixed position */}
            <div className={`h-[73px] flex-shrink-0 ${viewingFile ? "hidden" : ""}`} />

            {/* Gallery Grid — exactly matching dashboard-tabs Files grid */}
            <main ref={containerRef} className="flex-1 w-full mx-auto px-[24px] pt-[32px] pb-[100px] relative">
                {data.files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-[120px] gap-[16px]">
                        <div className="w-[64px] h-[64px] rounded-full bg-muted flex items-center justify-center">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </div>
                        <p className="text-muted-foreground" style={{ fontSize: "15px" }}>No photos have been shared yet.</p>
                    </div>
                ) : (
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-[24px] space-y-[24px] animate-blur-fade-in">
                        {data.files.map((file) => {
                            return (
                                <div
                                    key={file.id}
                                    className="break-inside-avoid relative group rounded-[16px] overflow-hidden border border-border/50 bg-[#f6f5f4] cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 select-none"
                                    onClick={() => setViewingFile(file)}
                                >
                                    <Image
                                        src={file.url}
                                        alt={file.name}
                                        width={600}
                                        height={800}
                                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03] pointer-events-none"
                                        unoptimized
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-[20px] pointer-events-none">
                                        <p className="text-white truncate" style={{ fontSize: "14px", fontWeight: 500 }}>{file.name}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-border/50 py-[24px] mt-[40px]">
                <div className="w-full mx-auto px-[24px] flex items-center justify-center">
                    <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                        Shared via <span className="text-foreground" style={{ fontWeight: 600 }}>FrameFlow</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}
