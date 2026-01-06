"use client";

import { useEffect, useState } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';

export function useAuthProtection() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const user = await getCurrentUser();
            setUserId(user.userId);
            setIsAuthenticated(true);
        } catch (error) {
            setIsAuthenticated(false);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }

    return { isAuthenticated, loading, userId, signOut };
}
