'use client';

import { useAdminActivities, ACTIVITY_CATEGORIES, ActivityCategory, ActivityStatus } from '@alf/shared';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ActivityForm from '../../components/ActivityForm';

export default function AdminActivitiesPage() {
    const searchParams = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [showForm, setShowForm] = useState(false);

    const urlCategory = searchParams.get('category') as ActivityCategory | null;
    const isMine = searchParams.get('mine') === 'true';
    const isCreate = searchParams.get('create') === 'true';

    // Build activity_type param from category
    const activityType = urlCategory && urlCategory in ACTIVITY_CATEGORIES
        ? ACTIVITY_CATEGORIES[urlCategory].types.join(',')
        : undefined;

    const { data, isLoading, refetch } = useAdminActivities({
        status: statusFilter || undefined,
        activity_type: activityType,
        created_by_me: isMine || undefined
    });

    // Check for create param on mount or change
    useEffect(() => {
        if (isCreate) setShowForm(true);
    }, [isCreate]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'REJECTED':
                return 'bg-red-100 text-red-800';
            case 'DRAFT':
                return 'bg-gray-100 text-gray-800';
            case 'ARCHIVED':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) return <div className="p-6 text-center">Chargement...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isMine ? 'Mes Activités' : urlCategory ? `Activités: ${ACTIVITY_CATEGORIES[urlCategory].label}` : 'Toutes les Activités'}
                    </h1>
                    {(urlCategory || isMine) && (
                        <span className="text-sm text-muted-foreground">Vue filtrée</span>
                    )}
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
                >
                    <span>+ Nouvelle Activité</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Filtrer par statut:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 text-sm"
                    >
                        <option value="">Tous</option>
                        <option value="DRAFT">Brouillon</option>
                        <option value="PENDING">En attente</option>
                        <option value="APPROVED">Approuvé</option>
                        <option value="REJECTED">Rejeté</option>
                        <option value="ARCHIVED">Archivé</option>
                    </select>
                    <span className="text-sm text-gray-500">
                        {data?.total || 0} activité(s) trouvée(s)
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Question
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Leçon
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Auteur
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Statut
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data?.activities?.map((activity) => (
                            <tr key={activity.id}>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                        {activity.question_text || 'Sans texte'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        v{activity.version} • {activity.difficulty}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                        {activity.activity_type.replace('Activity', '')}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{activity.lesson.title}</div>
                                    <div className="text-xs text-gray-500">
                                        {activity.lesson.level} • {activity.lesson.subject}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                        {activity.created_by?.username || 'Système'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                                        {activity.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                    <button
                                        className="text-indigo-600 hover:text-indigo-900"
                                        onClick={() => alert(`Détails de l'activité #${activity.id}\n\n${JSON.stringify(activity, null, 2)}`)}
                                    >
                                        Voir
                                    </button>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        Éditer
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data?.activities?.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                        Aucune activité trouvée.
                    </div>
                )}
            </div>

            {/* Activity Form Modal */}
            <ActivityForm
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSuccess={() => refetch()}
            />
        </div>
    );
}