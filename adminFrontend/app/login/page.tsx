"use client";

import { useState } from "react";
import { signIn } from 'aws-amplify/auth';
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { isSignedIn, nextStep } = await signIn({ username: email, password });
            if (isSignedIn) {
                router.push("/dashboard");
            } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
                // Handle unconfirmed user case - maybe redirect to a confirm page? 
                // For now just show error
                setError("Please complete sign up verification.");
            } else {
                setError("Login failed. Please check your credentials.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred during sign in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="bg-card p-8 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-300 border border-border/50">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
                    <p className="text-muted-foreground mt-1">Sign in to manage your cafe</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/10"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>

                    <div className="text-center pt-2 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            New here?{" "}
                            <Link href="/signup" className="text-accent font-semibold hover:underline">
                                Create an account
                            </Link>
                        </p>
                        <div className="pt-2">
                            <Link href="/privacy" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline">
                                Privacy Policy
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
