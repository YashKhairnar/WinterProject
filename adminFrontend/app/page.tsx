"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";


export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(() => {
        router.push("/dashboard");
      })
      .catch((err) => {
        console.log("No active session:", err);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background overflow-hidden font-sans">
      {/* Hero Section (Left) */}
      <div className="relative w-full md:w-1/2 lg:w-[60%] h-[40vh] md:h-screen overflow-hidden group">
        <img
          src="/hero.png"
          alt="Cozy Cafe"
          className="w-full h-full object-cover transition-transform duration-10000 group-hover:scale-110 ease-out brightness-[0.8]"
        />
        {/* Much stronger gradient for desktop and mobile */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/30 md:to-transparent" />

        {/* Hero Content Overlay */}
        <div className="absolute bottom-8 left-8 right-8 md:bottom-16 md:left-16 text-white max-w-lg space-y-4 animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="flex items-center gap-3 drop-shadow-lg">
            <span className="w-8 h-[2px] bg-primary-foreground/80" />
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-primary-foreground">Welcome to Nook</span>
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            Managing your <br className="hidden md:block" />
            perfect nook, <br className="hidden md:block" />
            <span className="text-accent italic font-serif opacity-95 underline decoration-accent/60 underline-offset-8">made simple.</span>
          </h2>
          <p className="text-white/95 text-lg md:text-xl font-medium tracking-tight max-w-sm hidden md:block drop-shadow-lg">
            Join the collective of premier hosts providing the ultimate focus spaces.
          </p>
        </div>
      </div>

      {/* Auth Section (Right) */}
      <main className="w-full md:w-1/2 lg:w-[40%] flex items-center justify-center p-8 md:p-16 lg:p-24 relative z-10 bg-background md:shadow-[-50px_0_100px_-20px_rgba(0,0,0,0.1)]">
        <div className="w-full max-w-sm space-y-12 animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">

          {/* Logo & Intro */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-black text-foreground tracking-tighter">nook</h1>
              <p className="text-muted-foreground/80 font-medium text-lg leading-relaxed">
                Your perfect nook, nearby.
              </p>
            </div>
          </div>

          {/* Auth Actions */}
          <div className="space-y-4">
            <Link
              href="/login"
              className="group flex items-center justify-center gap-3 w-full py-5 rounded-2xl bg-primary text-primary-foreground font-black text-lg hover:bg-primary/95 transition-all active:scale-[0.98] shadow-2xl shadow-primary/20"
            >
              Log In
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            <Link
              href="/signup"
              className="block w-full py-5 rounded-2xl bg-card border-2 border-border text-foreground font-bold text-center text-lg hover:bg-muted/50 transition-all active:scale-[0.98]"
            >
              Become a Host
            </Link>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground/60 font-bold tracking-widest">or continue with</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 py-4 px-6 rounded-2xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-all duration-300 hover:border-primary/20">
                <span className="font-bold">Google</span>
              </button>
            </div>
          </div>

          <footer className="pt-12 text-sm text-muted-foreground/50 font-medium">
            &copy; {new Date().getFullYear()} Nook Inc.
          </footer>
        </div>
      </main>
    </div>
  );
}
