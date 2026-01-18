'use client';

import { useMe, UserRole, initAuthCallback } from '@alf/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Helper to ensure tokens are loaded
initAuthCallback();

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: user, isLoading, isError } = useMe();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (isError) {
            router.push('/auth/login');
        }
    }, [isError, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg text-primary"></div>
                    <span className="text-sm font-medium animate-pulse">Establishing secure connection...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect via effect
    }

    return (
        <div className="min-h-screen bg-bg-main transition-colors duration-300">
            {/* Navigation Overlay components */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="flex min-h-screen flex-col lg:pl-72 transition-all duration-300">
                <Header onMenuClick={() => setIsSidebarOpen(true)} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>

                <footer className="border-t border-border bg-background/50 py-4 px-8 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    © 2026 ALF System • Advanced Learning Framework • Secure Console
                </footer>
            </div>
        </div>
    );
}
