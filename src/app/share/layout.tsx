import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Shared Gallery — FrameFlow",
    description: "View shared photos on FrameFlow.",
};

export default function ShareLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex flex-col overflow-hidden">
            <div className="flex flex-1 w-full relative overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
