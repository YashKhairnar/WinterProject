"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthProtection } from "../../hooks/useAuthProtection";


export default function OnboardingSetupPage() {
    const { isAuthenticated, loading, userId } = useAuthProtection();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const apiURL = process.env.NEXT_PUBLIC_API_URL;

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
        photos: [] as File[],
        totalTables: 0,
        workingHours: {
            Monday: { open: "09:00", close: "17:00", closed: false },
            Tuesday: { open: "09:00", close: "17:00", closed: false },
            Wednesday: { open: "09:00", close: "17:00", closed: false },
            Thursday: { open: "09:00", close: "17:00", closed: false },
            Friday: { open: "09:00", close: "17:00", closed: false },
            Saturday: { open: "10:00", close: "22:00", closed: false },
            Sunday: { open: "10:00", close: "22:00", closed: false },
        } as Record<string, { open: string; close: string; closed: boolean }>,
    });

    // Loading/Auth checks come AFTER hooks
    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!isAuthenticated) return null;

    // Sync Cognito ID once available
    if (userId && !formData.cognito_sub) {
        setFormData(prev => ({ ...prev, cognito_sub: userId }));
    }

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
                    setFormData(prev => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }));
                },
                (error) => {
                    console.error("Error fetching location:", error);
                    alert("Could not fetch location. Please allow location access.");
                }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    const handleNext = () => setStep((prev) => prev + 1);
    const handleBack = () => setStep((prev) => prev - 1);
    const submitForm = async () => {
        // Create FormData for multipart/form-data submission
        const formDataToSend = new FormData();

        // Add text fields
        formDataToSend.append('cognito_sub', formData.cognito_sub);
        formDataToSend.append('name', formData.name);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('phone_number', formData.phone);
        formDataToSend.append('address', formData.address);
        formDataToSend.append('city', formData.city);
        formDataToSend.append('latitude', String(formData.latitude || 0));
        formDataToSend.append('longitude', String(formData.longitude || 0));
        formDataToSend.append('instagram_url', formData.instagram);
        formDataToSend.append('website_link', formData.website);
        formDataToSend.append('menu_link', formData.menuLink);
        formDataToSend.append('total_tables', String(formData.totalTables));
        formDataToSend.append('occupancy_capacity', String(formData.totalTables * 4));
        formDataToSend.append('occupancy_level', '0');

        // Add JSON fields as strings
        formDataToSend.append('amenities', JSON.stringify(formData.amenities));
        formDataToSend.append('working_hours', JSON.stringify(formData.workingHours));

        // Add cafe photo files
        formData.photos.forEach((photo) => {
            formDataToSend.append('cafe_photos', photo);
        });

        // Add menu photo files
        formData.menuPhotos.forEach((photo) => {
            formDataToSend.append('menu_photos', photo);
        });

        const response = await fetch(`${apiURL}/cafes`, {
            method: "POST",
            body: formDataToSend  // Don't set Content-Type header - browser will set it with boundary
        })

        if (response.ok) {
            console.log("Cafe created successfully!");
            router.push('/profile')
        } else {
            const errorText = await response.text();
            console.error("Error creating cafe:", errorText);
            alert(`Failed to create cafe: ${errorText}`);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
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
                            <span className={`text-sm font-medium ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                                {s === 1 ? "Basic Info" : s === 2 ? "Media & Menu" : "Details"}
                            </span>
                            {s < 3 && <div className="w-12 h-[2px] bg-muted-foreground/20 mx-2" />}
                        </div>
                    ))}
                </div>

                <form onSubmit={(e) => e.preventDefault()} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                    {/* Step 1: Basic Information */}
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
                                        placeholder="New York"
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
                                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                            Fetch Location
                                        </button>

                                        {formData.latitude && formData.longitude && (
                                            <div className="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center border border-green-200">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                                <span className="text-sm font-medium">Location Fetched</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Click fetch to automatically get your current GPS coordinates.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Media & Menu */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold">Showcase your vibe</h2>
                                <p className="text-muted-foreground">Photos and menu details.</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-medium mb-4 block">
                                        Cafe Photos <span className="text-muted-foreground font-normal">({formData.photos.length}/10)</span>
                                    </label>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        {formData.photos.map((photo, index) => (
                                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
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
                                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>
                                        ))}

                                        {formData.photos.length < 10 && (
                                            <label className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all aspect-square">
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
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                </div>
                                                <span className="text-xs font-medium text-gray-600">Add Photo</span>
                                            </label>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Upload up to 10 photos. Supported formats: JPG, PNG.</p>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-sm font-medium block">Menu</label>

                                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                                        <button
                                            type="button"
                                            onClick={() => updateForm("menuType", "link")}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.menuType === "link"
                                                ? "bg-white text-black shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                                }`}
                                        >
                                            Link / URL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateForm("menuType", "photos")}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.menuType === "photos"
                                                ? "bg-white text-black shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                                }`}
                                        >
                                            Upload Photos
                                        </button>
                                    </div>

                                    {formData.menuType === "link" ? (
                                        <input
                                            type="url"
                                            className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all animate-in fade-in"
                                            placeholder="https://..."
                                            value={formData.menuLink}
                                            onChange={(e) => updateForm("menuLink", e.target.value)}
                                        />
                                    ) : (
                                        <div className="animate-in fade-in">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                                                {formData.menuPhotos.map((photo, index) => (
                                                    <div key={index} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 group">
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
                                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all aspect-[3/4]">
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
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-600">Add Page</span>
                                                </label>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Upload menu pages. Supported formats: JPG, PNG.</p>
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

                    {/* Step 3: Amenities & Final Details */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold">Finishing touches</h2>
                                <p className="text-muted-foreground">What makes your place special?</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium">Total Tables</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="e.g. 15"
                                    value={formData.totalTables || ""}
                                    onChange={(e) => updateForm("totalTables", parseInt(e.target.value) || 0)}
                                />
                                <p className="text-xs text-muted-foreground">This sets your initial dashboard capacity.</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium">Amenities</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {["WiFi", "Outlets", "Outdoor Seating", "Pet Friendly", "Vegan Options", "Live Music"].map((amenity) => (
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
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium">Working Hours</label>
                                <div className="space-y-3 bg-white border border-gray-100 rounded-lg p-4">
                                    {Object.entries(formData.workingHours).map(([day, hours]) => (
                                        <div key={day} className="flex items-center gap-4 text-sm">
                                            <div className="w-24 font-medium text-gray-700">{day}</div>

                                            <label className="flex items-center gap-2 cursor-pointer min-w-[80px]">
                                                <input
                                                    type="checkbox"
                                                    checked={hours.closed}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.workingHours };
                                                        newHours[day].closed = e.target.checked;
                                                        updateForm("workingHours", newHours);
                                                    }}
                                                    className="rounded border-gray-300 text-black focus:ring-black"
                                                />
                                                <span className="text-gray-500 text-xs uppercase tracking-wide">Closed</span>
                                            </label>

                                            {!hours.closed && (
                                                <div className="flex items-center gap-2 animate-in fade-in">
                                                    <input
                                                        type="time"
                                                        value={hours.open}
                                                        onChange={(e) => {
                                                            const newHours = { ...formData.workingHours };
                                                            newHours[day].open = e.target.value;
                                                            updateForm("workingHours", newHours);
                                                        }}
                                                        className="px-2 py-1 border border-gray-200 rounded outline-none focus:border-black"
                                                    />
                                                    <span className="text-gray-400">-</span>
                                                    <input
                                                        type="time"
                                                        value={hours.close}
                                                        onChange={(e) => {
                                                            const newHours = { ...formData.workingHours };
                                                            newHours[day].close = e.target.value;
                                                            updateForm("workingHours", newHours);
                                                        }}
                                                        className="px-2 py-1 border border-gray-200 rounded outline-none focus:border-black"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-border">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="px-6 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
                            >
                                Back
                            </button>
                        ) : (
                            <Link href="/dashboard" className="px-6 py-2 rounded-lg hover:bg-muted transition-colors font-medium text-muted-foreground">
                                Cancel
                            </Link>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-8 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={submitForm}
                                className="px-8 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                            >
                                Complete Setup
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
