import React, { createContext, useContext, useEffect, useState } from 'react';
import storage from '../services/storage';
import { useRouter, useSegments } from 'expo-router';
import api from '../services/api';
import { User } from '../types/session';

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    signIn: (token: string, refreshToken: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const token = await storage.getItem('access_token');
                if (token) {
                    // Verify token or get user profile
                    const response = await api.get('/auth/me/');
                    setUser(response.data);
                }
            } catch (e) {
                console.log('Error loading user', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === 'auth';
        const isRoot = segments.length === 0;

        if (!user && !inAuthGroup && !isRoot) {
            router.replace('/auth/login');
        } else if (user && inAuthGroup) {
            router.replace('/(tabs)/dashboard');
        }
    }, [user, segments, isLoading]);

    const signIn = async (token: string, refreshToken: string) => {
        await storage.setItem('access_token', token);
        await storage.setItem('refresh_token', refreshToken);
        const response = await api.get('/auth/me/');
        setUser(response.data);
    };

    const signOut = async () => {
        await storage.removeItem('access_token');
        await storage.removeItem('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
