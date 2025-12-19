import React, { createContext, useState, useContext, ReactNode } from 'react';

type CheckInContextType = {
    checkIns: string[]; // List of cafe IDs checked into
    addCheckIn: (id: string) => void;
    isCheckedIn: (id: string) => boolean;
};

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

export function CheckInProvider({ children }: { children: ReactNode }) {
    const [checkIns, setCheckIns] = useState<string[]>([]);

    const addCheckIn = (id: string) => {
        if (!checkIns.includes(id)) {
            setCheckIns(prev => [...prev, id]);
        }
    };

    const isCheckedIn = (id: string) => checkIns.includes(id);

    return (
        <CheckInContext.Provider value={{ checkIns, addCheckIn, isCheckedIn }}>
            {children}
        </CheckInContext.Provider>
    );
}

export function useCheckIn() {
    const context = useContext(CheckInContext);
    if (context === undefined) {
        throw new Error('useCheckIn must be used within a CheckInProvider');
    }
    return context;
}
