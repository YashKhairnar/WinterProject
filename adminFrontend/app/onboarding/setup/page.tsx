"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthProtection } from "../../hooks/useAuthProtection";

type WorkingHoursDay = { open: string; close: string; closed: boolean };

function normalizeWorkingHours(
    wh: Record<string, WorkingHoursDay>
): Record<string, WorkingHoursDay> {
    const map: Record<string, string> = {
        monday: "mon",
        tuesday: "tue",
        wednesday: "wed",
        thursday: "thu",
        friday: "fri",
        saturday: "sat",
        sunday: "sun",
    };

    const out: Record<string, WorkingHoursDay> = {};
    for (const [day, hours] of Object.entries(wh)) {
        const key = map[day.toLowerCase()] ?? day.toLowerCase().slice(0, 3);
        out[key] = hours;
    }
    return out;
}

export default function OnboardingSetupPage() {
    const { isAuthenticated, loading, userId } = useAuthProtection();
    const router = useRouter();
    const [step, setStep] = useState(1);

    const apiURL = process.env.NEXT_PUBLIC_API_URL;

    const [submitting, setSubmitting] = useState(false);

    // Hooks must be unconditional
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        phone: "",
        address: "",
        city: "",
        instagram: "",
        cognito_sub: "",
        amenities: [] as string[],
        menuLink: "",
        menuType: "link" as "link" | "photos",
        menuPhotos: [] as File[],
        website: "",
        latitude: null as number | null,
        longitude: null as number | null,
        coverPhoto: null as File | null,
        photos: [] as File[],
        tables2Seat: 0,
        tables4Seat: 0,
        workingHours: {
            Monday: { open: "09:00", close: "17:00", closed: false },
            Tuesday: { open: "09:00", close: "17:00", closed: false },
            Wednesday: { open: "09:00", close: "17:00", closed: false },
            Thursday: { open: "09:00", close: "17:00", closed: false },
            Friday: { open: "09:00", close: "17:00", closed: false },
            Saturday: { open: "10:00", close: "22:00", closed: false },
            Sunday: { open: "10:00", close: "22:00", closed: false },
        } as Record<string, WorkingHoursDay>,
    });

    // Sync cognito_sub once userId arrives (DON'T setState during render)
    useEffect(() => {
        if (userId) {
            setFormData((prev) => ({ ...prev, cognito_sub: userId }));
        }
    }, [userId]);

    // Auth checks AFTER hooks
    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading...
            </div>
        );
    if (!isAuthenticated) return null;

    const updateForm = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const toggleAmenity = (amenity: string) => {
        setFormData((prev) => {
            const amenities = prev.amenities.includes(amenity)
                ? prev.amenities.filter((a) => a !== amenity)
                : [...prev.amenities, amenity];
            return { ...prev, amenities };
        });
    };

    const fetchLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData((prev) => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }));
                },
                (error) => {
                    console.error("Error fetching location:", error);
                    alert("Could not fetch location. Please allow location access.");
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    const handleNext = () => setStep((prev) => prev + 1);
    const handleBack = () => setStep((prev) => prev - 1);

    const uploadFile = async (file: File, category: 'cover_photo' | 'cafe_photo' | 'menu_photo', apiUrl: string): Promise<string | null> => {
        try {
            const res = await fetch(`${apiUrl}/upload/presigned-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    file_type: file.type,
                    category: category
                })
            });
            if (!res.ok) throw new Error("Failed to get presigned URL");
            const { upload_url, file_url } = await res.json();

            const uploadRes = await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });
            if (!uploadRes.ok) throw new Error(`Direct upload failed for ${file.name}`);

            return file_url;
        } catch (err) {
            console.error("Upload error:", err);
            return null;
        }
    };

    const submitForm = async () => {
        if (!apiURL) {
            alert("NEXT_PUBLIC_API_URL is not set");
            return;
        }
        if (!formData.cognito_sub) {
            alert("No cognito_sub (userId) found. Please re-login.");
            return;
        }
        if (!formData.latitude || !formData.longitude) {
            alert("Please fetch the location coordinates before submitting.");
            return;
        }

        try {
            setSubmitting(true);
            const cleanURL = apiURL.endsWith("/") ? apiURL.slice(0, -1) : apiURL;
            const fullURL = `${cleanURL}/cafes/`;

            console.log("DEBUG: Starting direct uploads...");

            // 1. Upload Cover Photo
            let coverPhotoUrl = "";
            if (formData.coverPhoto) {
                const url = await uploadFile(formData.coverPhoto, 'cover_photo', cleanURL);
                if (url) coverPhotoUrl = url;
            }

            // 2. Upload Cafe Photos
            const cafePhotoUrls: string[] = [];
            for (const file of formData.photos) {
                const url = await uploadFile(file, 'cafe_photo', cleanURL);
                if (url) cafePhotoUrls.push(url);
            }

            // 3. Upload Menu Photos
            const menuPhotoUrls: string[] = [];
            if (formData.menuType === 'photos') {
                for (const file of formData.menuPhotos) {
                    const url = await uploadFile(file, 'menu_photo', cleanURL);
                    if (url) menuPhotoUrls.push(url);
                }
            }

            console.log("DEBUG: Uploads complete. Submitting metadata...");

            const payload = {
                cognito_sub: formData.cognito_sub,
                name: formData.name,
                description: formData.description || "",
                phone_number: formData.phone || "",
                address: formData.address,
                city: formData.city,
                latitude: formData.latitude ?? 0,
                longitude: formData.longitude ?? 0,
                website_link: formData.website || "",
                instagram_url: formData.instagram || "",
                menu_link: formData.menuType === "link" ? formData.menuLink : "",
                menu_photos: menuPhotoUrls,
                cover_photo: coverPhotoUrl,
                cafe_photos: cafePhotoUrls,
                two_tables: formData.tables2Seat,
                four_tables: formData.tables4Seat,
                amenities: formData.amenities,
                working_hours: normalizeWorkingHours(formData.workingHours),
                table_config: []
            };

            const response = await fetch(fullURL, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                router.push("/profile");
            } else {
                const errorText = await response.text();
                console.error("Error creating cafe:", errorText);
                alert(`Failed to create cafe: ${errorText}`);
            }
        } catch (err: any) {
            console.error("DEBUG: fetch error:", err);
            alert(`Failed: ${err?.message || String(err)}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-3xl w-full">
                {/* Progress Steps */}
                <div className="mb-8 flex justify-between items-center px-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${step >= s
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "bg-background border-muted-foreground/30 text-muted-foreground"
                                    }`}
                            >
                                {s}
                            </div>
                            <span
                                className={`text-sm font-medium ${step >= s ? "text-foreground" : "text-muted-foreground"
                                    }`}
                            >
                                {s === 1 ? "Basic Info" : s === 2 ? "Media & Menu" : "Details"}
                            </span>
                            {s < 3 && <div className="w-12 h-[2px] bg-muted-foreground/20 mx-2" />}
                        </div>
                    ))}
                </div>

                <form
                    onSubmit={(e) => e.preventDefault()}
                    className="bg-card border border-border rounded-xl p-8 shadow-sm"
                >
                    {/* Status */}
                    {submitting && (
                        <div className="mb-6 p-3 rounded-lg border border-border bg-muted/50 text-sm">
                            <span className="font-medium">Submitting...</span>
                        </div>
                    )}

                    {/* Step 1 */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold">Tell us about your cafe</h2>
                                <p className="text-muted-foreground">Start with the essentials.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Cafe Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="e.g. The Daily Grind"
                                        value={formData.name}
                                        onChange={(e) => updateForm("name", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone Number</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="(555) 123-4567"
                                        value={formData.phone}
                                        onChange={(e) => updateForm("phone", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea
                                        required
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="A cozy spot for artisanal coffee..."
                                        value={formData.description}
                                        onChange={(e) => updateForm("description", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">City</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="San Jose"
                                        value={formData.city}
                                        onChange={(e) => updateForm("city", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Address</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="123 Main St"
                                        value={formData.address}
                                        onChange={(e) => updateForm("address", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">Location Coordinates</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={fetchLocation}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
                                        >
                                            Fetch Location
                                        </button>

                                        {formData.latitude && formData.longitude && (
                                            <div className="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-left-4 duration-300">
                                                <span className="text-sm font-medium">Location Fetched</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Click fetch to automatically get your current GPS coordinates.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2 */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold">Showcase your vibe</h2>
                                <p className="text-muted-foreground">Photos and menu details.</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-medium mb-4 block">Cover Photo</label>
                                    <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border border-border group bg-muted/30 hover:bg-muted/50 transition-colors">
                                        {formData.coverPhoto ? (
                                            <>
                                                <img
                                                    src={URL.createObjectURL(formData.coverPhoto)}
                                                    alt="Cover"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => updateForm("coverPhoto", null)}
                                                    className="absolute top-2 right-2 bg-primary/80 text-primary-foreground rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            updateForm("coverPhoto", e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-muted-foreground">Click to upload cover photo</span>
                                                <span className="text-xs text-muted-foreground mt-1">Recommended 21:9 aspect ratio</span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-4 block">
                                        Cafe Photos{" "}
                                        <span className="text-muted-foreground font-normal">
                                            ({formData.photos.length}/10)
                                        </span>
                                    </label>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        {formData.photos.map((photo, index) => (
                                            <div
                                                key={index}
                                                className="relative aspect-square rounded-xl overflow-hidden border border-border group bg-muted/20"
                                            >
                                                <img
                                                    src={URL.createObjectURL(photo)}
                                                    alt={`Upload ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newPhotos = [...formData.photos];
                                                        newPhotos.splice(index, 1);
                                                        updateForm("photos", newPhotos);
                                                    }}
                                                    className="absolute top-1 right-1 bg-primary/80 text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}

                                        {formData.photos.length < 10 && (
                                            <label className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50 transition-all aspect-square">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files) {
                                                            const files = Array.from(e.target.files);
                                                            const remainingSlots = 10 - formData.photos.length;
                                                            const filesToAdd = files.slice(0, remainingSlots);

                                                            if (files.length > remainingSlots) {
                                                                alert(`You can only add ${remainingSlots} more photos.`);
                                                            }
                                                            updateForm("photos", [...formData.photos, ...filesToAdd]);
                                                        }
                                                    }}
                                                />
                                                <span className="text-xs font-medium text-muted-foreground">Add Photo</span>
                                            </label>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Upload up to 10 photos. Supported formats: JPG, PNG.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-sm font-medium block">Menu</label>

                                    <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                                        <button
                                            type="button"
                                            onClick={() => updateForm("menuType", "link")}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.menuType === "link"
                                                ? "bg-card text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            Link / URL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateForm("menuType", "photos")}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.menuType === "photos"
                                                ? "bg-card text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            Upload Photos
                                        </button>
                                    </div>

                                    {formData.menuType === "link" ? (
                                        <input
                                            type="url"
                                            className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="https://..."
                                            value={formData.menuLink}
                                            onChange={(e) => updateForm("menuLink", e.target.value)}
                                        />
                                    ) : (
                                        <div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                                                {formData.menuPhotos.map((photo, index) => (
                                                    <div
                                                        key={index}
                                                        className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border group bg-muted/20"
                                                    >
                                                        <img
                                                            src={URL.createObjectURL(photo)}
                                                            alt={`Menu Page ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newPhotos = [...formData.menuPhotos];
                                                                newPhotos.splice(index, 1);
                                                                updateForm("menuPhotos", newPhotos);
                                                            }}
                                                            className="absolute top-1 right-1 bg-primary/80 text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}

                                                <label className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50 transition-all aspect-[3/4]">
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files) {
                                                                const files = Array.from(e.target.files);
                                                                updateForm("menuPhotos", [...formData.menuPhotos, ...files]);
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-xs font-medium text-muted-foreground">Add Page</span>
                                                </label>
                                            </div>

                                            <p className="text-xs text-muted-foreground">
                                                Upload menu pages. Supported formats: JPG, PNG.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Website</label>
                                        <input
                                            type="url"
                                            className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="https://yourcafe.com"
                                            value={formData.website}
                                            onChange={(e) => updateForm("website", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Instagram URL</label>
                                        <input
                                            type="url"
                                            className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="https://instagram.com/..."
                                            value={formData.instagram}
                                            onChange={(e) => updateForm("instagram", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    )}

                    {/* Step 3 */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold">Finishing touches</h2>
                                <p className="text-muted-foreground">What makes your place special?</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium">Table Configuration</label>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Specify how many tables of each size you have.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">2-Seat Tables</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            value={formData.tables2Seat || ""}
                                            onChange={(e) =>
                                                updateForm("tables2Seat", parseInt(e.target.value) || 0)
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">4-Seat Tables</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            value={formData.tables4Seat || ""}
                                            onChange={(e) =>
                                                updateForm("tables4Seat", parseInt(e.target.value) || 0)
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium">Amenities</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {["WiFi", "Power Outlets", "Outdoor Seating", "Pet Friendly", "Vegan Options", "Live Music", "Board Games", "Well-stocked bathroom"].map(
                                        (amenity) => (
                                            <button
                                                key={amenity}
                                                type="button"
                                                onClick={() => toggleAmenity(amenity)}
                                                className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all ${formData.amenities.includes(amenity)
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "bg-background border-border hover:bg-muted"
                                                    }`}
                                            >
                                                {amenity} {formData.amenities.includes(amenity) && "✓"}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium">Working Hours</label>
                                <div className="space-y-3 bg-card border border-border/50 rounded-lg p-4">
                                    {Object.entries(formData.workingHours).map(([day, hours]) => (
                                        <div key={day} className="flex items-center gap-4 text-sm">
                                            <div className="w-24 font-medium text-foreground/80">{day}</div>

                                            <label className="flex items-center gap-2 cursor-pointer min-w-[80px]">
                                                <input
                                                    type="checkbox"
                                                    checked={hours.closed}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.workingHours };
                                                        newHours[day].closed = e.target.checked;
                                                        updateForm("workingHours", newHours);
                                                    }}
                                                />
                                                <span className="text-muted-foreground/70 text-xs uppercase tracking-wide">
                                                    Closed
                                                </span>
                                            </label>

                                            {!hours.closed && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={hours.open}
                                                        onChange={(e) => {
                                                            const newHours = { ...formData.workingHours };
                                                            newHours[day].open = e.target.value;
                                                            updateForm("workingHours", newHours);
                                                        }}
                                                        className="px-2 py-1 border border-border rounded outline-none bg-muted/30 text-foreground"
                                                    />
                                                    <span className="text-muted-foreground/50">-</span>
                                                    <input
                                                        type="time"
                                                        value={hours.close}
                                                        onChange={(e) => {
                                                            const newHours = { ...formData.workingHours };
                                                            newHours[day].close = e.target.value;
                                                            updateForm("workingHours", newHours);
                                                        }}
                                                        className="px-2 py-1 border border-border rounded outline-none bg-muted/30 text-foreground"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Nav buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-border">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="px-6 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
                                disabled={submitting}
                            >
                                Back
                            </button>
                        ) : (
                            <Link
                                href="/dashboard"
                                className="px-6 py-2 rounded-lg hover:bg-muted transition-colors font-medium text-muted-foreground"
                            >
                                Cancel
                            </Link>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-8 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                                disabled={submitting}
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={submitForm}
                                className="px-8 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                                disabled={submitting}
                            >
                                {submitting ? "Submitting..." : "Complete Setup"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
