"use client";
import { useEffect, useState, useRef } from "react";
import { useAuthProtection } from "../hooks/useAuthProtection";
import { useRouter } from "next/navigation";
import Link from "next/link";

// --- Constants ---
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const cleanAPIURL = API_URL ? (API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL) : "";

// --- Components ---

function EditableText({
    value,
    onSave,
    className = "",
    inputClassName = "",
    multiline = false,
    label = "",
    type = "text"
}: {
    value: string | number | undefined,
    onSave: (val: any) => Promise<void>,
    className?: string,
    inputClassName?: string,
    multiline?: boolean,
    label?: string,
    type?: string
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => { setTempValue(value || ""); }, [value]);

    const handleSave = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        const valToSave = type === 'number' ? Number(tempValue) : tempValue;
        await onSave(valToSave);
        setLoading(false);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex flex-col gap-1 w-full max-w-lg relative z-20 my-1 animate-in fade-in zoom-in-95 duration-150">
                {label && <label className="text-xs text-gray-500 font-bold uppercase">{label}</label>}
                <div className="flex gap-2 items-start">
                    {multiline ? (
                        <textarea
                            className={`flex-1 border-2 border-black rounded-lg p-3 focus:ring-4 focus:ring-black/5 outline-none bg-white text-gray-900 text-sm leading-relaxed shadow-sm ${inputClassName}`}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            rows={4}
                            autoFocus
                        />
                    ) : (
                        <input
                            type={type === 'number' ? 'number' : 'text'}
                            className={`flex-1 border-2 border-black rounded-lg p-2 focus:ring-4 focus:ring-black/5 outline-none bg-white text-gray-900 shadow-sm ${inputClassName}`}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                    )}
                    <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => handleSave()} disabled={loading} className="bg-black text-white p-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50">
                            ✓
                        </button>
                        <button onClick={() => { setIsEditing(false); setTempValue(value || ""); }} className="bg-white border border-gray-200 text-gray-400 p-2 rounded-lg hover:bg-gray-50 hover:text-gray-600 transition-colors">
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            title="Click to edit"
            className={`group relative cursor-pointer border border-transparent hover:border-gray-200 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-all duration-200 ${className}`}
        >
            {value ? value : <span className="text-gray-400 italic text-sm">Click to add {label || "info"}</span>}
            <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 bg-white shadow-sm border border-gray-100 px-2 py-1 rounded text-xs font-medium transition-all transform scale-95 group-hover:scale-100">
                ✎ Edit
            </span>
        </div>
    );
}

function EditableAmenities({
    value = [],
    onSave,
    options = ["WiFi", "Outlets", "Outdoor Seating", "Pet Friendly", "Vegan Options", "Live Music", "Restroom", "AC", "Quiet"]
}: { value: string[], onSave: (val: string[]) => Promise<void>, options?: string[] }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState<string[]>(value);
    const [loading, setLoading] = useState(false);

    useEffect(() => { setTempValue(value); }, [value]);

    const toggle = (opt: string) => {
        if (tempValue.includes(opt)) {
            setTempValue(tempValue.filter(v => v !== opt));
        } else {
            setTempValue([...tempValue, opt]);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        await onSave(tempValue);
        setLoading(false);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm animate-in fade-in zoom-in-95 duration-150">
                <div className="flex flex-wrap gap-2 mb-4">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => toggle(opt)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${tempValue.includes(opt)
                                ? "bg-black text-white border-black"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="text-gray-500 text-sm px-3 py-1.5 hover:bg-gray-50 rounded-lg">Cancel</button>
                    <button onClick={handleSave} disabled={loading} className="bg-black text-white text-sm px-4 py-1.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50">
                        {loading ? "Saving..." : "Save Amenities"}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="group relative cursor-pointer min-h-[40px] border border-transparent hover:border-dashed hover:border-gray-300 rounded-xl p-2 -m-2 transition-all"
        >
            <div className="flex flex-wrap gap-2">
                {value && value.length > 0 ? (
                    value.map((item: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-transparent">
                            {item}
                        </span>
                    ))
                ) : (
                    <span className="text-gray-400 italic py-1 px-2">No amenities listed.</span>
                )}
            </div>
            <span className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-gray-400 bg-white shadow-sm border border-gray-100 px-2 py-1 rounded text-xs font-medium pointer-events-none">
                ✎ Edit List
            </span>
        </div>
    )
}

function EditablePhotos({
    value = [], // URLs
    onSave,
    uploadEndpoint
}: { value: string[], onSave: (val: string[]) => Promise<void>, uploadEndpoint: string }) {
    const [uploading, setUploading] = useState(false);

    // Hidden file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);

            try {
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch(`${cleanAPIURL}/cafes/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        const newPhotos = [...value, data.url];
                        await onSave(newPhotos); // Auto-save
                    }
                } else {
                    alert("Upload failed");
                }
            } catch (err) {
                console.error(err);
                alert("Upload error");
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        }
    };

    const handleDelete = async (urlToDelete: string) => {
        if (confirm("Are you sure you want to remove this photo?")) {
            const newPhotos = value.filter(url => url !== urlToDelete);
            await onSave(newPhotos);
        }
    }

    return (
        <div className="relative group">
            {/* Display / List */}
            <div className="rounded-xl overflow-hidden bg-gray-100 min-h-[250px] relative">
                {value.length > 0 ? (
                    // Carousel or Grid? Let's do simple cover image + thumbnails or grid
                    // Current UI uses one big cover. Let's show big cover + grid below?
                    // Or just one swappable area. 
                    // Let's implement full grid edit mode
                    <div className="w-full h-full relative group/image">
                        <img src={value[0]} alt="Cover" className="w-full h-full object-cover min-h-[250px]" />
                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100 gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="bg-white text-black px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                            >
                                {uploading ? "Uploading..." : "Change Cover Photo"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2 min-h-[250px]">
                        <span className="text-4xl">📷</span>
                        <span>No photos added</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="mt-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                            {uploading ? "Uploading..." : "Upload Photo"}
                        </button>
                    </div>
                )}
            </div>

            {/* Thumbnails / Extra Photos */}
            {value.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {value.slice(1).map((url, i) => (
                        <div key={i} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden group/thumb cursor-pointer hover:opacity-80">
                            <img src={url} className="w-full h-full object-cover" />
                            <button
                                onClick={() => handleDelete(url)}
                                className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// --- Page ---

export default function CafeProfilePage() {
    const { userId, loading: authLoading } = useAuthProtection();
    const [cafe, setCafe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (userId) {
            fetchCafe();
        }
    }, [userId]);


    const fetchCafe = async () => {
        try {
            const fetchURL = `${cleanAPIURL}/cafes/owner/${userId}`;
            console.log("DEBUG: Profile fetching cafe for userId:", userId, "from URL:", fetchURL);
            const res = await fetch(fetchURL);
            if (res.ok) {
                const data = await res.json();
                console.log("DEBUG: received cafe data for profile:", data);
                setCafe(data);
            } else if (res.status === 404) {
                console.log("DEBUG: cafe not found (404)");
                setCafe(null);
            } else {
                console.log("DEBUG: Error fetching cafe status:", res.status);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (field: string, value: any) => {
        if (!cafe || !cafe.id) return;

        const originalCafe = { ...cafe };
        setCafe({ ...cafe, [field]: value });

        try {
            const patchURL = `${cleanAPIURL}/cafes/${cafe.id}`;
            console.log("DEBUG: patching cafe at", patchURL);
            const res = await fetch(patchURL, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [field]: value })
            });

            if (res.ok) {
                const updated = await res.json();
                setCafe(updated);
            } else {
                setCafe(originalCafe);
                alert("Failed to update.");
            }
        } catch (e) {
            setCafe(originalCafe);
            alert("Network error.");
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!cafe) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        ☕
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">No Cafe Profile Found</h2>
                    <p className="text-gray-500 mb-6">You haven't set up your cafe profile yet.</p>
                    <Link
                        href="/onboarding/setup"
                        className="block w-full bg-black text-white font-medium py-3 rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Create Cafe Profile
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 hidden md:block bg-white border-r border-gray-200 p-6 fixed h-full z-10">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">C</div>
                    <span className="font-bold text-xl tracking-tight text-gray-900">Cafe Admin</span>
                </div>
                <nav className="space-y-2">
                    <Link href="/dashboard" className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                        Dashboard
                    </Link>
                    <div className="block px-4 py-3 rounded-lg text-sm font-medium bg-black text-white shadow-lg shadow-black/10">
                        Cafe Profile
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6 flex justify-between items-center">
                        <Link href="/dashboard" className="text-gray-500 hover:text-black flex items-center gap-2 text-sm font-medium">
                            ← Back to Dashboard
                        </Link>
                        <div className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full">
                            Click fields to edit
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Header Image Area with Inline Photo Edit */}
                        <EditablePhotos
                            value={cafe.cafe_photos || []}
                            onSave={(val) => handleUpdate('cafe_photos', val)}
                            uploadEndpoint={`${API_URL}/cafes/upload`}
                        />

                        <div className="p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex-1">
                                    <EditableText
                                        value={cafe.name}
                                        onSave={(val) => handleUpdate('name', val)}
                                        className="text-3xl font-bold text-gray-900 mb-1 block"
                                        inputClassName="text-2xl font-bold"
                                        label="Cafe Name"
                                    />
                                    <div className="flex items-center gap-2 text-gray-500 mt-1">
                                        <span>📍</span>
                                        <EditableText
                                            value={cafe.address}
                                            onSave={(val) => handleUpdate('address', val)}
                                            className="inline-block hover:bg-gray-50"
                                            label="Address"
                                        />
                                        <span>,</span>
                                        <EditableText
                                            value={cafe.city}
                                            onSave={(val) => handleUpdate('city', val)}
                                            className="inline-block hover:bg-gray-50"
                                            label="City"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                <div className="lg:col-span-2 space-y-8">
                                    <section>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">About</h3>
                                        <EditableText
                                            value={cafe.description}
                                            onSave={(val) => handleUpdate('description', val)}
                                            multiline
                                            className="text-gray-600 leading-relaxed text-lg block"
                                            inputClassName="text-lg"
                                            label="Description"
                                        />
                                    </section>

                                    <section>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Amenities</h3>
                                        <EditableAmenities
                                            value={cafe.amenities || []}
                                            onSave={(val) => handleUpdate('amenities', val)}
                                        />
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Stats</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">2-Seat Tables</span>
                                                <EditableText
                                                    value={cafe.two_tables}
                                                    onSave={(val) => handleUpdate('two_tables', val)}
                                                    className="font-bold text-gray-900"
                                                    label="2-Seat Tables"
                                                    type="number"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">4-Seat Tables</span>
                                                <EditableText
                                                    value={cafe.four_tables}
                                                    onSave={(val) => handleUpdate('four_tables', val)}
                                                    className="font-bold text-gray-900"
                                                    label="4-Seat Tables"
                                                    type="number"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Rating</span>
                                                <span className="font-bold text-gray-900 flex items-center gap-1">
                                                    ★ {cafe.avg_rating || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Connect</h3>

                                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                                            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">🌐</span>
                                            <div className="flex-1 min-w-0">
                                                <EditableText
                                                    value={cafe.website_link}
                                                    onSave={(val) => handleUpdate('website_link', val)}
                                                    className="font-medium text-gray-600 hover:text-black truncate block"
                                                    label="Website Link"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                                            <span className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">📸</span>
                                            <div className="flex-1 min-w-0">
                                                <EditableText
                                                    value={cafe.instagram_url}
                                                    onSave={(val) => handleUpdate('instagram_url', val)}
                                                    className="font-medium text-gray-600 hover:text-black truncate block"
                                                    label="Instagram URL"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                                            <span className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">📞</span>
                                            <div className="flex-1 min-w-0">
                                                <EditableText
                                                    value={cafe.phone_number}
                                                    onSave={(val) => handleUpdate('phone_number', val)}
                                                    className="font-medium text-gray-600 hover:text-black truncate block"
                                                    label="Phone Number"
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
