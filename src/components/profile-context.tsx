"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-context";

export interface Profile {
    id: string;
    username: string | null;
    bio: string | null;
    instagram: string | null;
    youtube: string | null;
    vimeo: string | null;
    twitter: string | null;
    whatsapp: string | null;
    telegram: string | null;
    linkedin: string | null;
    contact_email: string | null;
    bank_name: string | null;
    account_number: string | null;
    routing_code: string | null;
    display_name: string | null;
    avatar_url: string | null;
}

interface ProfileContextType {
    profile: Profile | null;
    isLoading: boolean;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
    refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        if (!user) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    // Profile doesn't exist yet, which is fine
                    console.log("No profile found for user");
                } else {
                    console.error("Error fetching profile:", error);
                }
                setProfile(null);
            } else {
                setProfile(data);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return { error: "No user authenticated" };

        try {
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    ...updates,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;
            
            // Optimistically update local state
            setProfile(prev => prev ? { ...prev, ...updates } : (updates as Profile));
            
            return { error: null };
        } catch (error: any) {
            console.error("Error updating profile:", error);
            return { error };
        }
    };

    const refreshProfile = async () => {
        setIsLoading(true);
        await fetchProfile();
    };

    return (
        <ProfileContext.Provider value={{ profile, isLoading, updateProfile, refreshProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfileContext() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error("useProfileContext must be used within a ProfileProvider");
    }
    return context;
}
