import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ReservationDetails = {
    cafeId: string;
    date: Date;
    time: string;
    partySize: number;
    specialRequest?: string;
};

type ReservationContextType = {
    reservation: ReservationDetails | null;
    reserveTable: (details: ReservationDetails) => void;
    cancelReservation: () => void;
    hasReservation: (cafeId: string) => boolean;
};

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export function ReservationProvider({ children }: { children: ReactNode }) {
    const [reservation, setReservation] = useState<ReservationDetails | null>(null);

    const reserveTable = (details: ReservationDetails) => {
        setReservation(details);
    };

    const cancelReservation = () => {
        setReservation(null);
    };

    const hasReservation = (cafeId: string) => {
        return reservation?.cafeId === cafeId;
    };

    return (
        <ReservationContext.Provider value={{ reservation, reserveTable, cancelReservation, hasReservation }}>
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
