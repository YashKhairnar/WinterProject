"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
    profileCompleted?: boolean;
    activeTab?: string;
    setActiveTab?: (tab: any) => void;
}

export default function Sidebar({ profileCompleted, activeTab, setActiveTab }: SidebarProps) {
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

    return (
        <aside className="w-64 hidden md:block bg-card border-r border-border p-6 fixed h-full z-10">
            <div className="flex items-center gap-3 mb-8">
                <img src="/logo.png" alt="nook" className="w-8 h-8 rounded-lg" />
                <span className="font-bold text-xl tracking-tight text-foreground">nook</span>
            </div>

            <nav className="space-y-2">
                <Link
                    href="/dashboard"
                    onClick={() => setActiveTab?.('map')}
                    className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${pathname === '/dashboard' && (activeTab === 'map' || !activeTab)
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                >
                    Seating Map
                </Link>

                <Link
                    href="/dashboard"
                    onClick={() => setActiveTab?.('reservations')}
                    className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${pathname === '/dashboard' && activeTab === 'reservations'
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                >
                    Reservations
                </Link>

                <div className="h-px bg-border my-2" />

                <Link
                    href={profileCompleted ? `/profile` : `/onboarding/setup`}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/profile'
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                >
                    Cafe Profile
                </Link>
            </nav>

            <div className="absolute bottom-6 left-6 right-6">
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-transparent"
                >
                    <span>Sign Out</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </button>
            </div>
        </aside>
    );
}
