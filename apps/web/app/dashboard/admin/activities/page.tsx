'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useBrowseActivities, useMe, TeacherActivity, useTeacherActivities } from '@alf/shared';
import { Plus, RefreshCw, Eye, Edit2 } from 'lucide-react';
import {
    ActivityCard,
    ActivityFilters,
    ActivityPreviewModal,
    ActivityEditModal,
    ViewModeToggle,
    PaginationControls,
    type ViewMode,
    type FilterState
} from '@/components/activities';
import ActivityForm from '../../components/ActivityForm';
import { useI18n } from '../../../../context/I18nContext';

export default function AdminActivitiesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useI18n();
    const { data: user } = useMe();

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('cards');

    // Modal states
    const [showForm, setShowForm] = useState(false);
    const [previewActivity, setPreviewActivity] = useState<TeacherActivity | null>(null);
    const [editActivity, setEditActivity] = useState<TeacherActivity | undefined>(undefined);
    const [quickEditActivity, setQuickEditActivity] = useState<TeacherActivity | null>(null);

    // Read filters and pagination from URL
    const isMine = searchParams.get('mine') === 'true';
    const isCreate = searchParams.get('create') === 'true';
    const currentPage = parseInt(searchParams.get('page') || '1');
    const currentPageSize = parseInt(searchParams.get('page_size') || '30');

    // Build query params from URL
    const parseOptionalInt = (v: string | null): number | undefined => {
    if (!v) return undefined;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
    };

    const queryParams = useMemo(() => ({
    course_id: parseOptionalInt(searchParams.get('course')),
    level_id: parseOptionalInt(searchParams.get('level')),
    subject_id: parseOptionalInt(searchParams.get('subject')),
    activity_type: searchParams.get('type') || undefined,
    difficulty: searchParams.get('difficulty') || undefined,
    search: searchParams.get('search') || undefined,
    // status: searchParams.get('status') || undefined, // optional; only if your browse view supports it for admins
    page: currentPage,
    page_size: currentPageSize,
    }), [searchParams, currentPage, currentPageSize]);


    const browseQuery = useBrowseActivities(queryParams);
    const mineQuery = useTeacherActivities(queryParams); // will hit /my-content/

    const data = isMine ? mineQuery.data : browseQuery.data;
    const isLoading = isMine ? mineQuery.isLoading : browseQuery.isLoading;
    const refetch = isMine ? mineQuery.refetch : browseQuery.refetch;


    // Pagination handlers
    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(page));
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePageSizeChange = (pageSize: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page_size', String(pageSize));
        params.set('page', '1'); // Reset to page 1 when changing page size
        router.push(`${pathname}?${params.toString()}`);
    };

    // Open create form if URL has create=true
    React.useEffect(() => {
        if (isCreate) setShowForm(true);
    }, [isCreate]);

    // Handle activity preview navigation
    const activities = data?.activities || [];
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

    // Handle edit - opens quick edit modal
    const handleEdit = (activity: TeacherActivity) => {
        setQuickEditActivity(activity);
    };

    // Handle full edit - opens full ActivityForm if needed
    const handleFullEdit = (activity: TeacherActivity) => {
        setEditActivity(activity);
        setShowForm(true);
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

    // Get page title based on filters
    const getPageTitle = () => {
        if (isMine) return t('nav.my_activities') || 'My Activities';
        return t('nav.all_content') || 'All Activities';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
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
                        onClick={() => { setEditActivity(undefined); setShowForm(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Activity</span>
                    </button>
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
                    <div className="text-4xl mb-3">📭</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No activities found</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Try adjusting your filters or create a new activity.</p>
                    <button
                        onClick={() => { setEditActivity(undefined); setShowForm(true); }}
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
                        />
                    ))}
                </div>
            )}

            {/* Table View - Enhanced Design */}
            {!isLoading && viewMode === 'table' && activities.length > 0 && (
                <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                                        Activity
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                                        Type
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest hidden md:table-cell">
                                        Preview
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                                        Lesson
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                                        Status
                                    </th>
                                    <th className="px-4 py-3.5 text-center text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {activities.map((activity, index) => {
                                    // Activity type styles
                                    const typeStyles: Record<string, { bg: string; text: string; icon: string }> = {
                                        MCQActivity: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', icon: '📝' },
                                        FillBlankActivity: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', icon: '✏️' },
                                        MatchingActivity: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', icon: '🔗' },
                                        DicteeActivity: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', icon: '🎵' },
                                        DragOrderActivity: { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', icon: '🔢' },
                                        ConjugationActivity: { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300', icon: '🔄' },
                                        MultipleAnswerActivity: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', icon: '📋' },
                                        TextInputActivity: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: '⌨️' },
                                    };
                                    const typeStyle = typeStyles[activity.activity_type] || typeStyles.MCQActivity;

                                    // Status styles
                                    const statusStyles: Record<string, { bg: string; text: string; ring: string }> = {
                                        APPROVED: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', ring: 'ring-green-500/20' },
                                        PENDING: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-500/20' },
                                        DRAFT: { bg: 'bg-gray-50 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-400', ring: 'ring-gray-500/20' },
                                        REJECTED: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-500/20' },
                                        ARCHIVED: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', ring: 'ring-purple-500/20' },
                                    };
                                    const statusStyle = statusStyles[activity.status] || statusStyles.DRAFT;

                                    // Mini preview helper
                                    const getMiniPreview = () => {
                                        const data = activity.type_specific_data || {};
                                        switch (activity.activity_type) {
                                            case 'MCQActivity':
                                            case 'MultipleAnswerActivity':
                                                const choices = data.choices_v2 || data.choices || [];
                                                return `${choices.length} choices`;
                                            case 'MatchingActivity':
                                                const pairs = data.pairs_v2 || data.pairs || {};
                                                return `${Object.keys(pairs).length} pairs`;
                                            case 'DicteeActivity':
                                                return data.text ? `"${data.text.slice(0, 20)}..."` : 'Audio dictation';
                                            case 'ConjugationActivity':
                                                return `${data.verb_infinitive || '?'} (${data.tense || '?'})`;
                                            case 'DragOrderActivity':
                                                const words = data.words || [];
                                                return `${words.length} words`;
                                            case 'FillBlankActivity':
                                                return data.correct_answer ? `→ "${data.correct_answer}"` : '___';
                                            default:
                                                return activity.difficulty;
                                        }
                                    };

                                    return (
                                        <tr
                                            key={activity.id}
                                            className={`${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-750'} hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group`}
                                        >
                                            {/* Activity Info */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {activity.question_text || 'No instruction text'}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                                                                #{activity.id}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">•</span>
                                                            <span className="text-[10px] text-gray-500 dark:text-slate-400">
                                                                v{activity.version}
                                                            </span>
                                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${activity.difficulty === 'EASY' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                                activity.difficulty === 'HARD' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                                    'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                                }`}>
                                                                {activity.difficulty}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Type Badge */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${typeStyle.bg} ${typeStyle.text}`}>
                                                    <span>{typeStyle.icon}</span>
                                                    {activity.activity_type?.replace('Activity', '') || 'Activity'}
                                                </span>
                                            </td>

                                            {/* Mini Preview - Hidden on mobile */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                                                    {getMiniPreview()}
                                                </span>
                                            </td>

                                            {/* Lesson */}
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                                                    {activity.lesson?.title || 'No lesson'}
                                                </div>
                                                <div className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                                                        {activity.lesson?.level}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{activity.lesson?.subject}</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ring-1 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.ring}`}>
                                                    {activity.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setPreviewActivity(activity)}
                                                        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                        title="Preview"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setQuickEditActivity(activity)}
                                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                                                        title="Quick Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && activities.length > 0 && data && (
                <PaginationControls
                    page={data.page || currentPage}
                    pageSize={data.page_size || currentPageSize}
                    totalPages={data.total_pages || 1}
                    total={data.total || 0}
                    hasNext={data.has_next || false}
                    hasPrev={data.has_prev || false}
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

            {/* Activity Form Modal */}
            <ActivityForm
                isOpen={showForm}
                onClose={() => { setShowForm(false); setEditActivity(undefined); }}
                onSuccess={() => refetch()}
                editActivity={editActivity}
            />

            {/* Quick Edit Modal */}
            <ActivityEditModal
                activity={quickEditActivity}
                isOpen={!!quickEditActivity}
                onClose={() => setQuickEditActivity(null)}
                onSuccess={() => refetch()}
            />
        </div>
    );
}