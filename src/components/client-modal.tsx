import { useState, useEffect } from "react";
import { useClients } from "@/hooks/use-clients";

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ClientModal({ isOpen, onClose }: ClientModalProps) {
    const { addClient } = useClients();
    const [name, setName] = useState("");
    const [contact, setContact] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await addClient(name.trim(), contact.trim());

            // Reset form and close
            setName("");
            setContact("");
            onClose();
        } catch (error) {
            console.error("Failed to add client:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[24px]">
            {/* Backdrop Outline / Blur */}
            <div
                className="absolute inset-0 bg-background/50 pointer-events-auto animate-backdrop-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="relative w-full max-w-[420px] bg-background border border-border shadow-2xl rounded-[16px] flex flex-col pointer-events-auto overflow-hidden animate-slide-up-scale"
            >
                <div className="flex items-center justify-between p-[24px] border-b border-border">
                    <h2 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>New Client</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        style={{ fontSize: "14px", fontWeight: 500 }}
                    >
                        Back
                    </button>
                </div>

                <div className="p-[24px] max-h-[60vh] overflow-y-auto no-scrollbar">
                    <form id="modal-client-form" onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
                        {/* Client Name */}
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-muted-foreground ml-[2px]" style={{ fontSize: "13px", fontWeight: 500 }}>Client Name</label>
                            <input
                                type="text"
                                placeholder="E.g. Acme Corp"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-[46px] w-full rounded-[8px] border border-border bg-background px-[16px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-300 focus:border-foreground"
                                style={{ fontSize: "14px" }}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Contact Information */}
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-muted-foreground ml-[2px]" style={{ fontSize: "13px", fontWeight: 500 }}>Client Contact Information</label>
                            <textarea
                                placeholder="Email, phone number, physical address, or any other notes..."
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                className="w-full min-h-[120px] p-[16px] rounded-[8px] border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all resize-y placeholder:text-muted-foreground"
                                style={{ fontSize: "14px" }}
                            />
                        </div>
                    </form>
                </div>

                <div className="p-[24px] border-t border-border flex gap-[12px]">
                    <button
                        type="submit"
                        form="modal-client-form"
                        disabled={!name.trim() || isSubmitting}
                        className="w-full bg-foreground text-background h-[54px] rounded-[16px] flex items-center justify-center transition-transform duration-300 hover:scale-[0.98] active:scale-[0.96] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        style={{ fontSize: "15px", fontWeight: 500 }}
                    >
                        {isSubmitting ? "Adding..." : "Add Client"}
                    </button>
                </div>
            </div>
        </div>
    );
}
