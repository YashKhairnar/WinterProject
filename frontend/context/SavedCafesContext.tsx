import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface SavedCafe {
    id: string;
    name: string;
    address: string;
    image: string;
}

type SavedCafesContextType = {
    savedCafes: SavedCafe[];
    toggleSaved: (cafe: SavedCafe) => void;
    isSaved: (id: string) => boolean;
};

const SavedCafesContext = createContext<SavedCafesContextType | undefined>(undefined);

export function SavedCafesProvider({ children }: { children: ReactNode }) {
    const [savedCafes, setSavedCafes] = useState<SavedCafe[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    // load user and saved cafes
    useEffect(() => {
        (async () => {
            try {
                // First check if user is actually logged in
                const session = await getCurrentUser().catch(() => null);
                if (!session) return;

                const user = await fetchUserAttributes();
                if (user && user.sub) {
                    setUserId(user.sub);
                    // fetch saved cafes
                    const res = await fetch(`${API_URL}/users/${user.sub}`);
                    if (res.ok) {
                        const profile = await res.json();
                        // Backend returns saved_cafes as [{id, name, address, cafe_photos:[]}, ...]
                        // Map to frontend SavedCafe structure
                        const mapped = (profile.saved_cafes || []).map((c: any) => ({
                            id: c.id,
                            name: c.name,
                            address: c.address,
                            image: (c.cafe_photos && c.cafe_photos.length > 0) ? c.cafe_photos[0] : ''
                        }));
                        setSavedCafes(mapped);
                    }
                }
            } catch (err: any) {
                // Ignore unauthenticated error on landing page
                if (err.name !== 'UserUnAuthenticatedException' && err.name !== 'NotAuthorizedException') {
                    console.error("Failed to load saved cafes:", err);
                }
            }
        })();
    }, []);

    const toggleSaved = async (cafe: SavedCafe) => {
        // Optimistic Update
        const wasSaved = savedCafes.some(c => c.id === cafe.id);

        setSavedCafes(prev => {
            if (wasSaved) {
                return prev.filter(c => c.id !== cafe.id);
            }
            return [...prev, cafe];
        });

        if (!userId) return;

        try {
            if (wasSaved) {
                // Remove
                await fetch(`${API_URL}/users/${userId}/saved_cafes/${cafe.id}`, { method: 'DELETE' });
            } else {
                // Add
                await fetch(`${API_URL}/users/${userId}/saved_cafes/${cafe.id}`, { method: 'POST' });
            }
        } catch (err) {
            console.error("Failed to sync save", err);
            // Revert on error? For now, keep optimistic layout
        }
    };

    const isSaved = (id: string) => savedCafes.some(c => c.id === id);

    return (
        <SavedCafesContext.Provider value={{ savedCafes, toggleSaved, isSaved }}>
            {children}
        </SavedCafesContext.Provider>
    );
}

export function useSavedCafes() {
    const context = useContext(SavedCafesContext);
    if (context === undefined) {
        throw new Error('useSavedCafes must be used within a SavedCafesProvider');
    }
    return context;
}
