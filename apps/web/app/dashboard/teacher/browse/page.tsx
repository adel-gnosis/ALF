'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useBrowseActivities, useMe, ACTIVITY_CATEGORIES, ActivityCategory, TeacherActivity } from '@alf/shared';
import {
    Library,
    RefreshCw,
    SearchX
} from 'lucide-react';
import {
    ActivityCard,
    ActivityFilters,
    ActivityPreviewModal,
    ActivityEditModal,
    ViewModeToggle,
    PaginationControls,
    type ViewMode
} from '@/components/activities';
import { useI18n } from '../../../../context/I18nContext';

export default function BrowseActivitiesPage() {
    const { data: user } = useMe();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useI18n();

    const urlCategory = searchParams.get('category') as ActivityCategory | null;

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('table');

    // Modal states
    const [previewActivity, setPreviewActivity] = useState<TeacherActivity | null>(null);
    const [editActivity, setEditActivity] = useState<TeacherActivity | null>(null);
    const [isSuggestion, setIsSuggestion] = useState(false);

    // Pagination from URL
    const currentPage = parseInt(searchParams.get('page') || '1');
    const currentPageSize = parseInt(searchParams.get('page_size') || '30');

    // Build activity_type param from category
    const category = urlCategory && urlCategory in ACTIVITY_CATEGORIES ? urlCategory : 'all';
    const activityType = category === 'all'
        ? undefined
        : ACTIVITY_CATEGORIES[category].types.join(',');

    // Convert string | null -> number | undefined safely for TS
const parseOptionalInt = (v: string | null): number | undefined => {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};


    // Server-side query params
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



    const { data, isLoading, refetch } = useBrowseActivities(queryParams);

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

    // Handle edit (own activity)
    const handleEdit = (activity: TeacherActivity) => {
        setEditActivity(activity);
        setIsSuggestion(false);
    };

    // Handle suggest edit (another user's activity)
    const handleSuggestEdit = (activity: TeacherActivity) => {
        setEditActivity(activity);
        setIsSuggestion(true);
    };

    // Handle edit success - simplified since modal doesn't pass response
    const handleEditSuccess = () => {
        refetch();
        setEditActivity(null);
        // Show simple confirmation
        if (isSuggestion) {
            alert('Suggestion sent for review');
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
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Library className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {t('nav.public_library') || 'Public Library'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {data?.total || 0} approved activities available
                        </p>
                    </div>
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
                </div>
            </div>

            {/* Filters */}
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
                    <SearchX className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No activities found</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Try adjusting your filters.</p>
                </div>
            )}

            {/* Card View */}
            {!isLoading && viewMode === 'cards' && activities.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activities.map(activity => {
                        const isOwnActivity = activity.created_by?.id === user?.id;
                        return (
                            <ActivityCard
                                key={activity.id}
                                activity={activity}
                                onPreview={setPreviewActivity}
                                onEdit={isOwnActivity ? () => handleEdit(activity) : () => handleSuggestEdit(activity)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Table View */}
            {!isLoading && viewMode === 'table' && activities.length > 0 && (
                <div className="bg-white dark:bg-slate-800 shadow rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Question & Details</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type / Lesson</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Author</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Stats</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {activities.map(activity => {
                                const isOwnActivity = activity.created_by?.id === user?.id;
                                return (
                                    <tr key={activity.id} className="group hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                                                {activity.question_text || 'No text'}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${activity.difficulty === 'HARD' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' :
                                                    activity.difficulty === 'MEDIUM' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' :
                                                        'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                                                    }`}>
                                                    {activity.difficulty}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {activity.points} PTS
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {activity.activity_type?.replace('Activity', '') || 'Activity'}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400 italic">
                                                {activity.lesson?.title}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                {activity.created_by?.username || 'System'}
                                            </div>
                                            {isOwnActivity && (
                                                <span className="text-[10px] text-blue-500 font-bold uppercase">You</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="text-sm font-black text-gray-900 dark:text-white">
                                                {activity.average_accuracy?.toFixed(0) || 0}%
                                            </div>
                                            <div className="text-[10px] text-muted-foreground uppercase">Success</div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setPreviewActivity(activity)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                                                >
                                                    Preview
                                                </button>
                                                {isOwnActivity ? (
                                                    <button
                                                        onClick={() => handleEdit(activity)}
                                                        className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-400 dark:hover:bg-green-900 rounded text-xs font-bold transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSuggestEdit(activity)}
                                                        className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900 rounded text-xs font-bold transition-colors"
                                                    >
                                                        Suggest Edit
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
                                {lessonActivities.map(activity => {
                                    const isOwnActivity = activity.created_by?.id === user?.id;
                                    return (
                                        <ActivityCard
                                            key={activity.id}
                                            activity={activity}
                                            onPreview={setPreviewActivity}
                                            onEdit={isOwnActivity ? () => handleEdit(activity) : () => handleSuggestEdit(activity)}
                                        />
                                    );
                                })}
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

            {/* ✅ Preview Modal (replaces alert) */}
            <ActivityPreviewModal
                activity={previewActivity}
                isOpen={!!previewActivity}
                onClose={() => setPreviewActivity(null)}
                onEdit={(activity) => {
                    const isOwn = activity.created_by?.id === user?.id;
                    if (isOwn) handleEdit(activity);
                    else handleSuggestEdit(activity);
                }}
                onNext={handleNextPreview}
                onPrev={handlePrevPreview}
                hasNext={currentPreviewIndex < activities.length - 1}
                hasPrev={currentPreviewIndex > 0}
                user={user}
            />

            {/* ✅ Activity Edit Modal (replaces ActivityForm) */}
            <ActivityEditModal
                activity={editActivity}
                isOpen={!!editActivity}
                onClose={() => setEditActivity(null)}
                onSuccess={handleEditSuccess}
                isSuggestion={isSuggestion}
            />


        </div>
    );
}
