import { useClients } from "@/hooks/use-clients";
import { useState } from "react";

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InvoiceModal({ isOpen, onClose }: InvoiceModalProps) {
    const { clients } = useClients();
    const [selectedClient, setSelectedClient] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("Thanks for doing business");

    // Get today's date in YYYY-MM-DD format for the min attribute
    const today = new Date().toISOString().split('T')[0];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here we would integrate with a useInvoices hook
        console.log("Submit invoice:", { selectedClient, amount, dueDate, email, message });
        onClose();
        // Reset form
        setSelectedClient("");
        setAmount("");
        setDueDate("");
        setEmail("");
        setMessage("Thanks for doing business");
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
                    <h2 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>New Invoice</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        style={{ fontSize: "14px", fontWeight: 500 }}
                    >
                        Back
                    </button>
                </div>

                <div className="p-[24px] max-h-[60vh] overflow-y-auto no-scrollbar">
                    <form id="modal-invoice-form" onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
                        {/* Select Client */}
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-muted-foreground ml-[2px]" style={{ fontSize: "13px", fontWeight: 500 }}>Client</label>
                            <div className="relative">
                                <select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    className="h-[46px] w-full rounded-[8px] border border-border bg-background px-[16px] text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors duration-300 font-medium cursor-pointer"
                                    style={{ fontSize: "14px" }}
                                    required
                                >
                                    <option value="" disabled>Select Client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-[16px] top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-muted-foreground ml-[2px]" style={{ fontSize: "13px", fontWeight: 500 }}>Amount</label>
                            <input
                                type="number"
                                placeholder="$ 0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === '-' || e.key === 'e') e.preventDefault();
                                }}
                                min="0"
                                step="0.01"
                                className="h-[46px] w-full rounded-[8px] border border-border bg-background px-[16px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-300 focus:border-foreground"
                                style={{ fontSize: "14px" }}
                                required
                            />
                        </div>

                        {/* Due Date */}
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-muted-foreground ml-[2px]" style={{ fontSize: "13px", fontWeight: 500 }}>Due Date</label>
                            <input
                                type="date"
                                placeholder="Due Date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                min={today}
                                className="h-[46px] w-full rounded-[8px] border border-border bg-background px-[16px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-300 focus:border-foreground"
                                style={{ fontSize: "14px" }}
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-muted-foreground ml-[2px]" style={{ fontSize: "13px", fontWeight: 500 }}>Client Email (Optional)</label>
                            <input
                                type="email"
                                placeholder="client@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-[46px] w-full rounded-[8px] border border-border bg-background px-[16px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-300 focus:border-foreground"
                                style={{ fontSize: "14px" }}
                            />
                        </div>

                        {/* Message */}
                        <div className="flex flex-col gap-[6px]">
                            <label className="text-muted-foreground ml-[2px]" style={{ fontSize: "13px", fontWeight: 500 }}>Message</label>
                            <textarea
                                placeholder="Message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full min-h-[100px] p-[16px] rounded-[8px] border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all resize-y placeholder:text-muted-foreground"
                                style={{ fontSize: "14px" }}
                            />
                        </div>
                    </form>
                </div>

                <div className="p-[24px] border-t border-border flex gap-[12px]">
                    <button
                        type="submit"
                        form="modal-invoice-form"
                        disabled={!selectedClient || !amount || !dueDate}
                        className="flex-1 bg-foreground text-background h-[54px] rounded-[16px] flex items-center justify-center transition-transform duration-300 hover:scale-[0.98] active:scale-[0.96] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        style={{ fontSize: "15px", fontWeight: 500 }}
                    >
                        Send Invoice
                    </button>
                    <button
                        type="button"
                        className="h-[54px] w-[54px] flex items-center justify-center border border-border rounded-[16px] text-foreground bg-background hover:bg-muted transition-colors flex-shrink-0 cursor-pointer"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
