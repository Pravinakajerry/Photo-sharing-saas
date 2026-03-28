"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-context";

export interface Client {
    id: string;
    name: string;
    contact: string;
    createdAt: number;
    previewUrls?: string[];
}

interface ClientsContextType {
    clients: Client[];
    addClient: (name: string, contact: string) => Promise<void>;
    renameClient: (id: string, newName: string) => Promise<void>;
    updateClient: (id: string, name: string, contact: string) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;
    removeClient: (id: string) => Promise<void>;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export function ClientsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);

    // Load clients from Supabase on mount
    useEffect(() => {
        if (!user) {
            setClients([]);
            return;
        }

        const loadClients = async () => {
            try {
                const { data, error } = await supabase
                    .from("clients")
                    .select("*, client_files(files(url))")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                setClients(
                    (data || []).map((c) => ({
                        id: c.id,
                        name: c.name,
                        contact: c.contact,
                        createdAt: new Date(c.created_at).getTime(),
                        previewUrls: (c.client_files || [])
                            .map((cf: any) => cf.files?.url)
                            .filter(Boolean)
                            .slice(0, 3)
                    }))
                );
            } catch (error) {
                console.error("Failed to load clients:", error);
            }
        };

        loadClients();
    }, [user]);

    const addClient = useCallback(
        async (name: string, contact: string) => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from("clients")
                    .insert({
                        user_id: user.id,
                        name,
                        contact,
                    })
                    .select()
                    .single();

                if (error) throw error;

                const newClient: Client = {
                    id: data.id,
                    name: data.name,
                    contact: data.contact,
                    createdAt: new Date(data.created_at).getTime(),
                };

                setClients((prev) => [newClient, ...prev]);
            } catch (error) {
                console.error("Failed to add client:", error);
                throw error;
            }
        },
        [user]
    );

    const renameClient = useCallback(
        async (id: string, newName: string) => {
            if (!user) return;

            const { error } = await supabase
                .from("clients")
                .update({ name: newName })
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                console.error("Failed to rename client:", error);
                return;
            }

            setClients((prev) =>
                prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
            );
        },
        [user]
    );

    const updateClient = useCallback(
        async (id: string, name: string, contact: string) => {
            if (!user) return;

            const { error } = await supabase
                .from("clients")
                .update({ name, contact })
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                console.error("Failed to update client:", error);
                throw error;
            }

            setClients((prev) =>
                prev.map((c) => (c.id === id ? { ...c, name, contact } : c))
            );
        },
        [user]
    );

    const deleteClient = useCallback(
        async (id: string) => {
            if (!user) return;

            // 1. Get all linked file IDs + storage paths
            const { data: linkedFiles, error: fetchError } = await supabase
                .from("client_files")
                .select("file_id, files(id, storage_path)")
                .eq("client_id", id);

            if (fetchError) {
                console.error("Failed to fetch linked files:", fetchError);
                throw fetchError;
            }

            const fileIds = (linkedFiles || []).map((lf: any) => lf.file_id);
            const storagePaths = (linkedFiles || [])
                .map((lf: any) => lf.files?.storage_path)
                .filter(Boolean);

            // 2. Delete from storage
            if (storagePaths.length > 0) {
                await supabase.storage.from("photos").remove(storagePaths);
            }

            // 3. Delete file rows (cascade will clean client_files)
            if (fileIds.length > 0) {
                await supabase.from("files").delete().in("id", fileIds);
            }

            // 4. Delete client (cascade handles client_files)
            const { error } = await supabase
                .from("clients")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                console.error("Failed to delete client:", error);
                throw error;
            }

            setClients((prev) => prev.filter((c) => c.id !== id));
        },
        [user]
    );

    const removeClient = useCallback(
        async (id: string) => {
            if (!user) return;

            const { error } = await supabase
                .from("clients")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                console.error("Failed to delete client:", error);
                return;
            }

            setClients((prev) => prev.filter((c) => c.id !== id));
        },
        [user]
    );

    return (
        <ClientsContext.Provider
            value={{
                clients,
                addClient,
                renameClient,
                updateClient,
                deleteClient,
                removeClient,
            }}
        >
            {children}
        </ClientsContext.Provider>
    );
}

export function useClientsContext() {
    const context = useContext(ClientsContext);
    if (context === undefined) {
        throw new Error("useClientsContext must be used within a ClientsProvider");
    }
    return context;
}

