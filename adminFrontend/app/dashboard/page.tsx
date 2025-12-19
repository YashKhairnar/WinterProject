"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthProtection } from "../hooks/useAuthProtection";

function DiscountCoupon({ percent, code }: { percent: string; code: string }) {
    const [flipped, setFlipped] = useState(false);

    if (!percent) return <span className="text-gray-400 text-xs">-</span>;

    return (
        <div
            onClick={() => setFlipped(!flipped)}
            className="group relative w-32 h-10 cursor-pointer"
            style={{ perspective: "1000px" }}
        >
            <div
                className="relative w-full h-full duration-500 transition-transform"
                style={{
                    transformStyle: "preserve-3d",
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)"
                }}
            >
                {/* Front - The "Coupon" Look */}
                <div
                    className="absolute inset-0 bg-yellow-100 border-2 border-dashed border-yellow-400 rounded-lg flex items-center justify-between px-3 shadow-sm"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    {/* Left Cutout */}
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-r border-yellow-300" />

                    <div className="flex flex-col items-center w-full">
                        <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Discount</span>
                        <span className="text-yellow-800 font-black text-sm">{percent}</span>
                    </div>

                    {/* Right Cutout */}
                    <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-l border-yellow-300" />
                </div>

                {/* Back - The "Code" Reveal */}
                <div
                    className="absolute inset-0 bg-gray-900 border-2 border-gray-700 rounded-lg flex items-center justify-center shadow-sm"
                    style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)"
                    }}
                >
                    <div className="text-center">
                        <span className="text-gray-400 text-[8px] uppercase tracking-widest block mb-0.5">Code</span>
                        <span className="text-white font-mono text-xs font-bold tracking-wider">
                            {code || "NO_CODE"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { isAuthenticated, loading } = useAuthProtection();

    // Hooks must be called unconditionally at the top level
    const [activeTab, setActiveTab] = useState<'seating' | 'reservations' | 'checkins'>('seating');
    const [capacity, setCapacity] = useState(0);
    const [selectedTable, setSelectedTable] = useState<number | null>(null);

    // Check-in State
    type CheckIn = {
        id: number;
        name: string;
        guests: number;
        time: string;
        source: 'manual' | 'reservation';
        date: string; // YYYY-MM-DD
        discountPercent: string;
        discountCode: string;
    };

    const [checkIns, setCheckIns] = useState<CheckIn[]>([
        { id: 1, name: "John Doe", guests: 2, time: "09:30 AM", source: 'manual', date: new Date().toISOString().split('T')[0], discountPercent: "", discountCode: "" },
        { id: 2, name: "Alice Smith", guests: 4, time: "10:15 AM", source: 'reservation', date: new Date().toISOString().split('T')[0], discountPercent: "10%", discountCode: "VIP_GUEST" }
    ]);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [walkInForm, setWalkInForm] = useState({ name: "", guests: 1, discountPercent: "", discountCode: "" });

    // Mock Reservations
    const [reservations, setReservations] = useState([
        { id: 1, name: "Sarah Johnson", time: "12:30 PM", guests: 4, status: "pending" },
        { id: 2, name: "Mike Chen", time: "1:00 PM", guests: 2, status: "pending" },
        { id: 3, name: "Emma Wilson", time: "1:15 PM", guests: 3, status: "confirmed" },
    ]);

    // Mock tables grid 
    // seats: 0-4
    const [tables, setTables] = useState<{ id: number; seats: number }[]>([]);

    // Derived State
    const occupied = tables.reduce((acc, t) => acc + t.seats, 0);
    const occupancyRate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

    // Loading/Auth checks come AFTER all hooks are declared
    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!isAuthenticated) return null;

    const updateCapacity = (newCapacity: number) => {
        const safeCapacity = Math.max(0, newCapacity);
        setCapacity(safeCapacity);

        // Sync tables
        const tableCount = Math.ceil(safeCapacity / 4);
        setTables(prev => {
            const currentCount = prev.length;
            if (tableCount > currentCount) {
                // Add tables
                const newTables = Array(tableCount - currentCount).fill(0).map((_, i) => ({
                    id: currentCount + i + 1,
                    seats: 0
                }));
                return [...prev, ...newTables];
            } else if (tableCount < currentCount) {
                // Remove tables
                return prev.slice(0, tableCount);
            }
            return prev;
        });
    };

    const handleReservation = (id: number, status: string) => {
        setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));

        if (status === 'confirmed') {
            const res = reservations.find(r => r.id === id);
            if (res) {
                addCheckIn(res.name, res.guests, 'reservation');
            }
        }
    };

    const updateTableSeats = (tableId: number, seats: number) => {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, seats } : t));
        setSelectedTable(null);
    };

    const addCheckIn = (name: string, guests: number, source: 'manual' | 'reservation', discountPercent: string = "", discountCode: string = "") => {
        const newCheckIn: CheckIn = {
            id: Date.now(),
            name,
            guests,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            source,
            date: new Date().toISOString().split('T')[0],
            discountPercent,
            discountCode
        };
        setCheckIns(prev => [newCheckIn, ...prev]);
    };

    const handleWalkInSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addCheckIn(walkInForm.name, walkInForm.guests, 'manual', walkInForm.discountPercent, walkInForm.discountCode);
        setShowWalkInModal(false);
        setWalkInForm({ name: "", guests: 1, discountPercent: "", discountCode: "" });
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
                    <button
                        onClick={() => setActiveTab('seating')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'seating'
                            ? "bg-black text-white shadow-lg shadow-black/10"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                    >
                        Seating Map
                    </button>

                    <button
                        onClick={() => setActiveTab('reservations')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'reservations'
                            ? "bg-black text-white shadow-lg shadow-black/10"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                    >
                        Reservations
                        {reservations.filter(r => r.status === 'pending').length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {reservations.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('checkins')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'checkins'
                            ? "bg-black text-white shadow-lg shadow-black/10"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                    >
                        Daily Check-ins
                    </button>

                    <div className="h-px bg-gray-200 my-2" />

                    <Link
                        href="/profile"
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
                            {activeTab === 'seating' ? "Seating Manager" : "Reservations"}
                        </h1>
                        <p className="text-muted-foreground">
                            {activeTab === 'seating' ? "Live view of your cafe's floor plan." : "Manage booking requests."}
                        </p>
                    </div>
                    {activeTab === 'seating' && (
                        <div className="flex gap-4">
                            <div className={`px-4 py-2 rounded-full font-semibold border ${occupancyRate > 80 ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                occupancyRate > 50 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                    "bg-green-500/10 border-green-500/20 text-green-500"
                                }`}>
                                {occupancyRate}% Full
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20" />
                        </div>
                    )}
                </header>

                {activeTab === 'seating' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Controls Panel */}
                        <div className="space-y-6">
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4 text-gray-900">Waitlist Limits</h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-500">Total Capacity</span>
                                            <span className="font-bold text-gray-900">{capacity} Seats</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateCapacity(capacity - 4)}
                                                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-gray-600"
                                            >
                                                -
                                            </button>
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-black" style={{ width: "100%" }} />
                                            </div>
                                            <button
                                                onClick={() => updateCapacity(capacity + 4)}
                                                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-gray-600"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 text-center">Adjusts table count (4 seats/table)</p>
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
                                <div className="space-y-3">
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
                                        <span className="text-sm text-gray-600">Full (4/4)</span>
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
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tables Setup</h3>
                                    <p className="text-gray-500 max-w-sm">Increase the Total Capacity using the controls on the left to generate your floor plan.</p>
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
                                        {tables.map((table) => (
                                            <button
                                                key={table.id}
                                                onClick={() => setSelectedTable(table.id)}
                                                className={`aspect-square rounded-xl relative overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${table.seats === 4
                                                    ? "border-red-500/50 bg-red-50"
                                                    : table.seats > 0
                                                        ? "border-blue-500/50 bg-blue-50"
                                                        : "border-green-500/30 bg-green-50"
                                                    }`}
                                            >
                                                {/* Quadrant Visual */}
                                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-30">
                                                    <div className={`${table.seats >= 1 ? (table.seats === 4 ? "bg-red-500" : "bg-blue-500") : "bg-transparent"} border-r border-b border-black/5`} />
                                                    <div className={`${table.seats >= 2 ? (table.seats === 4 ? "bg-red-500" : "bg-blue-500") : "bg-transparent"} border-b border-black/5`} />
                                                    <div className={`${table.seats >= 3 ? (table.seats === 4 ? "bg-red-500" : "bg-blue-500") : "bg-transparent"} border-r border-black/5`} />
                                                    <div className={`${table.seats >= 4 ? "bg-red-500" : "bg-transparent"}`} />
                                                </div>

                                                <div className="relative z-10 flex flex-col items-center">
                                                    <span className="font-bold text-xs mb-0.5 text-gray-900">T{table.id}</span>
                                                    <span className={`text-[10px] font-medium px-1.5 rounded-full ${table.seats === 4 ? "bg-red-100 text-red-700" :
                                                        table.seats > 0 ? "bg-blue-100 text-blue-700" :
                                                            "bg-green-100 text-green-700"
                                                        }`}>
                                                        {table.seats}/4
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-auto border-t-2 border-dashed border-gray-200 pt-4 text-center">
                                        <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Entrance</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'checkins' ? (
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                <h2 className="text-lg font-semibold text-gray-900">Daily Visitor Log</h2>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-black/5 outline-none"
                                    />
                                    <button
                                        onClick={() => setShowWalkInModal(true)}
                                        className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
                                    >
                                        + Log Walk-in
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Time</th>
                                            <th className="px-4 py-3">Customer Name</th>
                                            <th className="px-4 py-3">Guests</th>
                                            <th className="px-4 py-3">Discount</th>
                                            <th className="px-4 py-3 rounded-r-lg">Source</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {checkIns.filter(c => c.date === filterDate)
                                            .sort((a, b) => b.time.localeCompare(a.time))
                                            .map((checkIn) => (
                                                <tr key={checkIn.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-gray-500">{checkIn.time}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-900">{checkIn.name}</td>
                                                    <td className="px-4 py-3 text-gray-600">{checkIn.guests}</td>
                                                    <td className="px-4 py-3">
                                                        <DiscountCoupon percent={checkIn.discountPercent} code={checkIn.discountCode} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${checkIn.source === 'reservation'
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : "bg-gray-100 text-gray-600 border border-gray-200"
                                                            }`}>
                                                            {checkIn.source === 'reservation' ? '📅 Reservation' : '🚶 Walk-in'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        {checkIns.filter(c => c.date === filterDate).length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                                                    No check-ins found for this date.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Reservations View */
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Booking Requests</h2>
                                <div className="text-sm text-gray-500">
                                    {reservations.filter(r => r.status === 'pending').length} Pending
                                </div>
                            </div>

                            <div className="space-y-4">
                                {reservations.map(res => (
                                    <div key={res.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                                {res.name[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{res.name}</h4>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>📅 Today at {res.time}</span>
                                                    <span>•</span>
                                                    <span>👥 {res.guests} Guests</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {res.status === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleReservation(res.id, 'rejected')}
                                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                    <button
                                                        onClick={() => handleReservation(res.id, 'confirmed')}
                                                        className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-lg shadow-sm transition-colors"
                                                    >
                                                        Accept Booking
                                                    </button>
                                                </>
                                            ) : (
                                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${res.status === 'confirmed' ? "bg-green-50 border-green-200 text-green-700" :
                                                    "bg-red-50 border-red-200 text-red-700"
                                                    }`}>
                                                    {res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Seat Selection Modal */}
            {selectedTable !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Update Table {selectedTable}</h3>
                        <p className="text-gray-500 text-center mb-6">How many guests are seated?</p>

                        <div className="grid grid-cols-5 gap-2 mb-6">
                            {[0, 1, 2, 3, 4].map((num) => (
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
            )}
            {/* Walk-in Modal */}
            {showWalkInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Log Walk-in Customer</h3>
                        <p className="text-gray-500 mb-6 text-sm">Enter details for the new arrival.</p>

                        <form onSubmit={handleWalkInSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black/5"
                                    placeholder="e.g. Alex"
                                    value={walkInForm.name}
                                    onChange={e => setWalkInForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Number of Guests</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setWalkInForm(prev => ({ ...prev, guests: num }))}
                                            className={`aspect-square rounded-lg font-bold text-sm transition-all border ${walkInForm.guests === num
                                                ? "bg-black text-white border-black"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                                }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Discount %</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black/5"
                                        placeholder="e.g. 15%"
                                        value={walkInForm.discountPercent}
                                        onChange={e => setWalkInForm(prev => ({ ...prev, discountPercent: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Coupon Code</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black/5"
                                        placeholder="e.g. SUMMER24"
                                        value={walkInForm.discountCode}
                                        onChange={e => setWalkInForm(prev => ({ ...prev, discountCode: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWalkInModal(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-black/20"
                                >
                                    Check In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
