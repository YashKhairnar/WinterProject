"use client";

import { useState } from "react";
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState<'signup' | 'confirm'>('signup');

    // Form Data
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");

    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { isSignUpComplete, nextStep } = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email,
                        phone_number: phone
                    }
                }
            });

            if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
                setStep('confirm');
            } else {
                // If no confirmation needed (rare for Cognito default)
                router.push("/login");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Signup failed.");
        } finally {
            setLoading(false);
        }
    };


    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { isSignUpComplete } = await confirmSignUp({
                username: email,
                confirmationCode: code
            });

            if (isSignUpComplete) {
                // Success! Redirect to login
                router.push("/login"); // or auto-login
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Verification failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="bg-card p-8 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-300 border border-border/50">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">
                        {step === 'signup' ? "Create Account" : "Verify Email"}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {step === 'signup'
                            ? "Join us to manage your cafe"
                            : `Enter the code sent to ${email}`
                        }
                    </p>
                </div>

                {step === 'signup' ? (
                    <form onSubmit={handleSignup} className="space-y-4">
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
                            <label className="text-sm font-medium text-foreground/80">Phone Number</label>
                            <input
                                type="tel"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                                placeholder="+1234567890"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground/80">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                                placeholder="Min 8 chars, 1 number, 1 special class"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/10"
                        >
                            {loading ? "Sending Code..." : "Sign Up"}
                        </button>

                        <div className="text-center pt-2">
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link href="/login" className="text-accent font-semibold hover:underline">
                                    Log in
                                </Link>
                            </p>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleConfirm} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground/80">Verification Code</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-center text-lg tracking-widest text-foreground"
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/10"
                        >
                            {loading ? "Verifying..." : "Confirm Account"}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('signup')}
                            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Back to Sign Up
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
