import { useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-context";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const { user } = useAuth();
    const [message, setMessage] = useState("");
    const [emoji, setEmoji] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const emojis = ["😭", "🙁", "🙂", "🤩"];

    const handleSubmit = async () => {
        if (!message.trim()) return;

        setIsSubmitting(true);

        // Fail-safe user info
        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Unknown User";
        const userEmail = user?.email || "Unknown Email";

        try {
            const { error } = await supabase.from("feedbacks").insert({
                user_id: user?.id || null, // Fail safe if not logged in
                user_name: userName,
                user_email: userEmail,
                message: message.trim(),
                emoji_rating: emoji
            });

            if (error) {
                console.error("Failed to send feedback:", error);
            }

            setMessage("");
            setEmoji(null);
            onClose();
        } catch (error) {
            console.error("Failed to send feedback:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="p-0 gap-0 overflow-hidden rounded-[16px] max-w-[420px] bg-background border border-border shadow-2xl">
                <AlertDialogTitle className="sr-only">Provide Feedback</AlertDialogTitle>
                <AlertDialogDescription className="sr-only">
                    Send us your feedback and optional emoji rating.
                </AlertDialogDescription>

                {/* Content Area */}
                <div className="p-[20px] pb-[16px]">
                    <textarea
                        autoFocus
                        placeholder="Your feedback..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full min-h-[120px] resize-none outline-none text-foreground placeholder:text-muted-foreground bg-transparent"
                        style={{ fontSize: "15px" }}
                    />
                </div>

                {/* Footer Area with Emojis and Send Button */}
                <div className="flex items-center justify-between p-[12px] px-[20px] border-t border-border bg-[#FCFCFB] dark:bg-muted/10">
                    <div className="flex items-center gap-[12px]">
                        {emojis.map((e) => (
                            <button
                                key={e}
                                onClick={() => setEmoji(e)}
                                className={`text-[20px] transition-transform hover:scale-110 cursor-pointer ${emoji === e ? "opacity-100 scale-110" : "opacity-40 grayscale hover:grayscale-0 hover:opacity-100"
                                    }`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-[8px]">
                        <button
                            onClick={onClose}
                            className="bg-transparent text-muted-foreground hover:text-foreground px-[12px] py-[8px] rounded-[10px] text-[14px] font-medium transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!message.trim() || isSubmitting}
                            className="bg-foreground text-background px-[20px] py-[8px] rounded-[10px] text-[14px] font-medium transition-transform hover:scale-95 active:scale-90 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                            {isSubmitting ? "Sending..." : "Send"}
                        </button>
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
