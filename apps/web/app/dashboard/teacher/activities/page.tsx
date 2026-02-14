'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTeacherActivities, useSubmitForReview, useMe, TeacherActivity } from '@alf/shared';
import { Plus, RefreshCw } from 'lucide-react';
import {
    ActivityCard,
    ActivityFilters,
    ActivityPreviewModal,
    ActivityEditModal,
    ViewModeToggle,
    PaginationControls,
    type ViewMode
} from '@/components/activities';
import ActivityCreationWizard from '@/components/ActivityCreationWizard';
import { useI18n } from '../../../../context/I18nContext';

export default function TeacherActivitiesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useI18n();
    const { data: user } = useMe();
    const submitForReview = useSubmitForReview();

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('cards');

    // Modal states
    const [showWizard, setShowWizard] = useState(false);
    const [previewActivity, setPreviewActivity] = useState<TeacherActivity | null>(null);
    const [editActivity, setEditActivity] = useState<TeacherActivity | null>(null);
    const [submittingId, setSubmittingId] = useState<number | null>(null);

    // Read filters and pagination from URL (server-side filtering)
    const isCreate = searchParams.get('create') === 'true';
    const currentPage = parseInt(searchParams.get('page') || '1');
    const currentPageSize = parseInt(searchParams.get('page_size') || '30');

    // Convert string | null -> number | undefined safely for TS
const parseOptionalInt = (v: string | null): number | undefined => {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};


    // ✅ Server-side filtering via URL params
    const queryParams = useMemo(() => ({
  // numeric params - parsed to numbers (match hook types)
  // If your hook actually expects course_id as string, change that line back.
  course_id: parseOptionalInt(searchParams.get('course')),
  level_id: parseOptionalInt(searchParams.get('level')),
  subject_id: parseOptionalInt(searchParams.get('subject')),

  // string params
  activity_type: searchParams.get('type') || undefined,
  difficulty: searchParams.get('difficulty') || undefined,
  status: searchParams.get('status') || undefined,
  search: searchParams.get('search') || undefined,

  // pagination
  page: currentPage,
  page_size: currentPageSize,
}), [searchParams, currentPage, currentPageSize]);



    const { data, isLoading, refetch } = useTeacherActivities(queryParams);

    // Open create wizard if URL has create=true
    React.useEffect(() => {
        if (isCreate) setShowWizard(true);
    }, [isCreate]);

    // Pagination handlers
    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(page));
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePageSizeChange = (pageSize: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page_size', String(pageSize));
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const activities = data?.activities || [];

    // Handle activity preview navigation
    const currentPreviewIndex = previewActivity
        ? activities.findIndex(a => a.id === previewActivity.id)
        : -1;

    const handleNextPreview = () => {
        if (currentPreviewIndex < activities.length - 1) {
            setPreviewActivity(activities[currentPreviewIndex + 1]);
        }
    };

    const handlePrevPreview = () => {
        if (currentPreviewIndex > 0) {
            setPreviewActivity(activities[currentPreviewIndex - 1]);
        }
    };

    // Handle edit - opens ActivityEditModal
    const handleEdit = (activity: TeacherActivity) => {
        setEditActivity(activity);
    };

    // Handle submit for review
    const handleSubmit = async (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('Submit this activity for admin review?')) return;
        setSubmittingId(id);
        try {
            await submitForReview.mutateAsync(id);
            refetch();
        } catch (err) {
            alert('Error submitting for review');
        } finally {
            setSubmittingId(null);
        }
    };

    // Group activities by lesson for grouped view
    const groupedActivities = useMemo(() => {
        if (viewMode !== 'grouped') return {};
        return activities.reduce((acc, activity) => {
            const lessonKey = activity.lesson?.title || 'Uncategorized';
            if (!acc[lessonKey]) acc[lessonKey] = [];
            acc[lessonKey].push(activity);
            return acc;
        }, {} as Record<string, TeacherActivity[]>);
    }, [activities, viewMode]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('nav.my_activities') || 'My Activities'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {data?.total || 0} {(data?.total || 0) === 1 ? 'activity' : 'activities'} found
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <ViewModeToggle mode={viewMode} onChange={setViewMode} />
                    <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Activity</span>
                    </button>
                </div>
            </div>

            {/* Filters - using server-side URL params */}
            <ActivityFilters />

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!isLoading && activities.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                    <div className="text-4xl mb-3">📭</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No activities found</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Try adjusting your filters or create a new activity.</p>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Activity
                    </button>
                </div>
            )}

            {/* Card View */}
            {!isLoading && viewMode === 'cards' && activities.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activities.map(activity => (
                        <ActivityCard
                            key={activity.id}
                            activity={activity}
                            onPreview={setPreviewActivity}
                            onEdit={handleEdit}
                            onSubmit={activity.status === 'DRAFT' ? () => handleSubmit(activity.id) : undefined}
                            isSubmitting={submittingId === activity.id}
                        />
                    ))}
                </div>
            )}

            {/* Table View */}
            {!isLoading && viewMode === 'table' && activities.length > 0 && (
                <div className="bg-white dark:bg-slate-800 shadow rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Activity</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Lesson</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {activities.map(activity => (
                                <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                                            {activity.question_text || 'No text'}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">
                                            v{activity.version} • {activity.difficulty}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-300 rounded text-xs font-medium">
                                            {activity.activity_type?.replace('Activity', '') || 'Activity'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900 dark:text-white">{activity.lesson?.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">
                                            {activity.lesson?.level} • {activity.lesson?.subject}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${activity.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                                            activity.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                                activity.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                                                    'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-300'
                                            }`}>
                                            {activity.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPreviewActivity(activity)}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                                            >
                                                Preview
                                            </button>
                                            <button
                                                onClick={() => handleEdit(activity)}
                                                className="text-gray-600 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-300 text-sm font-medium"
                                            >
                                                Edit
                                            </button>
                                            {activity.status === 'DRAFT' && (
                                                <button
                                                    onClick={(e) => handleSubmit(activity.id, e)}
                                                    disabled={submittingId === activity.id}
                                                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium disabled:opacity-50"
                                                >
                                                    {submittingId === activity.id ? 'Submitting...' : 'Submit'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Grouped View */}
            {!isLoading && viewMode === 'grouped' && activities.length > 0 && (
                <div className="space-y-6">
                    {Object.entries(groupedActivities).map(([lessonTitle, lessonActivities]) => (
                        <div key={lessonTitle} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{lessonTitle}</h3>
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded-full text-xs font-medium">
                                    {lessonActivities.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {lessonActivities.map(activity => (
                                    <ActivityCard
                                        key={activity.id}
                                        activity={activity}
                                        onPreview={setPreviewActivity}
                                        onEdit={handleEdit}
                                        onSubmit={activity.status === 'DRAFT' ? () => handleSubmit(activity.id) : undefined}
                                        isSubmitting={submittingId === activity.id}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && activities.length > 0 && data?.total_pages && data.total_pages > 1 && (
                <PaginationControls
                    page={currentPage}
                    totalPages={data.total_pages}
                    total={data.total}
                    pageSize={currentPageSize}
                    hasNext={data.has_next ?? currentPage < data.total_pages}
                    hasPrev={data.has_prev ?? currentPage > 1}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}

            {/* Preview Modal */}
            <ActivityPreviewModal
                activity={previewActivity}
                isOpen={!!previewActivity}
                onClose={() => setPreviewActivity(null)}
                onEdit={handleEdit}
                onNext={handleNextPreview}
                onPrev={handlePrevPreview}
                hasNext={currentPreviewIndex < activities.length - 1}
                hasPrev={currentPreviewIndex > 0}
                user={user}
            />

            {/* ✅ Activity Edit Modal (replaces old ActivityForm) */}
            <ActivityEditModal
                activity={editActivity}
                isOpen={!!editActivity}
                onClose={() => setEditActivity(null)}
                onSuccess={() => {
                    refetch();
                    setEditActivity(null);
                }}
                isSuggestion={false}
            />

            {/* Activity Creation Wizard */}
            <ActivityCreationWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
            />
        </div>
    );
}