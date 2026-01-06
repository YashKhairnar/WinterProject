import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';


export type ReservationDetails = {
    id?: string;
    cafeId: string;
    cafeName?: string;
    date: Date;
    time: string;
    partySize: number;
    specialRequest?: string;
    status?: string;
};

type ReservationContextType = {
    reservations: ReservationDetails[];
    reserveTable: (details: ReservationDetails) => Promise<void>;
    cancelReservation: (reservationId: string) => Promise<void>;
    hasReservation: (cafeId: string) => boolean;
    getReservation: (cafeId: string) => ReservationDetails | undefined;
    refreshReservations: () => Promise<void>;
    loading: boolean;
};

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export function ReservationProvider({ children }: { children: ReactNode }) {
    const [reservations, setReservations] = useState<ReservationDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [userSub, setUserSub] = useState<string | null>(null);

    // Get user sub on mount
    useEffect(() => {
        const getUserSub = async () => {
            try {
                const session = await fetchAuthSession();
                const sub = session.tokens?.idToken?.payload?.sub;
                if (sub) {
                    setUserSub(sub as string);
                }
            } catch (error) {
                console.error('Error getting user session:', error);
            }
        };
        getUserSub();
    }, []);

    // Fetch reservations when userSub is available
    useEffect(() => {
        if (userSub) {
            refreshReservations();
        }
    }, [userSub]);

    const refreshReservations = async () => {
        if (!userSub) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/reservations/user/${userSub}`);
            if (response.ok) {
                const data = await response.json();
                const mapped = data.map((r: any) => ({
                    id: r.id,
                    cafeId: r.cafe_id,
                    cafeName: r.cafe_name,
                    date: new Date(r.reservation_date),
                    time: r.reservation_time,
                    partySize: r.party_size,
                    specialRequest: r.special_request,
                    status: r.status,
                }));
                setReservations(mapped);
            }
        } catch (error) {
            console.error('Error fetching reservations:', error);
        } finally {
            setLoading(false);
        }
    };

    const reserveTable = async (details: ReservationDetails) => {
        if (!userSub) throw new Error('User not authenticated');

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/reservations/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cafe_id: details.cafeId,
                    user_sub: userSub,
                    reservation_date: details.date.toISOString(),
                    reservation_time: details.time,
                    party_size: details.partySize,
                    special_request: details.specialRequest || null,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create reservation');
            }

            await refreshReservations();
        } finally {
            setLoading(false);
        }
    };

    const cancelReservation = async (reservationId: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' }),
            });

            if (!response.ok) {
                throw new Error('Failed to cancel reservation');
            }

            await refreshReservations();
        } finally {
            setLoading(false);
        }
    };

    const hasReservation = (cafeId: string) => {
        return reservations.some(r => r.cafeId === cafeId && (r.status === 'pending' || r.status === 'confirmed'));
    };

    const getReservation = (cafeId: string) => {
        return reservations.find(r => r.cafeId === cafeId && (r.status === 'pending' || r.status === 'confirmed'));
    };

    return (
        <ReservationContext.Provider value={{
            reservations,
            reserveTable,
            cancelReservation,
            hasReservation,
            getReservation,
            refreshReservations,
            loading
        }}>
            {children}
        </ReservationContext.Provider>
    );
}

export function useReservation() {
    const context = useContext(ReservationContext);
    if (context === undefined) {
        throw new Error('useReservation must be used within a ReservationProvider');
    }
    return context;
}
