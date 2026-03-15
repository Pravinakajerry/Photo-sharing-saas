"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-context";

export interface FileItem {
    id: string;
    name: string;
    url: string;
    type: string;
    createdAt: number;
    storagePath: string;
}

interface FilesContextType {
    files: FileItem[];
    isLoaded: boolean;
    addFiles: (newFiles: FileList | File[]) => Promise<void>;
    removeFile: (itemIds: string[]) => Promise<void>;
    renameFile: (id: string, newName: string) => Promise<void>;
    deletingIds: Set<string>;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

export function FilesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    // Load files from Supabase on mount
    useEffect(() => {
        if (!user) {
            setFiles([]);
            setIsLoaded(true);
            return;
        }

        const loadFiles = async () => {
            try {
                const { data, error } = await supabase
                    .from("files")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (error) throw error;

                setFiles(
                    (data || []).map((f) => ({
                        id: f.id,
                        name: f.name,
                        url: f.url,
                        type: f.type,
                        createdAt: new Date(f.created_at).getTime(),
                        storagePath: f.storage_path,
                    }))
                );
            } catch (error) {
                console.error("Failed to load files:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        loadFiles();
    }, [user]);

    const addFiles = useCallback(
        async (newFiles: FileList | File[]) => {
            if (!user) return;

            const fileArray = Array.from(newFiles).filter((file) =>
                file.type.startsWith("image/")
            );

            const newItems: FileItem[] = [];

            for (const file of fileArray) {
                try {
                    const fileExt = file.name.split(".").pop();
                    const fileName = `${crypto.randomUUID()}.${fileExt}`;
                    const storagePath = `${user.id}/${fileName}`;

                    // Upload to Supabase Storage
                    const { error: uploadError } = await supabase.storage
                        .from("photos")
                        .upload(storagePath, file);

                    if (uploadError) throw uploadError;

                    // Get public URL
                    const { data: urlData } = supabase.storage
                        .from("photos")
                        .getPublicUrl(storagePath);

                    const publicUrl = urlData.publicUrl;

                    // Insert into files table
                    const { data: insertedFile, error: insertError } = await supabase
                        .from("files")
                        .insert({
                            user_id: user.id,
                            name: file.name,
                            type: file.type,
                            storage_path: storagePath,
                            url: publicUrl,
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    newItems.push({
                        id: insertedFile.id,
                        name: insertedFile.name,
                        url: insertedFile.url,
                        type: insertedFile.type,
                        createdAt: new Date(insertedFile.created_at).getTime(),
                        storagePath: insertedFile.storage_path,
                    });
                } catch (error) {
                    console.error("Failed to upload file:", error);
                }
            }

            setFiles((prev) => [...newItems, ...prev]);
        },
        [user]
    );

    const removeFile = useCallback(
        async (itemIds: string[]) => {
            if (!user || itemIds.length === 0) return;

            // Optimistically mark as deleting to trigger animations
            setDeletingIds((prev) => {
                const newSet = new Set(prev);
                itemIds.forEach((id) => newSet.add(id));
                return newSet;
            });

            try {
                // Get storage paths for the files to delete
                const filesToDelete = files.filter((f) => itemIds.includes(f.id));

                // Delete from storage
                const storagePaths = filesToDelete.map((f) => f.storagePath);
                if (storagePaths.length > 0) {
                    await supabase.storage.from("photos").remove(storagePaths);
                }

                // Delete from database (comments will cascade)
                await supabase.from("files").delete().in("id", itemIds);

                // Wait a tiny bit more for the animation to finish
                setTimeout(() => {
                    setFiles((prev) => prev.filter((f) => !itemIds.includes(f.id)));
                    setDeletingIds((prev) => {
                        const newSet = new Set(prev);
                        itemIds.forEach((id) => newSet.delete(id));
                        return newSet;
                    });
                }, 300); // 300ms matches a typical CSS transition duration
            } catch (error) {
                console.error("Failed to delete files:", error);
                // Revert deleting state if failed
                setDeletingIds((prev) => {
                    const newSet = new Set(prev);
                    itemIds.forEach((id) => newSet.delete(id));
                    return newSet;
                });
            }
        },
        [user, files]
    );

    const renameFile = useCallback(
        async (id: string, newName: string) => {
            if (!user) return;

            const { error } = await supabase
                .from("files")
                .update({ name: newName })
                .eq("id", id);

            if (error) {
                console.error("Failed to rename file:", error);
                return;
            }

            setFiles((prev) =>
                prev.map((item) =>
                    item.id === id ? { ...item, name: newName } : item
                )
            );
        },
        [user]
    );

    return (
        <FilesContext.Provider value={{ files, isLoaded, addFiles, removeFile, renameFile, deletingIds }}>
            {children}
        </FilesContext.Provider>
    );
}

export function useFilesContext() {
    const context = useContext(FilesContext);
    if (context === undefined) {
        throw new Error("useFilesContext must be used within a FilesProvider");
    }
    return context;
}
