import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';

type CheckInContextType = {
    checkIns: string[]; // List of cafe IDs checked into today
    addCheckIn: (id: string) => Promise<void>;
    isCheckedIn: (id: string) => boolean;
    loading: boolean;
};

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

export function CheckInProvider({ children }: { children: ReactNode }) {
    const [checkIns, setCheckIns] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';


    useEffect(() => {
        const init = async () => {
            try {
                const attributes = await fetchUserAttributes();
                if (attributes.sub) {
                    setUserId(attributes.sub);
                    // Fetch today's check-ins from backend
                    const response = await fetch(`${apiUrl}/checkins/today?user_sub=${attributes.sub}`);
                    if (response.ok) {
                        const data = await response.json();
                        setCheckIns(data);
                    }
                }
            } catch (error) {
                // console.error("Error initializing CheckInContext:", error);
                // ignore and be there on the landing page
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const addCheckIn = async (id: string) => {
        if (!userId) return;

        try {
            const response = await fetch(`${apiUrl}/checkins/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_sub: userId,
                    cafe_id: id,
                }),
            });

            if (response.ok) {
                if (!checkIns.includes(id)) {
                    setCheckIns(prev => [...prev, id]);
                }
            } else {
                console.error("Failed to persist check-in to backend");
            }
        } catch (error) {
            console.error("Error adding check-in:", error);
        }
    };

    const isCheckedIn = (id: string) => checkIns.includes(id);

    return (
        <CheckInContext.Provider value={{ checkIns, addCheckIn, isCheckedIn, loading }}>
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
