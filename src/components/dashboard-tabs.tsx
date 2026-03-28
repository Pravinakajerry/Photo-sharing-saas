"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard-context";
import { SafeImage as Image } from "@/components/ui/safe-image";
import { useClients } from "@/hooks/use-clients";
import { useFiles, FileItem } from "@/hooks/use-files";
import InvoiceModal from "@/components/invoice-modal";
import ClientModal from "@/components/client-modal";
import { useLassoSelection } from "@/hooks/use-lasso-selection";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Download, Trash2, Headset, Instagram, Youtube, Video, Twitter, MessageCircle, Send, Linkedin, AtSign, FileText, Mail, Palette, LogOut, Check, Share, Copy } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/components/auth-context";
import { tabs, Tab, settingsTabs, SettingsTab } from "@/components/dashboard-context";

const emptyMessages: Record<Tab, string> = {
    Profile: "No files yet, upload your first file",
    Clients: "No clients yet, add your first client",
    Settings: "Settings are being configured",
};

interface DashboardTabsProps {
    activeTab: Tab;
}

export default function DashboardTabs({ activeTab }: DashboardTabsProps) {
    const router = useRouter();
    const { clients } = useClients();
    const { files, addFiles, removeFile, isLoaded, deletingIds } = useFiles();
    const {
        setActiveTab,
        settingsTab,
        setSettingsTab,
        setCopiedItems,
        setLastActionAt,
        copiedItems,
        setIsPasting,
        newlyAddedIds,
        setNewlyAddedIds,
        selectedIds,
        setSelectedIds
    } = useDashboard();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { selectionBox } = useLassoSelection(containerRef, selectedIds, setSelectedIds);
    const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [isClientModalOpen, setClientModalOpen] = useState(false);
    const [colCount, setColCount] = useState(6);
    const [isGridTransitioning, setIsGridTransitioning] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const { signOut, user } = useAuth();

    const handleColChange = (n: number) => {
        if (n === colCount) return;
        setIsGridTransitioning(true);
        setTimeout(() => {
            setColCount(n);
            setIsGridTransitioning(false);
        }, 300);
    };

    // Settings sub-navigation state (now from global context)
    const { profile, updateProfile, isLoading: isProfileLoading } = useProfile();

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        username: "",
        bio: "",
        instagram: "",
        youtube: "",
        vimeo: "",
        twitter: "",
        whatsapp: "",
        telegram: "",
        linkedin: "",
        contact_email: "",
        display_name: ""
    });

    const [paymentForm, setPaymentForm] = useState({
        bank_name: "",
        account_number: "",
        routing_code: ""
    });

    // Update form state when profile data loads
    useEffect(() => {
        if (profile) {
            setProfileForm({
                username: profile.username || "",
                bio: profile.bio || "",
                instagram: profile.instagram || "",
                youtube: profile.youtube || "",
                vimeo: profile.vimeo || "",
                twitter: profile.twitter || "",
                whatsapp: profile.whatsapp || "",
                telegram: profile.telegram || "",
                linkedin: profile.linkedin || "",
                contact_email: profile.contact_email || "",
                display_name: profile.display_name || ""
            });
            setPaymentForm({
                bank_name: profile.bank_name || "",
                account_number: profile.account_number || "",
                routing_code: profile.routing_code || ""
            });
        }
    }, [profile]);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({ ...prev, [name]: value }));
        setHasUnsavedChanges(true);
    };

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [showSavedMessage, setShowSavedMessage] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        await updateProfile(profileForm);
        setIsSavingProfile(false);
        setHasUnsavedChanges(false);
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 2000);
    };

    // Auto-save logic
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const timer = setTimeout(() => {
            handleSaveProfile();
        }, 2000);

        return () => clearTimeout(timer);
    }, [profileForm, hasUnsavedChanges]);

    const [isSavingPayment, setIsSavingPayment] = useState(false);
    const [showSavedPaymentMessage, setShowSavedPaymentMessage] = useState(false);
    const [hasUnsavedPaymentChanges, setHasUnsavedPaymentChanges] = useState(false);

    const handleSavePayment = async () => {
        setIsSavingPayment(true);
        await updateProfile(paymentForm);
        setIsSavingPayment(false);
        setHasUnsavedPaymentChanges(false);
        setShowSavedPaymentMessage(true);
        setTimeout(() => setShowSavedPaymentMessage(false), 2000);
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPaymentForm(prev => ({ ...prev, [name]: value }));
        setHasUnsavedPaymentChanges(true);
    };

    // Auto-save logic for Payment
    useEffect(() => {
        if (!hasUnsavedPaymentChanges) return;

        const timer = setTimeout(() => {
            handleSavePayment();
        }, 2000);

        return () => clearTimeout(timer);
    }, [paymentForm, hasUnsavedPaymentChanges]);

    const activeSettingsIndex = settingsTabs.indexOf(settingsTab);

    // Toggle selection
    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input or textarea
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            if (activeTab === "Profile") {
                if (e.key.toLowerCase() === "u") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                } else if ((e.key === "Backspace" || e.key === "Delete") && selectedIds.size > 0) {
                    // Prevent repeated triggers causing multiple deletions
                    if (e.repeat) return;
                    e.preventDefault();

                    const idsToDel = Array.from(selectedIds);
                    removeFile(idsToDel);
                    setSelectedIds(new Set());
                } else if (e.key.toLowerCase() === "c" && (e.metaKey || e.ctrlKey) && selectedIds.size > 0) {
                    e.preventDefault();
                    // Copy selected files to global clipboard
                    const itemsToCopy = files
                        .filter(f => selectedIds.has(f.id))
                        .map(f => ({ id: f.id, url: f.url }));
                    setCopiedItems(itemsToCopy);
                    setLastActionAt(Date.now());
                } else if (e.key.toLowerCase() === "v" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();

                    const handlePaste = async () => {
                        setIsPasting(true);

                        // Prioritize internal clipboard!
                        if (copiedItems.length > 0) {
                            const newIds = new Set(copiedItems.map(i => i.id));
                            setNewlyAddedIds(newIds);
                            setCopiedItems([]); // Reset internal clipboard immediately
                            setIsPasting(false);

                            // Clear the highlight after animation
                            setTimeout(() => {
                                setNewlyAddedIds(new Set());
                            }, 2000);
                        } else {
                            // Only check OS clipboard if app clipboard is empty
                            let externalFiles: File[] = [];
                            try {
                                const items = await navigator.clipboard.read();
                                for (const item of items) {
                                    const imageType = item.types.find(type => type.startsWith('image/'));
                                    if (imageType) {
                                        const blob = await item.getType(imageType);
                                        const ext = imageType.split('/')[1] || 'png';
                                        const file = new File([blob], `pasted_image_${Date.now()}.${ext}`, { type: imageType });
                                        externalFiles.push(file);
                                    }
                                }
                            } catch (error) {
                                console.error("Failed to read clipboard:", error);
                            }

                            if (externalFiles.length > 0) {
                                addFiles(externalFiles);
                                setIsPasting(false);
                            } else {
                                setIsPasting(false);
                            }
                        }
                    };

                    handlePaste();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTab, selectedIds, removeFile, setSelectedIds]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
            // Reset input so the same files can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div ref={containerRef} className="flex flex-col items-center w-full h-full relative">
            {/* Hidden File Input */}
            <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Content Area */}
            <div className="flex-1 w-full flex flex-col pt-[32px] pb-[100px]">
                <div
                    key={activeTab}
                    className="w-full flex flex-col flex-1 gap-[24px] animate-blur-fade-in"
                >
                    {activeTab === "Clients" && clients.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
                            {clients.map((client) => (
                                <div key={client.id} onClick={() => router.push(`/dashboard/client/${client.id}`)} className="group rounded-[16px] border border-border bg-background p-[20px] flex flex-col gap-[20px] transition-all duration-300 hover:border-foreground/20 cursor-pointer hover:shadow-sm">
                                    {/* Ghost Image Component (Max 3 visual) */}
                                    <div className="relative aspect-[4/3] w-full bg-[#f6f5f4] rounded-[10px] overflow-hidden flex items-center justify-center">
                                        <div className="flex -space-x-[16px]">
                                            {/* Stack of 3 images */}
                                            <div className="w-[72px] h-[96px] rounded-[6px] bg-[#e8e7e5] border-2 border-[#f6f5f4] shadow-sm rotate-[-8deg] transition-all duration-300 group-hover:rotate-[-12deg] overflow-hidden">
                                                {client.previewUrls?.[0] && (
                                                    <Image src={client.previewUrls[0]} alt="" width={72} height={96} className="w-full h-full object-cover" unoptimized />
                                                )}
                                            </div>
                                            <div className="w-[72px] h-[96px] rounded-[6px] bg-[#e8e7e5] border-2 border-[#f6f5f4] shadow-sm z-10 transition-all duration-300 group-hover:scale-105 overflow-hidden">
                                                {client.previewUrls?.[1] ? (
                                                    <Image src={client.previewUrls[1]} alt="" width={72} height={96} className="w-full h-full object-cover" unoptimized />
                                                ) : client.previewUrls?.[0] ? (
                                                    <Image src={client.previewUrls[0]} alt="" width={72} height={96} className="w-full h-full object-cover" unoptimized />
                                                ) : null}
                                            </div>
                                            <div className="w-[72px] h-[96px] rounded-[6px] bg-[#e8e7e5] border-2 border-[#f6f5f4] shadow-sm rotate-[8deg] z-20 transition-all duration-300 group-hover:rotate-[12deg] overflow-hidden">
                                                {client.previewUrls?.[2] ? (
                                                    <Image src={client.previewUrls[2]} alt="" width={72} height={96} className="w-full h-full object-cover" unoptimized />
                                                ) : client.previewUrls?.[0] ? (
                                                    <Image src={client.previewUrls[0]} alt="" width={72} height={96} className="w-full h-full object-cover" unoptimized />
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <h3 className="text-foreground" style={{ fontSize: "15px", fontWeight: 500 }}>{client.name}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === "Profile" && files.length > 0 && isLoaded ? (
                        <div className="flex flex-col gap-[48px] items-center w-full">
                            {/* Profile Header Component */}
                            <div className="flex flex-col items-center gap-[0px]">
                                <div className="flex flex-row items-center gap-[8px] py-[24px]">
                                    {/* Avatar */}
                                    <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-[3px] border-border/50 bg-muted shadow-lg shrink-0">
                                        <Image
                                            src={profile?.avatar_url || "/profile-photo-v2.jpg"}
                                            alt="Profile"
                                            width={100}
                                            height={100}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Name and Username */}
                                    <div className="flex flex-col items-start gap-[4px] mb-[8px]">
                                        <h1 className="text-[28px] font-medium tracking-tight text-foreground">
                                            {profile?.display_name || "Pravin Singh"}
                                        </h1>
                                        <div className="flex items-center gap-[4px] text-muted-foreground" style={{ fontSize: "14px" }}>
                                            <span>@{profile?.username || "singh"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons Container */}
                                <div className="flex items-center gap-[12px]">
                                    <div className="flex items-center gap-[8px]">
                                        <button 
                                            onClick={() => {
                                                setActiveTab("Settings");
                                                setSettingsTab("Profile");
                                            }}
                                            className="bg-[#1A1A1A] text-white px-[24px] py-[10px] rounded-full font-medium shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                                            style={{ fontSize: "14px" }}
                                        >
                                            Edit Profile
                                        </button>
                                        
                                        <button 
                                            onClick={async () => {
                                                if (!profile?.username) return;
                                                const url = `${window.location.origin}/@${profile.username}`;
                                                await navigator.clipboard.writeText(url);
                                                setShareCopied(true);
                                                setTimeout(() => setShareCopied(false), 2000);
                                            }}
                                            className="w-[40px] h-[40px] rounded-full bg-[#f6f5f4] border border-border/50 flex items-center justify-center text-foreground hover:bg-[#e8e7e5] transition-all cursor-pointer shadow-sm group relative"
                                            title="Copy profile link"
                                        >
                                            {shareCopied ? (
                                                <Check size={18} className="text-green-600 animate-in zoom-in duration-300" />
                                            ) : (
                                                <Share size={18} className="group-active:scale-90 transition-transform" />
                                            )}
                                        </button>
                                    </div>
                                    
                                    {/* Dynamic Social Icons */}
                                    <div className="flex items-center gap-[8px]">
                                        {[
                                            { id: 'instagram', icon: Instagram, url: profile?.instagram },
                                            { id: 'youtube', icon: Youtube, url: profile?.youtube },
                                            { id: 'vimeo', icon: Video, url: profile?.vimeo },
                                            { id: 'twitter', icon: Twitter, url: profile?.twitter },
                                            { id: 'whatsapp', icon: MessageCircle, url: profile?.whatsapp ? (profile.whatsapp.startsWith('http') ? profile.whatsapp : `https://wa.me/${profile.whatsapp}`) : null },
                                            { id: 'telegram', icon: Send, url: profile?.telegram ? (profile.telegram.startsWith('http') ? profile.telegram : `https://t.me/${profile.telegram}`) : null },
                                            { id: 'linkedin', icon: Linkedin, url: profile?.linkedin },
                                            { id: 'email', icon: AtSign, url: profile?.contact_email ? `mailto:${profile.contact_email}` : null },
                                        ].filter(link => link.url).map((link) => (
                                            <a
                                                key={link.id}
                                                href={link.url!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-[40px] h-[40px] rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
                                            >
                                                <link.icon size={18} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    ...(colCount === 2
                                        ? { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", maxWidth: "1440px", margin: "0 auto" }
                                        : { columnCount: colCount }
                                    ),
                                    opacity: isGridTransitioning ? 0 : 1,
                                    filter: isGridTransitioning ? 'blur(12px)' : 'blur(0px)',
                                    transform: isGridTransitioning ? 'scale(0.98)' : 'scale(1)',
                                    transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                className={colCount !== 2 ? "gap-[24px] space-y-[24px]" : ""}
                            >
                                {files.map((file) => {
                                    const isSelected = selectedIds.has(file.id);

                                    return colCount === 2 ? (
                                        /* Editorial card — object-contain + padding, like the reference */
                                        <div
                                            key={file.id}
                                            data-selectable-id={file.id}
                                            className={`relative group cursor-pointer select-none border bg-[#f6f5f4] transition-all duration-300 flex items-center justify-center overflow-hidden ${isSelected
                                                ? "border-foreground ring-1 ring-foreground animate-selection-pulse"
                                                : "border-border/50 hover:border-border"
                                                } ${newlyAddedIds.has(file.id) ? "animate-blur-fade-in" : ""} ${deletingIds.has(file.id) ? "opacity-0 blur-md scale-90 pointer-events-none" : ""}`}
                                            style={{ borderRadius: "12px", padding: "40px", aspectRatio: "7/8", maxHeight: "720px" }}
                                            onClick={(e) => {
                                                if (e.shiftKey || e.metaKey || e.ctrlKey || selectedIds.size > 0) {
                                                    e.preventDefault();
                                                    toggleSelection(e, file.id);
                                                    return;
                                                }
                                                localStorage.setItem("img.backUrl", "/dashboard");
                                                router.push(`/dashboard/image/${file.id}`);
                                            }}
                                        >
                                            <Image
                                                src={file.url}
                                                alt={file.name}
                                                width={600}
                                                height={800}
                                                className="h-full w-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02] pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                                                unoptimized
                                                draggable={false}
                                            />
                                            {(isSelected || selectedIds.size > 0) && (
                                                <div className="absolute inset-0 bg-black/5 pointer-events-none rounded-[12px]" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => toggleSelection(e, file.id)}
                                                className={`absolute top-[20px] left-[20px] w-[20px] h-[20px] rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer z-10 ${isSelected
                                                    ? "bg-foreground border-foreground scale-100"
                                                    : "bg-background/80 border-border scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100"
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-background" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        /* Masonry card */
                                        <div
                                            key={file.id}
                                            data-selectable-id={file.id}
                                            className={`break-inside-avoid relative group overflow-hidden border bg-[#f6f5f4] cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 select-none ${isSelected
                                                ? "border-foreground ring-1 ring-foreground animate-selection-pulse"
                                                : "border-border/50"
                                                } ${newlyAddedIds.has(file.id) ? "animate-blur-fade-in scale-105" : ""} ${deletingIds.has(file.id) ? "opacity-0 blur-md scale-90 pointer-events-none" : "opacity-100 blur-0 scale-100"}`}
                                            onClick={(e) => {
                                                if (e.shiftKey || e.metaKey || e.ctrlKey || selectedIds.size > 0) {
                                                    e.preventDefault();
                                                    toggleSelection(e, file.id);
                                                    return;
                                                }
                                                localStorage.setItem("img.backUrl", "/dashboard");
                                                router.push(`/dashboard/image/${file.id}`);
                                            }}
                                        >
                                            <Image
                                                src={file.url}
                                                alt={file.name}
                                                width={600}
                                                height={800}
                                                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03] pointer-events-none"
                                                unoptimized
                                                draggable={false}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-[20px] pointer-events-none">
                                                <p className="text-white truncate" style={{ fontSize: "14px", fontWeight: 500 }}>{file.name}</p>
                                            </div>
                                            {(isSelected || selectedIds.size > 0) && (
                                                <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => toggleSelection(e, file.id)}
                                                className={`absolute top-[12px] left-[12px] w-[20px] h-[20px] rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer z-10 ${isSelected
                                                    ? "bg-foreground border-foreground scale-100"
                                                    : "bg-background/80 border-border scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100"
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-background" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : activeTab === "Settings" ? (
                        <div className="w-full max-w-[620px] mx-auto flex flex-col gap-[32px]">
                            {/* Settings Sub-navigation (Centered Pill Style) */}
                            <div className="flex justify-center pb-[16px]">
                                <div className="inline-grid items-center rounded-full bg-[#e8e7e5] p-[4px] relative border border-border" style={{ gridTemplateColumns: `repeat(${settingsTabs.length}, minmax(0, 1fr))` }}>
                                    {/* Sliding pill indicator */}
                                    <div
                                        className="absolute rounded-full bg-background shadow-sm"
                                        style={{
                                            height: "calc(100% - 8px)",
                                            top: 4,
                                            left: 4,
                                            width: `calc(${100 / settingsTabs.length}% - ${8 / settingsTabs.length}px)`,
                                            transform: `translateX(calc(${activeSettingsIndex} * 100%))`,
                                            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                        }}
                                    />
                                    {settingsTabs.map((tab) => {
                                        const isActive = settingsTab === tab;
                                        return (
                                            <button
                                                key={tab}
                                                onClick={() => setSettingsTab(tab)}
                                                className={`relative flex items-center justify-center rounded-full px-[20px] py-[8px] transition-colors duration-300 cursor-pointer ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                style={{ fontSize: "14px", fontWeight: 400 }}
                                            >
                                                <span className="relative z-10">{tab}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Settings Content Sections */}
                            <div
                                key={settingsTab}
                                className="animate-blur-fade-in"
                            >
                                {settingsTab === "Profile" && (
                                    <div className="flex flex-col gap-[24px]">
                                        <div className="flex flex-col gap-[16px]">
                                            <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>Public Profile</h3>
                                            {isProfileLoading ? (
                                                <div className="flex items-center justify-center py-[20px]">
                                                    <div className="w-[20px] h-[20px] border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                                                    <div className="flex flex-col gap-[8px]">
                                                        <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                            <AtSign size={14} className="text-muted-foreground" /> Username
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="username"
                                                            value={profileForm.username}
                                                            onChange={handleProfileChange}
                                                            placeholder="pravin_singh"
                                                            className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-[8px]">
                                                        <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                            <Mail size={14} className="text-muted-foreground" /> Contact Email
                                                        </label>
                                                        <input
                                                            type="email"
                                                            name="contact_email"
                                                            value={profileForm.contact_email}
                                                            onChange={handleProfileChange}
                                                            placeholder="contact@example.com"
                                                            className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-[8px] md:col-span-2">
                                                        <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                            <FileText size={14} className="text-muted-foreground" /> Bio
                                                        </label>
                                                        <textarea
                                                            name="bio"
                                                            value={profileForm.bio}
                                                            onChange={handleProfileChange}
                                                            placeholder="Tell us about yourself..."
                                                            className="min-h-[100px] p-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full h-[1px] bg-border/50 my-[8px]" />

                                        <div className="flex flex-col gap-[16px]">
                                            <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>Social Links</h3>
                                            <div className="grid grid-cols-1 gap-[16px]">
                                                {/* Instagram */}
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                        <Instagram size={14} className="text-muted-foreground" /> Instagram
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="instagram"
                                                        value={profileForm.instagram}
                                                        onChange={handleProfileChange}
                                                        placeholder="https://instagram.com/..."
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                {/* Youtube */}
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                        <Youtube size={14} className="text-muted-foreground" /> Youtube
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="youtube"
                                                        value={profileForm.youtube}
                                                        onChange={handleProfileChange}
                                                        placeholder="https://youtube.com/..."
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                {/* Vimeo */}
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                        <Video size={14} className="text-muted-foreground" /> Vimeo
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="vimeo"
                                                        value={profileForm.vimeo}
                                                        onChange={handleProfileChange}
                                                        placeholder="https://vimeo.com/..."
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                {/* Twitter */}
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                        <Twitter size={14} className="text-muted-foreground" /> Twitter
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="twitter"
                                                        value={profileForm.twitter}
                                                        onChange={handleProfileChange}
                                                        placeholder="https://twitter.com/..."
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                {/* Whatsapp */}
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                        <MessageCircle size={14} className="text-muted-foreground" /> Whatsapp
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="whatsapp"
                                                        value={profileForm.whatsapp}
                                                        onChange={handleProfileChange}
                                                        placeholder="+1234567890"
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                {/* Telegram */}
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                        <Send size={14} className="text-muted-foreground" /> Telegram
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="telegram"
                                                        value={profileForm.telegram}
                                                        onChange={handleProfileChange}
                                                        placeholder="https://t.me/..."
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                {/* Linkedin */}
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground flex items-center gap-[6px]" style={{ fontSize: "14px", fontWeight: 500 }}>
                                                        <Linkedin size={14} className="text-muted-foreground" /> Linkedin
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="linkedin"
                                                        value={profileForm.linkedin}
                                                        onChange={handleProfileChange}
                                                        placeholder="https://linkedin.com/in/..."
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            {/* Removed local Save Profile button to move to fixed position */}
                                        </div>
                                    </div>
                                )}

                                {settingsTab === "Account" && (
                                    <div className="flex flex-col gap-[24px]">
                                        <div className="flex flex-col gap-[16px]">
                                            <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>Personal Information</h3>
                                            <div className="flex flex-col gap-[16px]">
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>Your Name</label>
                                                    <input
                                                        type="text"
                                                        name="display_name"
                                                        value={profileForm.display_name}
                                                        onChange={handleProfileChange}
                                                        placeholder="Pravin Singh"
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>Your Email</label>
                                                    <input
                                                        type="email"
                                                        value={user?.email || ""}
                                                        disabled
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-muted text-muted-foreground text-[14px] outline-none cursor-not-allowed opacity-70"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full h-[1px] bg-border/50 my-[8px]" />

                                        <div className="flex flex-col gap-[16px]">
                                            <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>Account Actions</h3>
                                            <div className="flex flex-col items-start gap-[12px]">
                                                {/* 1. Logout */}
                                                <button
                                                    onClick={() => signOut()}
                                                    className="flex items-center gap-[8px] h-[40px] px-[16px] rounded-[8px] border border-border bg-background hover:bg-muted text-foreground text-[14px] font-medium transition-colors cursor-pointer"
                                                >
                                                    <LogOut size={16} /> Logout
                                                </button>
                                                {/* 2. Connect for support */}
                                                <button className="flex items-center gap-[8px] h-[40px] px-[16px] rounded-[8px] bg-foreground text-background hover:opacity-90 text-[14px] font-medium transition-colors cursor-pointer">
                                                    <Headset size={16} /> Connect for support
                                                </button>
                                                {/* 3. Export all Data — disabled */}
                                                <button
                                                    disabled
                                                    className="flex items-center gap-[8px] h-[40px] px-[16px] rounded-[8px] border border-border bg-background text-muted-foreground text-[14px] font-medium cursor-not-allowed opacity-50"
                                                >
                                                    <Download size={16} /> Export all Data
                                                    <span className="ml-[6px] text-[11px] font-medium px-[6px] py-[2px] rounded-full bg-muted text-muted-foreground">Coming soon</span>
                                                </button>
                                                {/* 4. Delete Account — disabled */}
                                                <button
                                                    disabled
                                                    className="flex items-center gap-[8px] h-[40px] px-[16px] rounded-[8px] border border-destructive/10 bg-destructive/5 text-destructive/40 text-[14px] font-medium cursor-not-allowed opacity-50"
                                                >
                                                    <Trash2 size={16} /> Delete Account
                                                    <span className="ml-[6px] text-[11px] font-medium px-[6px] py-[2px] rounded-full bg-muted text-muted-foreground">Coming soon</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsTab === "Payment" && (
                                    <div className="flex flex-col gap-[24px]">
                                        <div className="flex flex-col gap-[16px]">
                                            <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>Bank Details</h3>
                                            <div className="flex flex-col gap-[16px]">
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>Bank Name</label>
                                                    <input
                                                        type="text"
                                                        name="bank_name"
                                                        value={paymentForm.bank_name}
                                                        onChange={handlePaymentChange}
                                                        placeholder="e.g. Chase Bank"
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>Account Number</label>
                                                    <input
                                                        type="text"
                                                        name="account_number"
                                                        value={paymentForm.account_number}
                                                        onChange={handlePaymentChange}
                                                        placeholder="e.g. 123456789"
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-[8px]">
                                                    <label className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>IFSC / Routing Code</label>
                                                    <input
                                                        type="text"
                                                        name="routing_code"
                                                        value={paymentForm.routing_code}
                                                        onChange={handlePaymentChange}
                                                        placeholder="e.g. CHASUS33"
                                                        className="h-[40px] px-[12px] rounded-[8px] border border-border bg-background text-foreground text-[14px] outline-none focus:border-foreground transition-colors"
                                                    />
                                                </div>
                                                {/* Removed local Save Changes button to move to fixed position */}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsTab === "Customize" && (
                                    <div className="flex flex-col items-center justify-center min-h-[300px] border border-border border-dashed rounded-[16px] bg-muted/20">
                                        <div className="w-[48px] h-[48px] rounded-full bg-muted flex items-center justify-center mb-[16px]">
                                            <Palette size={24} className="text-muted-foreground" />
                                        </div>
                                        <h3 className="text-foreground mb-[4px]" style={{ fontSize: "18px", fontWeight: 600 }}>Coming Soon</h3>
                                        <p className="text-muted-foreground text-center max-w-[300px]" style={{ fontSize: "14px" }}>
                                            Theme customization, brand colors, and custom domains will be available here soon.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                            <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
                                {emptyMessages[activeTab]}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Column Count Slider — Profiles only, bottom-right */}
            {activeTab === "Profile" && files.length > 0 && isLoaded && selectedIds.size === 0 && (
                <div className="fixed bottom-[32px] right-[32px] z-40">
                    <div
                        className="inline-flex items-center rounded-full p-[3px] relative shrink-0"
                        style={{
                            background: "rgba(232,231,229,0.55)",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(0,0,0,0.07)",
                        }}
                    >
                        {/* Sliding pill indicator */}
                        <div
                            className="absolute rounded-full bg-background shadow-sm"
                            style={{
                                width: 32, height: 32,
                                top: 3, left: 3,
                                transform: `translateX(${[2, 4, 6, 8, 10].indexOf(colCount) * 32}px)`,
                                transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            }}
                        />
                        {([2, 4, 6, 8, 10] as const).map((n) => (
                            <button
                                key={n}
                                onClick={() => handleColChange(n)}
                                className={`relative flex items-center justify-center rounded-full w-[32px] h-[32px] transition-colors duration-300 cursor-pointer z-10 ${colCount === n ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                style={{ fontSize: "12px", fontWeight: 500 }}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Floating Upload Pill Button */}
            {activeTab === "Profile" && selectedIds.size === 0 && (
                <div
                    className="fixed bottom-[40px] left-1/2 -translate-x-1/2 z-40 animate-pop-up"
                >
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-[8px] rounded-full bg-foreground text-background px-[24px] py-[12px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>Upload - U</span>
                    </button>
                </div>
            )}

            {/* Floating New Client Pill Button */}
            {activeTab === "Clients" && (
                <div
                    className="fixed bottom-[40px] left-1/2 -translate-x-1/2 z-40 animate-pop-up"
                >
                    <button
                        onClick={() => setClientModalOpen(true)}
                        className="flex items-center gap-[8px] rounded-full bg-foreground text-background px-[24px] py-[12px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>New Client</span>
                    </button>
                </div>
            )}

            {/* Floating Save Profile Pill Button */}
            {activeTab === "Settings" && settingsTab === "Profile" && !isProfileLoading && (
                <div
                    className="fixed bottom-[40px] left-1/2 -translate-x-1/2 z-40 animate-pop-up"
                >
                    <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="flex items-center gap-[8px] rounded-full px-[24px] py-[12px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer bg-foreground text-background"
                        style={{ minWidth: '140px', justifyContent: 'center' }}
                    >
                        {isSavingProfile && <div className="w-[14px] h-[14px] border-2 border-background/20 border-t-background rounded-full animate-spin" />}
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>
                            {isSavingProfile ? "Saving..." : showSavedMessage ? "Saved!" : "Save Profile"}
                        </span>
                    </button>
                </div>
            )}

            {/* Floating Save Account Pill Button */}
            {activeTab === "Settings" && settingsTab === "Account" && !isProfileLoading && (
                <div
                    className="fixed bottom-[40px] left-1/2 -translate-x-1/2 z-40 animate-pop-up"
                >
                    <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="flex items-center gap-[8px] rounded-full px-[24px] py-[12px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer bg-foreground text-background"
                        style={{ minWidth: '140px', justifyContent: 'center' }}
                    >
                        {isSavingProfile && <div className="w-[14px] h-[14px] border-2 border-background/20 border-t-background rounded-full animate-spin" />}
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>
                            {isSavingProfile ? "Saving..." : showSavedMessage ? "Saved!" : "Save"}
                        </span>
                    </button>
                </div>
            )}

            {/* Floating Save Payment Pill Button */}
            {activeTab === "Settings" && settingsTab === "Payment" && !isProfileLoading && (
                <div
                    className="fixed bottom-[40px] left-1/2 -translate-x-1/2 z-40 animate-pop-up"
                >
                    <button
                        onClick={handleSavePayment}
                        disabled={isSavingPayment}
                        className="flex items-center gap-[8px] rounded-full px-[24px] py-[12px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer bg-foreground text-background"
                        style={{ minWidth: '140px', justifyContent: 'center' }}
                    >
                        {isSavingPayment && <div className="w-[14px] h-[14px] border-2 border-background/20 border-t-background rounded-full animate-spin" />}
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>
                            {isSavingPayment ? "Saving..." : showSavedPaymentMessage ? "Saved!" : "Save Changes"}
                        </span>
                    </button>
                </div>
            )}

            {/* Context Action Bar when items are selected */}
            {selectedIds.size > 0 && activeTab === "Profile" && (
                <div className="fixed bottom-[40px] left-1/2 -translate-x-1/2 z-50 animate-pop-up">
                    <div className="flex items-center gap-[12px] bg-background border border-border shadow-2xl rounded-full pl-[20px] pr-[8px] py-[8px]">
                        <div className="flex items-center gap-[8px]">
                            <div className="w-[24px] h-[24px] rounded-full bg-foreground flex items-center justify-center text-background" style={{ fontSize: "12px", fontWeight: 600 }}>
                                <AnimatedCounter value={selectedIds.size} />
                            </div>
                            <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>Selected</span>
                        </div>
                        <div className="w-[1px] h-[24px] bg-border mx-[4px]"></div>
                        <div className="flex items-center gap-[4px]">
                            <button
                                onClick={() => {
                                    removeFile(Array.from(selectedIds));
                                    setSelectedIds(new Set());
                                }}
                                className="flex items-center gap-[6px] rounded-full px-[14px] py-[8px] text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                style={{ fontSize: "14px", fontWeight: 500 }}
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="flex items-center gap-[6px] rounded-full px-[14px] py-[8px] text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                style={{ fontSize: "14px", fontWeight: 500 }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lasso Selection Box */}
            {selectionBox && activeTab === "Profile" && (
                <div
                    className="fixed bg-foreground/10 border border-foreground/30 pointer-events-none z-50 rounded-[4px]"
                    style={{
                        left: selectionBox.x,
                        top: selectionBox.y,
                        width: selectionBox.width,
                        height: selectionBox.height
                    }}
                />
            )}

            <InvoiceModal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} />
            <ClientModal isOpen={isClientModalOpen} onClose={() => setClientModalOpen(false)} />
        </div>
    );
}
