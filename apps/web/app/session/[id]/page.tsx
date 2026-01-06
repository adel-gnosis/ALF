'use client';

import { useSession } from '@alf/shared';
import React from 'react';

export default function SessionPage({ params }: { params: { id: string } }) {
    // Note: in Next.js 15, params is a Promise, need to unwrap or use logic accordingly.
    // For simplicity in this demo, assuming unwrapped or handled.
    // Actually Next.js 15 requires awaiting params in async component or usage in 'use client' via hook/props.
    // Since 'use client', params comes as prop but might need proper typing.
    // Let's assume standard behavior for now.

    const { id } = React.use(params);
    const { data: session, isLoading, error } = useSession(id);

    if (isLoading) return <div className="p-8">Loading session...</div>;
    if (error) return <div className="p-8 text-red-500">Error loading session</div>;
    if (!session) return <div className="p-8">Session not found</div>;

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
                <h1 className="text-2xl font-bold mb-4">Session: {session.type}</h1>
                <div className="space-y-2">
                    <p>Status: <span className="font-semibold">{session.status}</span></p>
                    <p>Started: {new Date(session.started_at).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}
