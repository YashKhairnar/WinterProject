"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthProtection } from "../hooks/useAuthProtection";

export default function DashboardPage() {
    const { isAuthenticated, loading, userId } = useAuthProtection();
    const [cafeId, setCafeId] = useState<string | null>(null);
    const [capacity, setCapacity] = useState(0);
    const [tables, setTables] = useState<{ id: number; seats: number; size: 2 | 4 }[]>([]);
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [selectedTableSize, setSelectedTableSize] = useState<2 | 4>(4); // For adding new tables
    const [profileCompleted, setProfileCompleted] = useState(false);
    const [baseCounts, setBaseCounts] = useState<{ two: number; four: number } | null>(null);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [loadingReservations, setLoadingReservations] = useState(false);
    const [activeTab, setActiveTab] = useState<'map' | 'reservations'>('map');
    const apiURL = process.env.NEXT_PUBLIC_API_URL;

    // URL normalization
    const cleanAPIURL = apiURL ? (apiURL.endsWith("/") ? apiURL.slice(0, -1) : apiURL) : "";

    // Fetch cafe_id on load
    useEffect(() => {
        if (isAuthenticated && userId) {
            console.log("DEBUG: Dashboard fetching cafe for user:", userId);
            fetchCafeDetails();
        }
    }, [isAuthenticated, userId]);


    // Fetch cafe details
    const fetchCafeDetails = async () => {
        if (!cleanAPIURL) {
            console.error("DEBUG: NEXT_PUBLIC_API_URL is missing");
            return;
        }
        try {
            const ownerURL = `${cleanAPIURL}/cafes/owner/${userId}`;
            console.log("DEBUG: Dashboard fetching cafe for userId:", userId, "from URL:", ownerURL);
            const response = await fetch(ownerURL);

            if (response.ok) {
                const data = await response.json();
                console.log("DEBUG: received cafe data for dashboard:", data);
                setCafeId(data.id);
                setProfileCompleted(data.onboarding_completed);
                setBaseCounts({ two: data.two_tables || 0, four: data.four_tables || 0 });

                // 1. If we have a saved configuration (non-empty), use it
                if (data.table_config && (
                    (Array.isArray(data.table_config) && data.table_config.length > 0) ||
                    (!Array.isArray(data.table_config) && typeof data.table_config === 'object' && Object.keys(data.table_config).length > 0)
                )) {
                    console.log("DEBUG: using saved table_config", data.table_config);

                    if (Array.isArray(data.table_config) && data.table_config.length > 0) {
                        // Detailed List View
                        const normalizedTables = data.table_config.map((t: any) => ({
                            ...t,
                            id: typeof t.id === 'string' ? parseInt(t.id) : t.id,
                            seats: t.seats ?? 0
                        }));
                        setTables(normalizedTables);
                        const totalCapacity = normalizedTables.reduce((acc: number, t: any) => acc + (t.size || 0), 0);
                        setCapacity(totalCapacity);
                    }
                    else if (typeof data.table_config === 'object' && !Array.isArray(data.table_config)) {
                        // Summary Dict View (Default Config)
                        // Needs hydration to visual map
                        console.log("DEBUG: hydrating from summary config");
                        const generatedTables: { id: number; seats: number; size: 2 | 4 }[] = [];
                        let tId = 1;

                        const twoConfig = data.two_tables;
                        const fourConfig = data.four_tables;

                        // Create 2-seat tables
                        for (let i = 0; i < (twoConfig || 0); i++) {
                            generatedTables.push({ id: tId++, size: 2, seats: 0 });
                        }
                        // Create 4-seat tables
                        for (let i = 0; i < (fourConfig || 0); i++) {
                            generatedTables.push({ id: tId++, size: 4, seats: 0 });
                        }

                        setTables(generatedTables);
                        setCapacity(((twoConfig || 0) * 2) + ((fourConfig || 0) * 4));
                    }
                }
                // 2. Otherwise, generate a default layout from the table counts
                else if (data.two_tables > 0 || data.four_tables > 0) {
                    console.log("DEBUG: generating default layout from counts", { two: data.two_tables, four: data.four_tables });
                    const generatedTables: { id: number; seats: number; size: 2 | 4 }[] = [];
                    let tId = 1;

                    // Create 2-seat tables
                    for (let i = 0; i < (data.two_tables || 0); i++) {
                        generatedTables.push({ id: tId++, size: 2, seats: 0 });
                    }
                    // Create 4-seat tables
                    for (let i = 0; i < (data.four_tables || 0); i++) {
                        generatedTables.push({ id: tId++, size: 4, seats: 0 });
                    }

                    setTables(generatedTables);
                    setCapacity((data.two_tables * 2) + (data.four_tables * 4));
                } else {
                    console.log("DEBUG: no tables found in data");
                }
            } else if (response.status === 404) {
                console.log("DEBUG: Cafe not found (404) - Profile not setup yet");
            } else {
                const err = await response.text();
                console.error("DEBUG: fetchCafeDetails failed:", response.status, err);
            }
        } catch (error) {
            console.error("DEBUG: Error fetching cafe details:", error);
        }
    };

    // Fetch reservations for this cafe
    const fetchReservations = async () => {
        if (!cafeId || !cleanAPIURL) return;

        setLoadingReservations(true);
        try {
            const response = await fetch(`${cleanAPIURL}/reservations/cafe/${cafeId}`);
            if (response.ok) {
                const data = await response.json();
                setReservations(data);
            }
        } catch (error) {
            console.error("DEBUG: Error fetching reservations:", error);
        } finally {
            setLoadingReservations(false);
        }
    };

    // Update reservation status
    const updateReservationStatus = async (reservationId: string, status: string) => {
        if (!cleanAPIURL) return;

        try {
            const response = await fetch(`${cleanAPIURL}/reservations/${reservationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                await fetchReservations();
            }
        } catch (error) {
            console.error("DEBUG: Error updating reservation:", error);
        }
    };

    // Fetch reservations when cafeId is available
    useEffect(() => {
        if (cafeId) {
            fetchReservations();
        }
    }, [cafeId]);


    const syncOccupancy = async (currentTables: { id: number; seats: number; size: 2 | 4 }[]) => {
        if (!cafeId) return;

        const two_tables = currentTables.filter(t => t.size === 2).length;
        const four_tables = currentTables.filter(t => t.size === 4).length;

        const two_table_seats = two_tables * 2;
        const four_table_seats = four_tables * 4;

        const two_tables_occupied = currentTables.filter(t => t.size === 2 && t.seats > 0).length;
        const four_tables_occupied = currentTables.filter(t => t.size === 4 && t.seats > 0).length;

        const two_seats_occupied = currentTables.filter(t => t.size === 2).reduce((acc, t) => acc + t.seats, 0);
        const four_seats_occupied = currentTables.filter(t => t.size === 4).reduce((acc, t) => acc + t.seats, 0);

        const payload = {
            cafe_id: cafeId,
            two_tables,
            four_tables,
            two_table_seats,
            four_table_seats,
            two_tables_occupied,
            four_tables_occupied,
            two_seats_occupied,
            four_seats_occupied,
            table_config: currentTables
        };

        try {
            await fetch(`${cleanAPIURL}/occupancy/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error("DEBUG: Error syncing occupancy:", error);
        }
    };


    // Auto-sync whenever tables change
    // Auto-sync useEffect removed. Changes are now manual.



    // Derived State
    const occupied = tables.reduce((acc, t) => acc + t.seats, 0);
    const occupancyRate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

    // Loading/Auth checks come AFTER all hooks are declared
    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!isAuthenticated) return null;

    const handleSave = async () => {
        if (!cafeId) return;

        console.log("DEBUG: Saving table config...", tables);

        // Calculate counts from the current visual state
        const two_tables = tables.filter(t => t.size === 2).length;
        const four_tables = tables.filter(t => t.size === 4).length;

        try {
            await fetch(`${cleanAPIURL}/cafes/${cafeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    two_tables,
                    four_tables,
                    table_config: tables
                })
            });

            // Also force an occupancy sync
            await syncOccupancy(tables);

            setUnsavedChanges(false);
            // Reload to ensure everything is in sync
            await fetchCafeDetails();
        } catch (error) {
            console.error("DEBUG: Error saving table config:", error);
            alert("Failed to save changes. Please try again.");
        }
    };


    const addTable = (size: 2 | 4) => {
        const newTable = {
            id: tables.length > 0 ? Math.max(...tables.map(t => t.id)) + 1 : 1,
            seats: 0,
            size: size
        };
        const updatedTables = [...tables, newTable];
        setTables(updatedTables);
        setCapacity(prev => prev + size);
        setUnsavedChanges(true);
    };

    const removeLastTable = () => {
        if (tables.length > 0) {
            const lastTable = tables[tables.length - 1];
            const updatedTables = tables.slice(0, -1);
            setTables(updatedTables);
            setCapacity(prev => Math.max(0, prev - lastTable.size));
            setUnsavedChanges(true);
        }
    };

    const updateTableSeats = (tableId: number, seats: number) => {
        const updatedTables = tables.map(t => t.id === tableId ? { ...t, seats } : t);
        setTables(updatedTables);
        setSelectedTable(null);
        setUnsavedChanges(true);
    };

    const getTableMaxSeats = (tableId: number): number => {
        const table = tables.find(t => t.id === tableId);
        return table?.size || 4;
    };

    const handleReset = () => {
        if (!baseCounts) {
            console.error("DEBUG: Cannot reset, baseCounts not loaded");
            return;
        }

        console.log("DEBUG: Resetting floor plan to base counts", baseCounts);
        const generatedTables: { id: number; seats: number; size: 2 | 4 }[] = [];
        let tId = 1;

        // Create 2-seat tables
        for (let i = 0; i < baseCounts.two; i++) {
            generatedTables.push({ id: tId++, size: 2, seats: 0 });
        }
        // Create 4-seat tables
        for (let i = 0; i < baseCounts.four; i++) {
            generatedTables.push({ id: tId++, size: 4, seats: 0 });
        }

        // Create Summary Config for Reset (Default State)
        const summaryConfig = {
            "2_seats_table": {
                "total": baseCounts.two,
                "occupied_seats": 0,
                "occupied_tables": 0
            },
            "4_seats_table": {
                "total": baseCounts.four,
                "occupied_seats": 0,
                "occupied_tables": 0
            }
        };

        setTables(generatedTables);
        setCapacity((baseCounts.two * 2) + (baseCounts.four * 4));
        setUnsavedChanges(true);
    };



    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 hidden md:block bg-card border-r border-border p-6 fixed h-full z-10">
                <div className="flex items-center gap-3 mb-8">
                    <img src="/logo.png" alt="nook" className="w-8 h-8 rounded-lg" />
                    <span className="font-bold text-xl tracking-tight text-foreground">nook</span>
                </div>

                <nav className="space-y-2">
                    <button
                        onClick={() => setActiveTab('map')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'map'
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                    >
                        Seating Map
                    </button>

                    <button
                        onClick={() => setActiveTab('reservations')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'reservations'
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                    >
                        Reservations
                    </button>

                    <div className="h-px bg-border my-2" />

                    <Link
                        href={profileCompleted ? `/profile` : `/onboarding/setup`}
                        className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                    >
                        Cafe Profile
                    </Link>
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={async () => {
                            try {
                                const { signOut } = await import('aws-amplify/auth');
                                await signOut();
                                window.location.href = '/login';
                            } catch (error) {
                                console.error('Error signing out:', error);
                            }
                        }}
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

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                {activeTab === 'map' ? (
                    <>
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-1 text-foreground">
                                    Seating Manager
                                </h1>
                                <p className="text-muted-foreground">
                                    Live view of your cafe's floor plan.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className={`px-4 py-2 rounded-full font-semibold border ${occupancyRate > 80 ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                    occupancyRate > 50 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                        "bg-green-500/10 border-green-500/20 text-green-500"
                                    }`}>
                                    {occupancyRate}% Full
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={!unsavedChanges}
                                    className={`px-6 py-2 rounded-full font-bold transition-all shadow-sm ${unsavedChanges
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-md animate-pulse"
                                        : "bg-muted text-muted-foreground/50 cursor-not-allowed"}`}
                                >
                                    {unsavedChanges ? "Save Changes" : "Saved"}
                                </button>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Controls Panel */}
                            <div className="space-y-6">
                                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-4 text-foreground">Seating Limits</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-muted-foreground">Add Tables</span>
                                                <span className="font-bold text-foreground">{capacity} Seats Total</span>
                                            </div>

                                            {/* Table Size Selector */}
                                            <div className="flex gap-2 mb-3 p-1 bg-muted rounded-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTableSize(2)}
                                                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedTableSize === 2
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground"
                                                        }`}
                                                >
                                                    2-Seat
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTableSize(4)}
                                                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedTableSize === 4
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground"
                                                        }`}
                                                >
                                                    4-Seat
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => removeLastTable()}
                                                    disabled={!profileCompleted}
                                                    className={`w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted/50 active:scale-95 transition-all text-muted-foreground ${profileCompleted ? "" : "opacity-30 cursor-not-allowed"}`}
                                                >
                                                    -
                                                </button>
                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary" style={{ width: "100%" }} />
                                                </div>
                                                <button
                                                    onClick={() => addTable(selectedTableSize)}
                                                    disabled={!profileCompleted}
                                                    className={`w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted/50 active:scale-95 transition-all text-muted-foreground ${profileCompleted ? "" : "opacity-30 cursor-not-allowed"}`}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <p className="text-xs text-muted-foreground/60 mt-2 text-center">Select size above, then click + to add</p>
                                        </div>

                                        <div className="pt-4 border-t border-border/50">
                                            <button
                                                onClick={() => {
                                                    if (confirm("This will remove all custom tables and reset all guests to zero. Continue?")) {
                                                        handleReset();
                                                    }
                                                }}
                                                disabled={!profileCompleted}
                                                className={`w-full py-2 rounded-lg text-sm font-semibold border-2 border-red-100 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2 ${profileCompleted ? "" : "opacity-30 cursor-not-allowed"}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                    <path d="M3 3v5h5" />
                                                </svg>
                                                Reset to Default Layout
                                            </button>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-sm mb-4">
                                                <span className="text-muted-foreground">Current Metrics</span>
                                                <span className="font-bold text-foreground">Live</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="bg-background p-3 rounded-lg border border-border/50">
                                                    <div className="text-xs text-muted-foreground mb-1">Guests</div>
                                                    <div className="text-xl font-bold text-foreground">{occupied}</div>
                                                </div>
                                                <div className="bg-background p-3 rounded-lg border border-border/50">
                                                    <div className="text-xs text-muted-foreground mb-1">Tables In Use</div>
                                                    <div className="text-xl font-bold text-foreground">
                                                        {tables.filter(t => t.seats > 0).length} <span className="text-muted-foreground/60 text-sm font-normal">/ {tables.length}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 opacity-50 cursor-not-allowed" title="Update by clicking tables">
                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-accent" style={{ width: `${occupancyRate}%` }} />
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground/60 mt-2 text-center">Click tables to update guests</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold mb-3 text-foreground">Table Status</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-success/20 border border-success/30" />
                                                <span className="text-sm text-muted-foreground">Empty</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-accent/20 border border-accent/30" />
                                                <span className="text-sm text-muted-foreground">Partially Full</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/30" />
                                                <span className="text-sm text-muted-foreground">Full</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Grid */}
                            <div className="lg:col-span-2 bg-card border border-border rounded-xl min-h-[500px] p-8 relative overflow-hidden shadow-sm flex flex-col">
                                {tables.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-2xl">
                                            🍽️
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground mb-2">No Profile Setup</h3>
                                        <p className="text-muted-foreground max-w-sm">Please complete your profile to get started.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="font-semibold text-foreground">Main Floor</span>
                                                <span className="text-muted-foreground/30">|</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">{tables.filter(t => t.seats === 0).length} Available</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">{tables.filter(t => t.seats > 0).length} In Use</span>
                                                </div>
                                            </div>
                                            <div className="text-xs font-mono text-muted-foreground/40 opacity-50">v2.2</div>
                                        </div>

                                        <div className="grid grid-cols-6 md:grid-cols-8 gap-4 content-start">
                                            {tables.map((table) => {
                                                const isFull = table.seats === table.size;
                                                const isEmpty = table.seats === 0;
                                                const isTwoSeat = table.size === 2;
                                                const baseColor = 'accent'; // Caramel theme
                                                const seatColorClass = isFull ? 'bg-destructive' : 'bg-accent';

                                                return (
                                                    <button
                                                        key={table.id}
                                                        onClick={() => setSelectedTable(table.id)}
                                                        className={`aspect-square rounded-xl relative overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${isFull
                                                            ? "border-destructive/30 bg-destructive/10"
                                                            : isEmpty
                                                                ? "border-success/30 bg-success/10"
                                                                : `border-accent/30 bg-accent/10`
                                                            }`}
                                                    >
                                                        {/* Seat Visuals */}
                                                        {isTwoSeat ? (
                                                            /* 1x2 grid (halves) for 2-seat tables */
                                                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-1 opacity-30">
                                                                <div className={`${table.seats >= 1 ? seatColorClass : "bg-transparent"} border-r border-primary/10`} />
                                                                <div className={`${table.seats >= 2 ? seatColorClass : "bg-transparent"}`} />
                                                            </div>
                                                        ) : (
                                                            /* 2x2 grid (quadrants) for 4-seat tables */
                                                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-30">
                                                                <div className={`${table.seats >= 1 ? seatColorClass : "bg-transparent"} border-r border-b border-primary/10`} />
                                                                <div className={`${table.seats >= 2 ? seatColorClass : "bg-transparent"} border-b border-primary/10`} />
                                                                <div className={`${table.seats >= 3 ? seatColorClass : "bg-transparent"} border-r border-primary/10`} />
                                                                <div className={`${table.seats >= 4 ? seatColorClass : "bg-transparent"}`} />
                                                            </div>
                                                        )}

                                                        <div className="relative z-10 flex flex-col items-center">
                                                            <span className="font-bold text-xs mb-0.5 text-foreground">T{table.id}</span>
                                                            <span className={`text-[10px] font-medium px-1.5 rounded-full ${isFull ? "bg-destructive/20 text-destructive" :
                                                                isEmpty ? "bg-success/20 text-success" :
                                                                    `bg-accent/20 text-accent`
                                                                }`}>
                                                                {table.seats}/{table.size}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-auto border-t-2 border-dashed border-border pt-4 text-center">
                                            <span className="text-xs font-bold text-muted-foreground/70 tracking-widest uppercase">Entrance</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    /* Reservations Tab */
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-1 text-foreground">
                                    Reservations
                                </h1>
                                <p className="text-muted-foreground">
                                    Manage and track upcoming table bookings.
                                </p>
                            </div>
                            <button
                                onClick={() => fetchReservations()}
                                className="px-6 py-2 rounded-full font-bold bg-muted text-foreground hover:bg-muted/80 transition-all border border-border"
                            >
                                Refresh List
                            </button>
                        </header>

                        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                            {loadingReservations ? (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                    <p>Loading your reservations...</p>
                                </div>
                            ) : reservations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 text-3xl">
                                        📅
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">No Reservations Yet</h3>
                                    <p className="text-muted-foreground max-w-sm">When customers book tables, they will appear here for you to manage.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto overflow-y-visible">
                                    <table className="w-full text-left border-separate border-spacing-y-2">
                                        <thead>
                                            <tr className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                                <th className="px-4 pb-4">Customer Details</th>
                                                <th className="px-4 pb-4">Party Size</th>
                                                <th className="px-4 pb-4">Date & Time</th>
                                                <th className="px-4 pb-4">Special Requests</th>
                                                <th className="px-4 pb-4">Status</th>
                                                <th className="px-4 pb-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reservations.map((res) => (
                                                <tr key={res.id} className="group transition-all hover:translate-x-1">
                                                    <td className="px-4 py-4 bg-muted/30 rounded-l-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                                {(res.user_name || "C").substring(0, 1).toUpperCase()}
                                                                {(res.user_name || res.user_sub).substring(1, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-foreground">{res.user_name || "Customer"}</div>
                                                                <div className="text-xs text-muted-foreground font-mono truncate w-24">{res.user_sub}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 bg-muted/30">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold text-sm">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="9" cy="7" r="4"></circle>
                                                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                            </svg>
                                                            {res.party_size}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 bg-muted/30">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground">{new Date(res.reservation_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                            <span className="text-sm font-medium text-primary">{res.reservation_time}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 bg-muted/30 max-w-xs">
                                                        <p className="text-sm text-muted-foreground line-clamp-2 italic">
                                                            {res.special_request || "No special requests."}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4 bg-muted/30">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border-2 ${res.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-600' :
                                                            res.status === 'cancelled' ? 'bg-red-500/10 border-red-500/20 text-red-600' :
                                                                res.status === 'completed' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' :
                                                                    'bg-yellow-500/10 border-yellow-500/20 text-yellow-600'
                                                            }`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${res.status === 'confirmed' ? 'bg-green-500' :
                                                                res.status === 'cancelled' ? 'bg-red-500' :
                                                                    res.status === 'completed' ? 'bg-blue-500' :
                                                                        'bg-yellow-500'
                                                                }`} />
                                                            {res.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 bg-muted/30 rounded-r-xl text-right">
                                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {res.status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => updateReservationStatus(res.id, 'confirmed')}
                                                                        className="px-4 py-2 rounded-lg text-xs font-black uppercase text-white bg-green-500 hover:bg-green-600 shadow-md shadow-green-500/20 active:scale-95 transition-all"
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateReservationStatus(res.id, 'cancelled')}
                                                                        className="px-4 py-2 rounded-lg text-xs font-black uppercase text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 active:scale-95 transition-all"
                                                                    >
                                                                        Decline
                                                                    </button>
                                                                </>
                                                            )}
                                                            {res.status === 'confirmed' && (
                                                                <button
                                                                    onClick={() => updateReservationStatus(res.id, 'completed')}
                                                                    className="px-4 py-2 rounded-lg text-xs font-black uppercase text-white bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                                                                >
                                                                    Complete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )
                }
            </main >

            {/* Seat Selection Modal */}
            {
                selectedTable !== null && (() => {
                    const getTableMaxSeats = (tableId: number) => tables.find(t => t.id === tableId)?.size || 0;
                    const maxSeats = getTableMaxSeats(selectedTable);
                    const seatOptions = Array.from({ length: maxSeats + 1 }, (_, i) => i);

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 scale-100 animate-in zoom-in-95 duration-200">
                                <h3 className="text-xl font-bold text-foreground mb-2 text-center">Update Table {selectedTable}</h3>
                                <p className="text-muted-foreground text-center mb-2">How many guests are seated?</p>
                                <p className="text-xs text-muted-foreground/60 text-center mb-6">({maxSeats}-seat table)</p>

                                <div className={`grid grid-cols-5 gap-2 mb-6`}>
                                    {seatOptions.map((num) => (
                                        <button
                                            key={num}
                                            onClick={() => updateTableSeats(selectedTable, num)}
                                            className={`aspect-square rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 ${(tables.find(t => t.id === selectedTable)?.seats || 0) === num
                                                ? "bg-primary text-primary-foreground shadow-lg"
                                                : "bg-muted text-foreground hover:bg-muted/80"
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setSelectedTable(null)}
                                    className="w-full py-3 rounded-xl border border-border text-muted-foreground font-semibold hover:bg-muted/50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    );
                })()
            }

        </div >
    );
}
