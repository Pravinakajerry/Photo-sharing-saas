import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-context";

export interface Comment {
    id: string;
    text: string;
    createdAt: number;
}

export function useComments(fileId: string) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load comments from Supabase when fileId changes
    useEffect(() => {
        if (!user || !fileId) {
            setComments([]);
            setIsLoaded(true);
            return;
        }

        setIsLoaded(false);

        const loadComments = async () => {
            try {
                const { data, error } = await supabase
                    .from("comments")
                    .select("*")
                    .eq("file_id", fileId)
                    .order("created_at", { ascending: true });

                if (error) throw error;

                setComments(
                    (data || []).map((c) => ({
                        id: c.id,
                        text: c.text,
                        createdAt: new Date(c.created_at).getTime(),
                    }))
                );
            } catch (error) {
                console.error("Failed to load comments:", error);
                setComments([]);
            } finally {
                setIsLoaded(true);
            }
        };

        loadComments();
    }, [user, fileId]);

    const addComment = useCallback(
        async (text: string) => {
            if (!user || !fileId) return;

            try {
                const { data, error } = await supabase
                    .from("comments")
                    .insert({
                        file_id: fileId,
                        user_id: user.id,
                        text,
                    })
                    .select()
                    .single();

                if (error) throw error;

                const newComment: Comment = {
                    id: data.id,
                    text: data.text,
                    createdAt: new Date(data.created_at).getTime(),
                };

                setComments((prev) => [...prev, newComment]);
            } catch (error) {
                console.error("Failed to add comment:", error);
            }
        },
        [user, fileId]
    );

    return { comments, addComment, isLoaded };
}
