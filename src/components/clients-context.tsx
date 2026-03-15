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
                .eq("id", id);

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

    const removeClient = useCallback(
        async (id: string) => {
            if (!user) return;

            // Delete client_files links first, then the client (cascade should handle it but be safe)
            const { error } = await supabase
                .from("clients")
                .delete()
                .eq("id", id);

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

