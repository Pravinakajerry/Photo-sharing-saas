"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { SafeImage as Image } from "@/components/ui/safe-image";
import { useDashboard } from "@/components/dashboard-context";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/components/auth-context";
import { useLassoSelection } from "@/hooks/use-lasso-selection";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { supabase } from "@/lib/supabase";
import { Upload, X, Trash2 } from "lucide-react";

interface ClientFileLink {
    id: string;
    fileId: string;
    name: string;
    url: string;
    type: string;
}

type ClientTab = "Files" | "Information";

export default function ClientPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;
    const { clients } = useClients();
    const { user } = useAuth();
    const { setClientPageName, setClientPageId, setCopiedItems, setLastActionAt, copiedItems, setIsPasting, newlyAddedIds, setNewlyAddedIds } = useDashboard();
    const [activeTab, setActiveTab] = useState<ClientTab>("Files");
    const [clientFiles, setClientFiles] = useState<ClientFileLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const { selectedIds, selectionBox, setSelectedIds } = useLassoSelection(containerRef);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const client = clients.find((c) => c.id === clientId);

    // Set the client name + id in the header
    useEffect(() => {
        if (client) {
            setClientPageName(client.name);
            setClientPageId(client.id);
        }
        return () => {
            setClientPageName(null);
            setClientPageId(null);
        };
    }, [client, setClientPageName, setClientPageId]);

    // Load linked files from client_files join table
    const loadClientFiles = useCallback(async () => {
        if (!clientId) return;

        try {
            const { data, error } = await supabase
                .from("client_files")
                .select(`
                    id,
                    file_id,
                    files (
                        id,
                        name,
                        url,
                        type
                    )
                `)
                .eq("client_id", clientId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const mapped: ClientFileLink[] = (data || [])
                .filter((cf: any) => cf.files)
                .map((cf: any) => ({
                    id: cf.id,
                    fileId: cf.file_id,
                    name: cf.files.name,
                    url: cf.files.url,
                    type: cf.files.type,
                }));

            setClientFiles(mapped);
        } catch (error) {
            console.error("Failed to load client files:", error);
        } finally {
            setIsLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        loadClientFiles();
    }, [loadClientFiles]);

    // Upload files and link to this client
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user) return;

        const files = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));

        for (const file of files) {
            try {
                const fileExt = file.name.split(".").pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const storagePath = `${user.id}/${fileName}`;

                // Upload to storage
                const { error: uploadError } = await supabase.storage
                    .from("photos")
                    .upload(storagePath, file);

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from("photos")
                    .getPublicUrl(storagePath);

                // Insert into files table
                const { data: insertedFile, error: fileError } = await supabase
                    .from("files")
                    .insert({
                        user_id: user.id,
                        name: file.name,
                        type: file.type,
                        storage_path: storagePath,
                        url: urlData.publicUrl,
                    })
                    .select()
                    .single();

                if (fileError) throw fileError;

                // Link to client
                const { data: linkData, error: linkError } = await supabase
                    .from("client_files")
                    .insert({
                        client_id: clientId,
                        file_id: insertedFile.id,
                    })
                    .select()
                    .single();

                if (linkError) throw linkError;

                // Add to local state
                setClientFiles((prev) => [
                    {
                        id: linkData.id,
                        fileId: insertedFile.id,
                        name: insertedFile.name,
                        url: insertedFile.url,
                        type: insertedFile.type,
                    },
                    ...prev,
                ]);
            } catch (error) {
                console.error("Failed to upload file:", error);
            }
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePaste = async () => {
        if (copiedItems.length === 0 || !user) return;

        setIsPasting(true);
        const existingFileIds = new Set(clientFiles.map(cf => cf.fileId));
        const itemsToLink = copiedItems.filter(item => !existingFileIds.has(item.id));
        const newlyLinkedIds = new Set<string>();

        if (itemsToLink.length > 0) {
            try {
                const { data: linkData, error: linkError } = await supabase
                    .from("client_files")
                    .insert(itemsToLink.map(item => ({
                        client_id: clientId,
                        file_id: item.id
                    })))
                    .select("*, files(*)");

                if (linkError) throw linkError;

                if (linkData) {
                    const newLinks: ClientFileLink[] = linkData.map((ld: any) => {
                        newlyLinkedIds.add(ld.file_id);
                        return {
                            id: ld.id,
                            fileId: ld.files.id,
                            name: ld.files.name,
                            url: ld.files.url,
                            type: ld.files.type
                        };
                    });
                    setClientFiles(prev => [...newLinks, ...prev]);
                }
            } catch (error) {
                console.error("Failed to paste files:", error);
            }
        }

        setTimeout(() => {
            setNewlyAddedIds(newlyLinkedIds);
            setCopiedItems([]);
            setIsPasting(false);

            setTimeout(() => {
                setNewlyAddedIds(new Set());
            }, 2000);
        }, 400);
    };

    // Remove multiple file links from this client
    const handleRemoveFiles = async (linkIds: string[]) => {
        try {
            const { error } = await supabase
                .from("client_files")
                .delete()
                .in("id", linkIds);

            if (error) throw error;

            setClientFiles((prev) => prev.filter((f) => !linkIds.includes(f.id)));
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Failed to remove file links:", error);
        }
    };

    // Toggle selection
    const toggleSelection = (e: React.MouseEvent, linkId: string) => {
        e.stopPropagation();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(linkId)) {
                next.delete(linkId);
            } else {
                next.add(linkId);
            }
            return next;
        });
    };

    // Keyboard shortcut for upload (U) and delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (
                document.activeElement?.tagName === "INPUT" ||
                document.activeElement?.tagName === "TEXTAREA"
            ) {
                return;
            }

            if (activeTab === "Files") {
                if (e.key.toLowerCase() === "u") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                } else if ((e.key === "Backspace" || e.key === "Delete") && selectedIds.size > 0) {
                    if (e.repeat) return;
                    e.preventDefault();
                    handleRemoveFiles(Array.from(selectedIds));
                } else if (e.key.toLowerCase() === "c" && (e.metaKey || e.ctrlKey) && selectedIds.size > 0) {
                    e.preventDefault();
                    // Copy selected files to global clipboard
                    const itemsToCopy = clientFiles
                        .filter(f => selectedIds.has(f.id))
                        .map(f => ({ id: f.fileId, url: f.url }));
                    setCopiedItems(itemsToCopy);
                    setLastActionAt(Date.now());
                } else if (e.key.toLowerCase() === "v" && (e.metaKey || e.ctrlKey) && copiedItems.length > 0) {
                    e.preventDefault();
                    handlePaste();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTab, selectedIds, clientFiles, handleRemoveFiles, handlePaste, setCopiedItems, setLastActionAt, copiedItems]);

    if (!client) {
        return (
            <div className="flex-1 flex items-center justify-center pt-[73px]">
                <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
                    Client not found
                </p>
            </div>
        );
    }

    const activeTabIndex = activeTab === "Files" ? 0 : 1;

    return (
        <div ref={containerRef} className="flex-1 flex flex-col pt-[73px]">
            {/* Hidden file input */}
            <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* Content */}
            <div className="flex-1 w-full flex flex-col pt-[32px] pb-[100px]">
                {/* Tab Navigation (Centered) */}
                <div className="flex justify-center w-full px-[24px] mb-[32px]">
                    <div className="inline-grid grid-cols-2 items-center rounded-full bg-[#e8e7e5] p-[4px] relative border border-border">
                        {/* Sliding pill */}
                        <div
                            className="absolute rounded-full bg-background shadow-sm"
                            style={{
                                height: "calc(100% - 8px)",
                                top: 4,
                                left: 4,
                                width: `calc(50% - 4px)`,
                                transform: `translateX(${activeTabIndex * 100}%)`,
                                transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            }}
                        />
                        {(["Files", "Information"] as ClientTab[]).map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative flex items-center justify-center rounded-full px-[24px] py-[8px] transition-colors duration-300 cursor-pointer ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    style={{ fontSize: "14px", fontWeight: 400 }}
                                >
                                    <span className="relative z-10">{tab}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div key={activeTab} className="animate-blur-fade-in">
                    {activeTab === "Files" && (
                        <div className="w-full px-[24px]">
                            {isLoading ? (
                                <div className="flex items-center justify-center min-h-[300px]">
                                    <p className="text-muted-foreground animate-pulse" style={{ fontSize: "15px" }}>Loading files...</p>
                                </div>
                            ) : clientFiles.length > 0 ? (
                                <div className="animate-blur-fade-in columns-2 md:columns-3 lg:columns-4 gap-[24px] space-y-[24px]">
                                    {clientFiles.map((file) => {
                                        const isSelected = selectedIds.has(file.id);

                                        return (
                                            <div
                                                key={file.id}
                                                data-selectable-id={file.id}
                                                className={`break-inside-avoid relative group rounded-[16px] overflow-hidden border bg-[#f6f5f4] cursor-pointer shadow-sm hover:shadow-md transition-all duration-500 ease-out select-none ${isSelected
                                                    ? "border-foreground ring-1 ring-foreground animate-selection-pulse"
                                                    : "border-border/50"
                                                    } ${newlyAddedIds.has(file.fileId) ? "animate-blur-fade-in scale-105" : ""}`}
                                                onClick={(e) => {
                                                    if (e.shiftKey || e.metaKey || e.ctrlKey || selectedIds.size > 0) {
                                                        e.preventDefault();
                                                        toggleSelection(e, file.id);
                                                    } else {
                                                        router.push(`/dashboard/image/${file.fileId}`);
                                                    }
                                                }}
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

                                                {/* Selection Overlay */}
                                                {(isSelected || selectedIds.size > 0) && (
                                                    <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                                                )}

                                                {/* Checkbox */}
                                                <div
                                                    onClick={(e) => toggleSelection(e, file.id)}
                                                    className={`absolute top-[12px] left-[12px] w-[20px] h-[20px] rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${isSelected
                                                        ? "bg-foreground border-foreground scale-100"
                                                        : "bg-background/80 border-border scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100"
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-background" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[300px] border border-border border-dashed rounded-[16px] bg-muted/20">
                                    <div className="w-[48px] h-[48px] rounded-full bg-muted flex items-center justify-center mb-[16px]">
                                        <Upload size={20} className="text-muted-foreground" />
                                    </div>
                                    <h3 className="text-foreground mb-[4px]" style={{ fontSize: "16px", fontWeight: 600 }}>No files yet</h3>
                                    <p className="text-muted-foreground text-center max-w-[300px] mb-[20px]" style={{ fontSize: "14px" }}>
                                        Upload files to associate them with this client
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-[8px] rounded-full bg-foreground text-background px-[24px] py-[12px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        <span style={{ fontSize: "14px", fontWeight: 500 }}>Upload - U</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "Information" && (
                        <div className="flex flex-col gap-[24px] max-w-[480px] mx-auto">
                            <div className="flex flex-col gap-[16px]">
                                <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>Client Details</h3>
                                <div className="flex flex-col gap-[16px]">
                                    <div className="flex flex-col gap-[6px]">
                                        <label className="text-muted-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>Name</label>
                                        <div className="h-[46px] flex items-center px-[16px] rounded-[8px] border border-border bg-background text-foreground" style={{ fontSize: "14px" }}>
                                            {client.name}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-[6px]">
                                        <label className="text-muted-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>Contact Information</label>
                                        <div className="min-h-[100px] p-[16px] rounded-[8px] border border-border bg-background text-foreground whitespace-pre-wrap" style={{ fontSize: "14px" }}>
                                            {client.contact || "No contact information provided"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-[1px] bg-border/50" />

                            <div className="flex flex-col gap-[8px]">
                                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                                    Added on {new Date(client.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                </p>
                                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                                    {clientFiles.length} file{clientFiles.length !== 1 ? "s" : ""} associated
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Contextual Action Bar (Selected Mode) */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-[40px] left-1/2 -translate-x-1/2 z-50 animate-pop-up">
                    <div className="flex items-center gap-[12px] bg-background border border-border shadow-2xl rounded-full pl-[20px] pr-[8px] py-[8px]">
                        <div className="flex items-center gap-[8px]">
                            <div className="w-[24px] h-[24px] rounded-full bg-foreground flex items-center justify-center text-background" style={{ fontSize: "12px", fontWeight: 600 }}>
                                <AnimatedCounter value={selectedIds.size} />
                            </div>
                            <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>Selected</span>
                        </div>
                        <div className="w-[1px] h-[24px] bg-border mx-[4px]"></div>
                        <div className="flex items-center gap-[4px]">
                            <button
                                onClick={() => handleRemoveFiles(Array.from(selectedIds))}
                                className="flex items-center gap-[6px] rounded-full px-[14px] py-[8px] text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                style={{ fontSize: "14px", fontWeight: 500 }}
                            >
                                <X size={14} /> Unlink
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="flex items-center gap-[6px] rounded-full px-[14px] py-[8px] text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                style={{ fontSize: "14px", fontWeight: 500 }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Upload Button (only on Files tab, when files exist and nothing is selected) */}
            {activeTab === "Files" && clientFiles.length > 0 && selectedIds.size === 0 && (
                <div className="fixed bottom-[40px] left-1/2 -translate-x-1/2 z-40 animate-pop-up">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-[8px] rounded-full bg-foreground text-background px-[24px] py-[12px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>Upload - U</span>
                    </button>
                </div>
            )}

            {/* Lasso Selection Box */}
            {selectionBox && activeTab === "Files" && (
                <div
                    className="fixed bg-foreground/10 border border-foreground/30 pointer-events-none z-50 rounded-[4px]"
                    style={{
                        left: selectionBox.x,
                        top: selectionBox.y,
                        width: selectionBox.width,
                        height: selectionBox.height
                    }}
                />
            )}
        </div>
    );
}
