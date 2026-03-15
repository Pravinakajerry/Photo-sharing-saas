"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-context";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { signIn } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const { error: authError } = await signIn(email, password);
            if (authError) {
                setError(authError.message);
            } else {
                router.push("/dashboard");
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid min-h-screen" style={{ gridTemplateColumns: '55fr 45fr' }}>
            {/* Left — Login Form */}
            <div className="flex items-center justify-center px-[36px] py-[48px]">
                <div className="w-full max-w-[360px] stagger-blur-fade-in">


                    {/* Heading */}
                    <div className="mb-[36px]">
                        <h1
                            className="text-foreground mb-[6px]"
                            style={{ fontSize: "24px", fontWeight: 400, lineHeight: 1.3 }}
                        >
                            Welcome back
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div
                            className="mb-[18px] p-[12px] rounded-[6px] bg-destructive/10 border border-destructive/20 text-destructive"
                            style={{ fontSize: "13px" }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-[18px]">
                        <Input
                            id="email"
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-[42px] rounded-[6px] border-border bg-[#e8e7e5] px-[12px] text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0"
                            style={{ fontSize: "15px" }}
                            required
                        />

                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-[42px] rounded-[6px] border-border bg-[#e8e7e5] px-[12px] pr-[42px] text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0"
                                style={{ fontSize: "15px" }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-[12px] top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-300"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-[42px] rounded-[6px] bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 cursor-pointer disabled:opacity-50"
                            style={{ fontSize: "15px", fontWeight: 400 }}
                        >
                            {isSubmitting ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>

                    {/* Bottom row: Create account (left) + Forgot password (right) */}
                    <div className="mt-[24px] flex items-center justify-between">
                        <Link
                            href="/create-account"
                            className="text-foreground hover:underline underline-offset-4 transition-all duration-300"
                            style={{ fontSize: "14px" }}
                        >
                            Create account
                        </Link>
                        <Link
                            href="#"
                            className="text-muted-foreground hover:underline underline-offset-4 transition-all duration-300"
                            style={{ fontSize: "14px" }}
                        >
                            Forgot password?
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right — Hero Image */}
            <div className="relative hidden lg:block" style={{ minWidth: 0 }}>
                <Image
                    src="/hero-bg.jpg"
                    alt="Editorial photography"
                    fill
                    className="object-cover"
                    priority
                    sizes="50vw"
                />
                <div className="absolute inset-0 bg-black/10" />
            </div>
        </div>
    );
}
