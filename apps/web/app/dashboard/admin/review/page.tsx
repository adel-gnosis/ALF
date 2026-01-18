'use client';

import { usePendingReviews, useApproveActivity, useRejectActivity } from '@alf/shared';
import { useState } from 'react';

export default function AdminReviewPage() {
    const { data, isLoading } = usePendingReviews();
    const approve = useApproveActivity();
    const reject = useRejectActivity();

    // Simple reject flow
    const handleReject = async (id: number) => {
        const reason = prompt('Enter rejection reason:');
        if (reason) {
            await reject.mutateAsync({ id, reason });
        }
    };

    const handleApprove = async (id: number) => {
        if (confirm('Approve this activity?')) {
            await approve.mutateAsync(id);
        }
    };

    if (isLoading) return <div>Loading queue...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {data?.activities?.map((activity) => (
                        <li key={activity.id} className="px-6 py-6 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                                            {activity.activity_type}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${activity.version > 1 ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {activity.version > 1 ? 'Correction / Suggestion' : 'Nouveau Contenu'}
                                        </span>
                                        <span className="text-xs text-gray-500">v{activity.version}</span>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">{activity.question_text}</h3>

                                    <div className="mt-2 text-sm text-gray-500 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="font-semibold text-gray-700">Auteur:</span> {activity.created_by.username}
                                        </div>
                                        {activity.modified_by && activity.modified_by.id !== activity.created_by.id && (
                                            <div>
                                                <span className="font-semibold text-gray-700">Suggéré par:</span> <span className="text-blue-600 font-medium">{activity.modified_by.username}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="font-semibold text-gray-700">Points:</span> {activity.points}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-700">Leçon:</span> {activity.lesson.title} ({activity.lesson.level})
                                        </div>
                                    </div>

                                    {activity.version_notes && (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-100">
                                            <span className="block text-xs font-bold text-gray-550 uppercase mb-1">Notes de révision:</span>
                                            <p className="text-sm text-gray-700 italic">"{activity.version_notes}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleApprove(activity.id)}
                                        className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(activity.id)}
                                        className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}

                    {data?.activities?.length === 0 && (
                        <li className="px-6 py-12 text-center text-gray-500">
                            No pending reviews! Good job.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
