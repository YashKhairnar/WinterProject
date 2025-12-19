import React, { createContext, useState, useContext, ReactNode } from 'react';

type SavedCafesContextType = {
    savedCafeIds: string[];
    toggleSaved: (id: string) => void;
    isSaved: (id: string) => boolean;
};

const SavedCafesContext = createContext<SavedCafesContextType | undefined>(undefined);

export function SavedCafesProvider({ children }: { children: ReactNode }) {
    const [savedCafeIds, setSavedCafeIds] = useState<string[]>([]);

    const toggleSaved = (id: string) => {
        setSavedCafeIds(prev =>
            prev.includes(id)
                ? prev.filter(savedId => savedId !== id)
                : [...prev, id]
        );
    };

    const isSaved = (id: string) => savedCafeIds.includes(id);

    return (
        <SavedCafesContext.Provider value={{ savedCafeIds, toggleSaved, isSaved }}>
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
