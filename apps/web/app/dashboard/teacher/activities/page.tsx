'use client';

import { useTeacherActivities, useSubmitForReview, TeacherActivity } from '@alf/shared';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ActivityForm from '../../components/ActivityForm';

export default function TeacherActivitiesPage() {
    const { data, isLoading, refetch } = useTeacherActivities();
    const submitForReview = useSubmitForReview();
    const searchParams = useSearchParams();

    const [submittingId, setSubmittingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<TeacherActivity | undefined>(undefined);

    // Initial check for create param
    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setShowForm(true);
        }
    }, [searchParams]);

    const handleCreateNew = () => {
        setSelectedActivity(undefined);
        setShowForm(true);
    };

    const handleEdit = (activity: TeacherActivity) => {
        setSelectedActivity(activity);
        setShowForm(true);
    };

    const handleSubmit = async (id: number) => {
        if (!confirm('Soumettre cette activité pour révision par un admin ?')) return;
        setSubmittingId(id);
        try {
            await submitForReview.mutateAsync(id);
            refetch();
        } catch (e) {
            alert('Erreur lors de la soumission');
        } finally {
            setSubmittingId(null);
        }
    };

    if (isLoading) return <div className="p-6">Chargement...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Mes Activités</h1>
                <button
                    onClick={handleCreateNew}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    + Nouvelle Activité
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activité</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leçon / Difficulté</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data?.activities?.map((activity) => (
                            <tr key={activity.id}>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{activity.question_text || 'Sans texte'}</div>
                                    <div className="text-sm text-gray-500">
                                        {activity.activity_type} <span className="text-xs bg-gray-100 rounded px-1">v{activity.version}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{activity.lesson.title}</div>
                                    <div className="text-xs text-gray-500">{activity.difficulty}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${activity.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            activity.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {activity.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                    <button
                                        className="text-indigo-600 hover:text-indigo-900"
                                        onClick={() => alert(`Détails de l'activité #${activity.id}\n${JSON.stringify(activity, null, 2)}`)}
                                    >
                                        Voir
                                    </button>

                                    {activity.status === 'DRAFT' && (
                                        <button
                                            onClick={() => handleSubmit(activity.id)}
                                            disabled={submittingId === activity.id}
                                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                        >
                                            {submittingId === activity.id ? 'Soumission...' : 'Soumettre'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleEdit(activity)}
                                        className="text-green-600 hover:text-green-900"
                                    >
                                        Éditer
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data?.activities.length === 0 && (
                    <div className="p-6 text-center text-gray-500">Aucune activité trouvée.</div>
                )}
            </div>

            {/* Activity Form Modal */}
            <ActivityForm
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSuccess={() => refetch()}
                editActivity={selectedActivity}
                isSuggestion={false}
            />
        </div>
    );
}