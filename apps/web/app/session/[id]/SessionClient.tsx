'use client';

import { useSession } from '@alf/shared';
import React from 'react';

export default function SessionClient({ id }: { id: string }) {
  const { data: session, isLoading, error } = useSession(id);

  if (isLoading) return <div className="p-8">Loading session...</div>;
  if (error) return <div className="p-8 text-red-500">Error loading session</div>;
  if (!session) return <div className="p-8">Session not found</div>;

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Session: {session.type}</h1>
        <div className="space-y-2">
          <p>
            Status: <span className="font-semibold">{session.status}</span>
          </p>
          <p>Started: {new Date(session.started_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
