import { useState } from "react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");
    const [country, setCountry] = useState("India");

    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(1);

    const nextStep = () => {
        setDirection(1);
        setCurrentStep((prev) => Math.min(prev + 1, 3));
    };

    const prevStep = () => {
        setDirection(-1);
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Payment submitted", { name, email, cardNumber, expiry, cvc, country });
        onClose();
        setName("");
        setEmail("");
        setCardNumber("");
        setExpiry("");
        setCvc("");
        setCountry("India");
        setCurrentStep(1);
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setCurrentStep(1);
            setDirection(1);
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-[24px]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/50 pointer-events-auto animate-backdrop-in"
                onClick={handleClose}
            />

            {/* Modal Content - Slide up from bottom */}
            <div
                className="relative w-full sm:max-w-[420px] bg-white sm:rounded-[24px] rounded-t-[24px] shadow-2xl flex flex-col pointer-events-auto overflow-hidden border border-border animate-slide-up"
            >
                {/* Mobile drag handle indicator */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-12 h-1.5 bg-border rounded-full" />
                </div>

                <div className="p-[24px] max-h-[85vh] overflow-y-auto no-scrollbar flex flex-col gap-[28px]">

                    <div className="relative flex items-center justify-center pb-[8px]">
                        {currentStep > 1 && (
                            <button
                                onClick={prevStep}
                                className="absolute left-0 w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                        )}
                        <h2 className="text-foreground" style={{ fontSize: "18px", fontWeight: 600 }}>Make a Payment</h2>
                        <button
                            onClick={handleClose}
                            className="absolute right-0 w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex items-center gap-[8px] mb-[4px]">
                        {[1, 2, 3].map((step) => (
                            <div
                                key={step}
                                className={`h-[4px] flex-1 rounded-full transition-colors duration-300 ${currentStep >= step ? "bg-foreground" : "bg-muted"}`}
                            />
                        ))}
                    </div>

                    <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-[24px] overflow-hidden relative">

                        {/* STEP 1: ORDER SUMMARY */}
                        {currentStep === 1 && (
                            <div
                                key="step1"
                                className={`flex flex-col gap-[12px] w-full ${direction > 0 ? "animate-slide-in-right" : "animate-slide-in-left"}`}
                            >
                                <div className="flex flex-col gap-[16px] p-[20px] bg-[#fafafa] rounded-[16px]">
                                    <div className="text-muted-foreground tracking-wide font-medium" style={{ fontSize: "11px", textTransform: "uppercase" }}>Order Summary</div>
                                    <div className="flex flex-col gap-[16px]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 400 }}>1 Image Asset</span>
                                            <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>$15.00</span>
                                        </div>
                                        <div className="w-full h-[1px] bg-border/40"></div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>Total</span>
                                            <span className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>$15.00</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="w-full bg-foreground text-background h-[56px] rounded-[16px] flex items-center justify-center transition-transform duration-300 hover:scale-[0.98] active:scale-[0.96] cursor-pointer mt-auto"
                                    style={{ fontSize: "16px", fontWeight: 500 }}
                                >
                                    Continue to Details
                                </button>
                            </div>
                        )}

                        {/* STEP 2: CUSTOMER DETAILS */}
                        {currentStep === 2 && (
                            <div
                                key="step2"
                                className={`flex flex-col gap-[12px] w-full ${direction > 0 ? "animate-slide-in-right" : "animate-slide-in-left"}`}
                            >
                                <div className="flex flex-col gap-[16px]">
                                    <div className="flex flex-col gap-[8px]">
                                        <label className="text-foreground" style={{ fontSize: "13px", fontWeight: 400 }}>Name</label>
                                        <input
                                            type="text"
                                            placeholder="Your Full Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-[52px] w-full rounded-[16px] bg-[#f8f8f8] px-[16px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-300 focus:bg-[#f0f0f0]"
                                            style={{ fontSize: "14px" }}
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-[8px]">
                                        <label className="text-foreground" style={{ fontSize: "13px", fontWeight: 400 }}>Email</label>
                                        <input
                                            type="email"
                                            placeholder="Order Delivery Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-[52px] w-full rounded-[16px] bg-[#f8f8f8] px-[16px] text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-300 focus:bg-[#f0f0f0]"
                                            style={{ fontSize: "14px" }}
                                            required
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={!name || !email}
                                    className="w-full bg-foreground text-background h-[56px] rounded-[16px] flex items-center justify-center transition-transform duration-300 hover:scale-[0.98] active:scale-[0.96] cursor-pointer mt-auto disabled:opacity-50 disabled:pointer-events-none"
                                    style={{ fontSize: "16px", fontWeight: 500 }}
                                >
                                    Continue to Payment
                                </button>
                            </div>
                        )}

                        {/* STEP 3: PAYMENT DETAILS */}
                        {currentStep === 3 && (
                            <div
                                key="step3"
                                className={`flex flex-col gap-[12px] w-full h-full ${direction > 0 ? "animate-slide-in-right" : "animate-slide-in-left"}`}
                            >
                                <div className="flex flex-col gap-[12px]">
                                    {/* Card Number */}
                                    <div className="relative h-[52px] w-full rounded-[16px] bg-[#f8f8f8] overflow-hidden flex items-center pr-[12px] focus-within:bg-[#f0f0f0] transition-colors duration-300">
                                        <input
                                            type="text"
                                            placeholder="1234 1234 1234 1234"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                            className="w-full h-full bg-transparent px-[16px] text-foreground placeholder:text-muted-foreground/60 outline-none"
                                            style={{ fontSize: "15px", letterSpacing: "1px" }}
                                            required
                                        />
                                        <div className="flex items-center gap-[6px] shrink-0 pointer-events-none">
                                            {/* Visa Mock */}
                                            <div className="w-[38px] h-[24px] bg-[#1a1f71] rounded-[4px] flex items-center justify-center">
                                                <span className="text-white font-bold italic" style={{ fontSize: "11px" }}>VISA</span>
                                            </div>
                                            {/* MC Mock */}
                                            <div className="w-[38px] h-[24px] bg-[#222222] rounded-[4px] flex items-center justify-center relative overflow-hidden">
                                                <div className="w-[14px] h-[14px] bg-[#ea001b] rounded-full absolute left-[4px]"></div>
                                                <div className="w-[14px] h-[14px] bg-[#f7a000] rounded-full absolute right-[4px] mix-blend-screen opacity-90"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MM/YY and CVC */}
                                    <div className="flex gap-[12px]">
                                        <input
                                            type="text"
                                            placeholder="mm / yy"
                                            value={expiry}
                                            onChange={(e) => setExpiry(e.target.value)}
                                            className="h-[52px] flex-1 rounded-[16px] bg-[#f8f8f8] px-[16px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors duration-300 focus:bg-[#f0f0f0]"
                                            style={{ fontSize: "15px" }}
                                            required
                                        />
                                        <div className="relative h-[52px] flex-1 rounded-[16px] bg-[#f8f8f8] overflow-hidden flex items-center pr-[16px] focus-within:bg-[#f0f0f0] transition-colors duration-300">
                                            <input
                                                type="text"
                                                placeholder="CVC"
                                                value={cvc}
                                                onChange={(e) => setCvc(e.target.value)}
                                                className="w-full h-full bg-transparent px-[16px] text-foreground placeholder:text-muted-foreground/60 outline-none"
                                                style={{ fontSize: "15px" }}
                                                required
                                            />
                                            <div className="text-muted-foreground/60 shrink-0 pointer-events-none">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                                                    <line x1="2" y1="10" x2="22" y2="10"></line>
                                                    <text x="14" y="15" fill="currentColor" stroke="none" fontSize="5" fontWeight="bold">123</text>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Country */}
                                    <div className="relative h-[52px] w-full rounded-[16px] bg-[#f8f8f8] overflow-hidden focus-within:bg-[#f0f0f0] transition-colors duration-300">
                                        <select
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            className="w-full h-full bg-transparent px-[16px] text-foreground appearance-none outline-none cursor-pointer"
                                            style={{ fontSize: "15px" }}
                                            required
                                        >
                                            <option value="India">India</option>
                                            <option value="United States">United States</option>
                                            <option value="United Kingdom">United Kingdom</option>
                                            <option value="Australia">Australia</option>
                                            <option value="Canada">Canada</option>
                                        </select>
                                        <div className="absolute right-[16px] top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-col gap-4">
                                    <p className="text-muted-foreground/80 leading-relaxed" style={{ fontSize: "13px" }}>
                                        By subscribing, you authorize s.page to charge you according to the terms until you cancel.
                                    </p>
                                    <div className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
                                        <span>powered by</span>
                                        <span className="text-foreground tracking-tighter" style={{ fontSize: "14px", fontWeight: 800 }}>stripe</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!cardNumber || !expiry || !cvc}
                                    className="w-full bg-foreground text-background h-[56px] rounded-[16px] flex items-center justify-center transition-transform duration-300 hover:scale-[0.98] active:scale-[0.96] cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-auto"
                                    style={{ fontSize: "16px", fontWeight: 500 }}
                                >
                                    Pay $15.00
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
