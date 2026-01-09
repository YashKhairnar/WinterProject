"use client";
import { useEffect, useState, useRef } from "react";
import { useAuthProtection } from "../hooks/useAuthProtection";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import MobileHeader from "../components/MobileHeader";

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
                {label && <label className="text-xs text-muted-foreground font-bold uppercase">{label}</label>}
                <div className="flex gap-2 items-start">
                    {multiline ? (
                        <textarea
                            className={`flex-1 border-2 border-primary rounded-xl p-3 focus:ring-4 focus:ring-primary/10 outline-none bg-card text-foreground text-sm leading-relaxed shadow-sm ${inputClassName}`}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            rows={4}
                            autoFocus
                        />
                    ) : (
                        <input
                            type={type === 'number' ? 'number' : 'text'}
                            className={`flex-1 border-2 border-primary rounded-xl p-2 focus:ring-4 focus:ring-primary/10 outline-none bg-card text-foreground shadow-sm ${inputClassName}`}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                    )}
                    <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => handleSave()} disabled={loading} className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50">
                            ✓
                        </button>
                        <button onClick={() => { setIsEditing(false); setTempValue(value || ""); }} className="bg-card border border-border text-muted-foreground p-2 rounded-lg hover:bg-muted/50 transition-colors">
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
            className={`group relative cursor-pointer border border-transparent hover:border-border hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-all duration-200 ${className}`}
        >
            {value ? value : <span className="text-muted-foreground/60 italic text-sm">Click to add {label || "info"}</span>}
            <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground bg-card shadow-sm border border-border px-2 py-1 rounded text-xs font-medium transition-all transform scale-95 group-hover:scale-100">
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
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm animate-in fade-in zoom-in-95 duration-150">
                <div className="flex flex-wrap gap-2 mb-4">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => toggle(opt)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${tempValue.includes(opt)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:border-muted-foreground/30"
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="text-muted-foreground text-sm px-3 py-1.5 hover:bg-muted rounded-lg">Cancel</button>
                    <button onClick={handleSave} disabled={loading} className="bg-primary text-primary-foreground text-sm px-4 py-1.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50">
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
                        <span key={i} className="px-3 py-1.5 bg-muted text-foreground/80 rounded-lg text-sm font-medium border border-border/50">
                            {item}
                        </span>
                    ))
                ) : (
                    <span className="text-muted-foreground/60 italic py-1 px-2">No amenities listed.</span>
                )}
            </div>
            <span className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-muted-foreground bg-card shadow-sm border border-border px-2 py-1 rounded text-xs font-medium pointer-events-none">
                ✎ Edit List
            </span>
        </div>
    )
}

function EditableCoverPhoto({
    value,
    onSave,
    uploadEndpoint
}: { value: string | undefined | null, onSave: (val: string) => Promise<void>, uploadEndpoint: string }) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch(uploadEndpoint, { method: 'POST', body: formData });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        await onSave(data.url);
                    }
                } else alert("Upload failed");
            } catch (err) { console.error(err); alert("Upload error"); }
            finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
        }
    };

    return (
        <div className="relative group w-full h-full bg-muted/30">
            {value ? (
                <>
                    <img src={value} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold hover:scale-105 transition-transform"
                        >
                            {uploading ? "Uploading..." : "Change Cover Photo"}
                        </button>
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-2">
                    <span className="text-4xl">📷</span>
                    <span>No cover photo set</span>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        {uploading ? "Uploading..." : "Upload Cover Photo"}
                    </button>
                </div>
            )}
            <div className="absolute bottom-4 right-4 bg-primary/70 text-primary-foreground text-xs px-2 py-1 rounded backdrop-blur-md">
                Cover Photo
            </div>
        </div>
    );
}

function EditableGallery({
    photos = [],
    onSave,
    uploadEndpoint
}: { photos: string[], onSave: (val: string[]) => Promise<void>, uploadEndpoint: string }) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch(uploadEndpoint, { method: 'POST', body: formData });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        // Append to end
                        const newPhotos = [...photos, data.url];
                        await onSave(newPhotos);
                    }
                } else alert("Upload failed");
            } catch (err) { console.error(err); alert("Upload error"); }
            finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
        }
    };

    const handleDelete = async (indexInGallery: number) => {
        if (confirm("Remove this photo from gallery?")) {
            const newPhotos = photos.filter((_, i) => i !== indexInGallery);
            await onSave(newPhotos);
        }
    };



    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Visual Moments ({photos.length})</h3>
                <div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <span>+</span> {uploading ? "..." : "Add Photo"}
                    </button>
                </div>
            </div>

            {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {photos.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100">
                            <img src={url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            <button
                                onClick={() => handleDelete(i)}
                                className="absolute top-2 right-2 bg-destructive text-destructive-foreground w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-sm"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground/60 gap-2">
                    <span className="text-2xl">🖼️</span>
                    <span className="text-sm">No gallery photos yet</span>
                </div>
            )}
        </div>
    );
}

// --- Page ---

export default function CafeProfilePage() {
    const { userId, loading: authLoading } = useAuthProtection();
    const [cafe, setCafe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
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

    const handleDeleteCafe = async () => {
        if (!cafe || !cafe.id) return;

        setIsDeleting(true);
        try {
            const deleteURL = `${cleanAPIURL}/cafes/${cafe.id}`;
            console.log("DEBUG: deleting cafe at", deleteURL);
            const res = await fetch(deleteURL, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Redirect to onboarding as the cafe is now gone
                window.location.href = '/onboarding/setup';
            } else {
                const err = await res.text();
                console.error("DEBUG: Delete cafe failed:", res.status, err);
                alert("Failed to delete cafe. Please try again.");
                setIsDeleting(false);
                setShowDeleteModal(false);
            }
        } catch (e) {
            console.error("DEBUG: Error deleting cafe:", e);
            alert("Network error.");
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!cafe) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <div className="bg-card p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-border/50">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        ☕
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">No Cafe Profile Found</h2>
                    <p className="text-muted-foreground mb-6">You haven't set up your cafe profile yet.</p>
                    <Link
                        href="/onboarding/setup"
                        className="block w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        Create Cafe Profile
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Mobile Header */}
            <MobileHeader
                profileCompleted={true}
            />

            <div className="flex flex-1">
                {/* Sidebar (Desktop) */}
                <Sidebar
                    profileCompleted={true}
                />

                {/* Main Content */}
                <main className="flex-1 md:ml-64 p-4 md:p-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-6 flex justify-between items-center">
                            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors">
                                ← Back to Dashboard
                            </Link>
                            <div className="text-xs text-muted-foreground/70 font-medium bg-muted px-3 py-1 rounded-full">
                                Click fields to edit
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                            <div className="h-[200px] md:h-[300px]">
                                <EditableCoverPhoto
                                    value={cafe.cover_photo}
                                    onSave={(val) => handleUpdate('cover_photo', val)}
                                    uploadEndpoint={`${cleanAPIURL}/cafes/upload?category=cover_photo`}
                                />
                            </div>

                            <div className="p-6 md:p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex-1">
                                        <EditableText
                                            value={cafe.name}
                                            onSave={(val) => handleUpdate('name', val)}
                                            className="text-2xl md:text-3xl font-bold text-foreground mb-1 block"
                                            inputClassName="text-xl md:text-2xl font-bold"
                                            label="Cafe Name"
                                        />
                                        <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm">
                                            <span>📍</span>
                                            <EditableText
                                                value={cafe.address}
                                                onSave={(val) => handleUpdate('address', val)}
                                                className="inline-block hover:bg-muted/50 rounded"
                                                label="Address"
                                            />
                                            <span>,</span>
                                            <EditableText
                                                value={cafe.city}
                                                onSave={(val) => handleUpdate('city', val)}
                                                className="inline-block hover:bg-muted/50 rounded"
                                                label="City"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                    <div className="lg:col-span-2 space-y-8">
                                        <section>
                                            <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">The Essence</h3>
                                            <EditableText
                                                value={cafe.description}
                                                onSave={(val) => handleUpdate('description', val)}
                                                multiline
                                                className="text-foreground/80 leading-relaxed text-lg block"
                                                inputClassName="text-lg"
                                                label="Description"
                                            />
                                        </section>

                                        <section>
                                            <EditableGallery
                                                photos={cafe.cafe_photos || []}
                                                onSave={(val) => handleUpdate('cafe_photos', val)}
                                                uploadEndpoint={`${cleanAPIURL}/cafes/upload?category=cafe_photo`}
                                            />
                                        </section>

                                        <section>
                                            <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Sips & Bites</h3>
                                            <EditableGallery
                                                photos={cafe.menu_photos || []}
                                                onSave={(val) => handleUpdate('menu_photos', val)}
                                                uploadEndpoint={`${cleanAPIURL}/cafes/upload?category=menu_photo`}
                                            />
                                        </section>

                                        <section>
                                            <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Comforts & Perks</h3>
                                            <EditableAmenities
                                                value={cafe.amenities || []}
                                                onSave={(val) => handleUpdate('amenities', val)}
                                            />
                                        </section>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-muted p-6 rounded-2xl border border-border/50 shadow-sm">
                                            <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">At a Glance</h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">2-Seat Tables</span>
                                                    <EditableText
                                                        value={cafe.two_tables}
                                                        onSave={(val) => handleUpdate('two_tables', val)}
                                                        className="font-bold text-foreground"
                                                        label="2-Seat Tables"
                                                        type="number"
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">4-Seat Tables</span>
                                                    <EditableText
                                                        value={cafe.four_tables}
                                                        onSave={(val) => handleUpdate('four_tables', val)}
                                                        className="font-bold text-foreground"
                                                        label="4-Seat Tables"
                                                        type="number"
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">Rating</span>
                                                    <span className="font-bold text-accent flex items-center gap-1">
                                                        ★ {cafe.avg_rating || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Get in Touch</h3>

                                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                                                <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">🌐</span>
                                                <div className="flex-1 min-w-0">
                                                    <EditableText
                                                        value={cafe.website_link}
                                                        onSave={(val) => handleUpdate('website_link', val)}
                                                        className="font-medium text-foreground/80 hover:text-foreground truncate block"
                                                        label="Website Link"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                                                <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">📸</span>
                                                <div className="flex-1 min-w-0">
                                                    <EditableText
                                                        value={cafe.instagram_url}
                                                        onSave={(val) => handleUpdate('instagram_url', val)}
                                                        className="font-medium text-foreground/80 hover:text-foreground truncate block"
                                                        label="Instagram URL"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                                                <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">📞</span>
                                                <div className="flex-1 min-w-0">
                                                    <EditableText
                                                        value={cafe.phone_number}
                                                        onSave={(val) => handleUpdate('phone_number', val)}
                                                        className="font-medium text-foreground/80 hover:text-foreground truncate block"
                                                        label="Phone Number"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                                                <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">📋</span>
                                                <div className="flex-1 min-w-0">
                                                    <EditableText
                                                        value={cafe.menu_link}
                                                        onSave={(val) => handleUpdate('menu_link', val)}
                                                        className="font-medium text-foreground/80 hover:text-foreground truncate block"
                                                        label="Menu Link"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="mt-12 pt-8 border-t border-border/50">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Danger Zone</h3>
                                    <div className="bg-muted rounded-2xl p-6 border border-border flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-bold text-foreground">Delete Cafe Permanently</h4>
                                            <p className="text-sm text-muted-foreground">Once you delete your cafe, there is no going back. Please be certain.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 whitespace-nowrap"
                                        >
                                            Delete Cafe
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Delete Cafe Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-8 border border-border scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </div>

                        <h3 className="text-2xl font-bold text-foreground mb-3 text-center">Delete Cafe?</h3>
                        <p className="text-muted-foreground text-center mb-8 leading-relaxed">
                            This action is <span className="text-primary font-bold uppercase underline">permanent</span>.
                            All reservations, reviews, and cafe photos will be gone forever.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteCafe}
                                disabled={isDeleting}
                                className={`w-full py-4 rounded-xl font-bold text-primary-foreground shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isDeleting ? "bg-primary/70 cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                                    }`}
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-5 h-5 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    "Yes, Delete Everything"
                                )}
                            </button>

                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="w-full py-4 rounded-xl font-bold text-muted-foreground hover:bg-muted/50 transition-colors border border-transparent"
                            >
                                Nevermind, Keep It
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
