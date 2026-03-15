"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-context";

export default function CreateAccountPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { signUp } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsSubmitting(true);

        try {
            const { error: authError } = await signUp(email, password, fullName);
            if (authError) {
                setError(authError.message);
            } else {
                setSuccess("Account created! Check your email for a confirmation link, then sign in.");
                setTimeout(() => router.push("/login"), 3000);
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            {/* Left — Create Account Form */}
            <div className="flex items-center justify-center px-[36px] py-[48px]">
                <div className="w-full max-w-[360px] stagger-blur-fade-in">
                    {/* Brand */}
                    <div className="mb-[48px]">
                        <span className="tracking-wide text-foreground" style={{ fontSize: "15px" }}>
                            FrameFlow
                        </span>
                    </div>

                    {/* Heading */}
                    <div className="mb-[36px]">
                        <h1
                            className="text-foreground mb-[6px]"
                            style={{ fontSize: "24px", fontWeight: 400, lineHeight: 1.3 }}
                        >
                            Create your account
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
                            Start managing your creative workflow
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

                    {/* Success */}
                    {success && (
                        <div
                            className="mb-[18px] p-[12px] rounded-[6px] bg-green-500/10 border border-green-500/20 text-green-700"
                            style={{ fontSize: "13px" }}
                        >
                            {success}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-[18px]">
                        <Input
                            id="fullName"
                            type="text"
                            placeholder="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="h-[42px] rounded-[6px] border-border bg-[#e8e7e5] px-[12px] text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0"
                            style={{ fontSize: "15px" }}
                            required
                        />

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

                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="h-[42px] rounded-[6px] border-border bg-[#e8e7e5] px-[12px] pr-[42px] text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0"
                                style={{ fontSize: "15px" }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-[12px] top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-300"
                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            >
                                {showConfirmPassword ? (
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
                            style={{ fontSize: "15px", fontWeight: 400, marginTop: "24px" }}
                        >
                            {isSubmitting ? "Creating account..." : "Create account"}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="my-[24px] flex items-center gap-[12px]">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
                            or
                        </span>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Google Sign-up */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-[42px] rounded-[6px] border-border bg-transparent hover:bg-muted transition-all duration-300 cursor-pointer"
                        style={{ fontSize: "15px", fontWeight: 400 }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" className="mr-[8px]">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </Button>

                    {/* Terms */}
                    <p
                        className="mt-[18px] text-center text-muted-foreground"
                        style={{ fontSize: "12px", lineHeight: 1.6 }}
                    >
                        By creating an account, you agree to our{" "}
                        <Link href="#" className="underline underline-offset-4 hover:text-foreground transition-colors duration-300">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="#" className="underline underline-offset-4 hover:text-foreground transition-colors duration-300">
                            Privacy Policy
                        </Link>
                    </p>

                    {/* Sign in link */}
                    <p className="mt-[24px] text-center text-muted-foreground" style={{ fontSize: "15px" }}>
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-foreground hover:underline underline-offset-4 transition-all duration-300"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right — Hero Image */}
            <div className="relative hidden lg:block">
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
