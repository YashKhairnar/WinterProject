"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileHeaderProps {
    profileCompleted?: boolean;
    activeTab?: string;
    setActiveTab?: (tab: any) => void;
}

export default function MobileHeader({ profileCompleted, activeTab, setActiveTab }: MobileHeaderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const handleSignOut = async () => {
        try {
            const { signOut } = await import('aws-amplify/auth');
            await signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    return (
        <header className="md:hidden bg-card border-b border-border sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="nook" className="w-8 h-8 rounded-lg" />
                    <span className="font-bold text-xl tracking-tight text-foreground">nook</span>
                </div>
                <button
                    onClick={toggleMenu}
                    className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    {isOpen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <nav className="absolute top-full left-0 right-0 bg-card border-b border-border shadow-2xl p-6 space-y-2 animate-in slide-in-from-top duration-300">
                    <Link
                        href="/dashboard"
                        onClick={() => {
                            setActiveTab?.('map');
                            closeMenu();
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${pathname === '/dashboard' && (activeTab === 'map' || !activeTab)
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                    >
                        Seating Map
                    </Link>

                    <Link
                        href="/dashboard"
                        onClick={() => {
                            setActiveTab?.('reservations');
                            closeMenu();
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${pathname === '/dashboard' && activeTab === 'reservations'
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                    >
                        Reservations
                    </Link>

                    <Link
                        href={profileCompleted ? `/profile` : `/onboarding/setup`}
                        onClick={closeMenu}
                        className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/profile'
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                    >
                        Cafe Profile
                    </Link>

                    <div className="h-px bg-border my-2" />

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all border border-transparent"
                    >
                        <span>Sign Out</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    </button>
                </nav>
            )}
        </header>
    );
}
