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

                // 1. If we have a saved configuration, use it
                if (data.table_config) {
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

                        const twoConfig = data.table_config["2_seats_table"] || {};
                        const fourConfig = data.table_config["4_seats_table"] || {};

                        // Create 2-seat tables
                        for (let i = 0; i < (twoConfig.total || 0); i++) {
                            generatedTables.push({ id: tId++, size: 2, seats: 0 });
                        }
                        // Create 4-seat tables
                        for (let i = 0; i < (fourConfig.total || 0); i++) {
                            generatedTables.push({ id: tId++, size: 4, seats: 0 });
                        }

                        setTables(generatedTables);
                        setCapacity(((twoConfig.total || 0) * 2) + ((fourConfig.total || 0) * 4));
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
            } else {
                const err = await response.text();
                console.error("DEBUG: fetchCafeDetails failed:", response.status, err);
            }
        } catch (error) {
            console.error("DEBUG: Error fetching cafe details:", error);
        }
    };



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
            four_seats_occupied
        };

        try {
            await fetch(`${cleanAPIURL}/occupancy`, {
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
        <div className="flex min-h-screen bg-muted/30">
            {/* Sidebar */}
            <aside className="w-64 hidden md:block bg-white border-r border-gray-200 p-6 fixed h-full z-10">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
                        C
                    </div>
                    <span className="font-bold text-xl tracking-tight text-gray-900">Cafe Admin</span>
                </div>

                <nav className="space-y-2">
                    <div className="px-4 py-3 rounded-lg text-sm font-medium bg-black text-white shadow-lg shadow-black/10">
                        Seating Map
                    </div>

                    <div className="h-px bg-gray-200 my-2" />

                    <Link
                        href={profileCompleted ? `/profile` : `/onboarding/setup`}
                        className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
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
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
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
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-900">
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
                                ? "bg-black text-white hover:bg-gray-800 hover:scale-105 shadow-md animate-pulse"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                        >
                            {unsavedChanges ? "Save Changes" : "Saved"}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Controls Panel */}
                    <div className="space-y-6">
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">Seating Limits</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Add Tables</span>
                                        <span className="font-bold text-gray-900">{capacity} Seats Total</span>
                                    </div>

                                    {/* Table Size Selector */}
                                    <div className="flex gap-2 mb-3 p-1 bg-gray-100 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTableSize(2)}
                                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedTableSize === 2
                                                ? "bg-black text-white shadow-sm"
                                                : "text-gray-600 hover:text-gray-900"
                                                }`}
                                        >
                                            2-Seat
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTableSize(4)}
                                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedTableSize === 4
                                                ? "bg-black text-white shadow-sm"
                                                : "text-gray-600 hover:text-gray-900"
                                                }`}
                                        >
                                            4-Seat
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => removeLastTable()}
                                            disabled={!profileCompleted}
                                            className={`w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-gray-600 ${profileCompleted ? "" : "opacity-30 cursor-not-allowed"}`}
                                        >
                                            -
                                        </button>
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-black" style={{ width: "100%" }} />
                                        </div>
                                        <button
                                            onClick={() => addTable(selectedTableSize)}
                                            disabled={!profileCompleted}
                                            className={`w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-gray-600 ${profileCompleted ? "" : "opacity-30 cursor-not-allowed"}`}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 text-center">Select size above, then click + to add</p>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
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
                                        <span className="text-gray-500">Current Metrics</span>
                                        <span className="font-bold text-gray-900">Live</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <div className="text-xs text-gray-500 mb-1">Guests</div>
                                            <div className="text-xl font-bold text-gray-900">{occupied}</div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <div className="text-xs text-gray-500 mb-1">Tables In Use</div>
                                            <div className="text-xl font-bold text-gray-900">
                                                {tables.filter(t => t.seats > 0).length} <span className="text-gray-400 text-sm font-normal">/ {tables.length}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 opacity-50 cursor-not-allowed" title="Update by clicking tables">
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600" style={{ width: `${occupancyRate}%` }} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 text-center">Click tables to update guests</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold mb-3 text-gray-900">Legend</h3>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">2-Seat Tables (Blue)</span>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                                            <span className="text-sm text-gray-600">Empty</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300" />
                                            <span className="text-sm text-gray-600">Partially Full</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
                                            <span className="text-sm text-gray-600">Full</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">4-Seat Tables (Purple)</span>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                                            <span className="text-sm text-gray-600">Empty</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300" />
                                            <span className="text-sm text-gray-600">Partially Full</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
                                            <span className="text-sm text-gray-600">Full</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visual Grid */}
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl min-h-[500px] p-8 relative overflow-hidden shadow-sm flex flex-col">
                        {tables.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">
                                    🍽️
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Profile Setup</h3>
                                <p className="text-gray-500 max-w-sm">Please complete your profile to get started.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="font-semibold text-gray-900">Main Floor</span>
                                        <span className="text-gray-400">|</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">{tables.filter(t => t.seats === 0).length} Available</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">{tables.filter(t => t.seats > 0).length} In Use</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-gray-400 opacity-50">v2.2</div>
                                </div>

                                <div className="grid grid-cols-6 md:grid-cols-8 gap-4 content-start">
                                    {tables.map((table) => {
                                        const isFull = table.seats === table.size;
                                        const isEmpty = table.seats === 0;
                                        const isTwoSeat = table.size === 2;
                                        const baseColor = isTwoSeat ? 'blue' : 'purple';
                                        const seatColor = isFull ? 'red' : baseColor;

                                        return (
                                            <button
                                                key={table.id}
                                                onClick={() => setSelectedTable(table.id)}
                                                className={`aspect-square rounded-xl relative overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${isFull
                                                    ? "border-red-500/50 bg-red-50"
                                                    : isEmpty
                                                        ? "border-green-500/30 bg-green-50"
                                                        : `border-${baseColor}-500/50 bg-${baseColor}-50`
                                                    }`}
                                            >
                                                {/* Seat Visuals */}
                                                {isTwoSeat ? (
                                                    /* 1x2 grid (halves) for 2-seat tables */
                                                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-1 opacity-30">
                                                        <div className={`${table.seats >= 1 ? `bg-${seatColor}-500` : "bg-transparent"} border-r border-black/5`} />
                                                        <div className={`${table.seats >= 2 ? `bg-${seatColor}-500` : "bg-transparent"}`} />
                                                    </div>
                                                ) : (
                                                    /* 2x2 grid (quadrants) for 4-seat tables */
                                                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-30">
                                                        <div className={`${table.seats >= 1 ? `bg-${seatColor}-500` : "bg-transparent"} border-r border-b border-black/5`} />
                                                        <div className={`${table.seats >= 2 ? `bg-${seatColor}-500` : "bg-transparent"} border-b border-black/5`} />
                                                        <div className={`${table.seats >= 3 ? `bg-${seatColor}-500` : "bg-transparent"} border-r border-black/5`} />
                                                        <div className={`${table.seats >= 4 ? `bg-${seatColor}-500` : "bg-transparent"}`} />
                                                    </div>
                                                )}

                                                <div className="relative z-10 flex flex-col items-center">
                                                    <span className="font-bold text-xs mb-0.5 text-gray-900">T{table.id}</span>
                                                    <span className={`text-[10px] font-medium px-1.5 rounded-full ${isFull ? "bg-red-100 text-red-700" :
                                                        isEmpty ? "bg-green-100 text-green-700" :
                                                            `bg-${baseColor}-100 text-${baseColor}-700`
                                                        }`}>
                                                        {table.seats}/{table.size}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto border-t-2 border-dashed border-gray-200 pt-4 text-center">
                                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Entrance</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Seat Selection Modal */}
            {selectedTable !== null && (() => {
                const getTableMaxSeats = (tableId: number) => tables.find(t => t.id === tableId)?.size || 0;
                const maxSeats = getTableMaxSeats(selectedTable);
                const seatOptions = Array.from({ length: maxSeats + 1 }, (_, i) => i);

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-100 animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Update Table {selectedTable}</h3>
                            <p className="text-gray-500 text-center mb-2">How many guests are seated?</p>
                            <p className="text-xs text-gray-400 text-center mb-6">({maxSeats}-seat table)</p>

                            <div className={`grid grid-cols-5 gap-2 mb-6`}>
                                {seatOptions.map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => updateTableSeats(selectedTable, num)}
                                        className={`aspect-square rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 ${(tables.find(t => t.id === selectedTable)?.seats || 0) === num
                                            ? "bg-black text-white shadow-lg"
                                            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setSelectedTable(null)}
                                className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
