'use client';

import { usePendingReviews, useApproveActivity, useRejectActivity, useVersionDiff } from '@alf/shared';
import React, { useState } from 'react';
import { Check, X, RefreshCw, GitCompare, ArrowRight, Plus, Minus, Edit3, Star, Volume2, Image as ImageIcon } from 'lucide-react';

interface DiffItem {
    field: string;
    field_label: string;
    old: any;
    new: any;
    change_type: 'added' | 'removed' | 'modified';
    is_semantic?: boolean;
}

interface DiffResult {
    content: DiffItem[];
    meta: DiffItem[];
    has_content_changes: boolean;
    has_meta_changes: boolean;
}

export default function AdminReviewPage() {
    const { data, isLoading, refetch } = usePendingReviews();
    const approve = useApproveActivity();
    const reject = useRejectActivity();

    // Diff modal state
    const [diffActivityId, setDiffActivityId] = useState<number | null>(null);
    const { data: diffData, isLoading: diffLoading } = useVersionDiff(diffActivityId);

    // Simple reject flow
    const handleReject = async (id: number) => {
        const reason = prompt('Enter rejection reason:');
        if (reason) {
            await reject.mutateAsync({ id, reason });
            refetch();
        }
    };

    const handleApprove = async (id: number) => {
        if (confirm('Approve this activity?')) {
            await approve.mutateAsync(id);
            refetch();
        }
    };

    // Render content value smartly (handles text, image, audio)
    const renderContentValue = (value: any): React.ReactNode => {
        if (value === null || value === undefined) {
            return <span className="text-gray-400 italic">—</span>;
        }

        // Handle content object with type/value
        if (typeof value === 'object' && value.type && value.value) {
            const contentType = value.type;
            const contentValue = value.rendered_value || value.value;

            if (contentType === 'image') {
                return (
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-purple-500" />
                        <img
                            src={contentValue}
                            alt="Choice"
                            className="w-16 h-16 object-cover rounded border border-gray-200 dark:border-slate-600"
                        />
                    </div>
                );
            }
            if (contentType === 'audio') {
                return (
                    <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-orange-500" />
                        <audio controls className="h-8 max-w-[200px]">
                            <source src={contentValue} />
                        </audio>
                    </div>
                );
            }
            // Default: text
            return <span className="text-sm">{contentValue}</span>;
        }

        // Handle arrays (Like choices_v2 or pairs_v2)
        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="text-gray-400 italic">Empty list</span>;

            // Check if it's choices_v2
            if (value[0]?.content && value[0]?.id) {
                return (
                    <div className="space-y-1">
                        {value.map((choice: any, i: number) => (
                            <div key={choice.id || i} className="flex items-center gap-2 text-xs border-b border-gray-100 dark:border-slate-600 pb-1 last:border-0">
                                <span className="bg-gray-100 dark:bg-slate-800 px-1 rounded text-[10px]">{i + 1}</span>
                                {renderContentValue(choice.content)}
                            </div>
                        ))}
                    </div>
                );
            }

            // Check if it's pairs_v2
            if (value[0]?.left && value[0]?.right) {
                return (
                    <div className="space-y-1">
                        {value.map((pair: any, i: number) => (
                            <div key={pair.id || i} className="flex items-center gap-2 text-xs border-b border-gray-100 dark:border-slate-600 pb-1 last:border-0">
                                {renderContentValue(pair.left)}
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                {renderContentValue(pair.right)}
                            </div>
                        ))}
                    </div>
                );
            }

            return (
                <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                        {value.length} items (click to expand)
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-slate-600 rounded text-xs overflow-auto max-h-48">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                </details>
            );
        }

        // Handle simple objects (like choice.content)
        if (typeof value === 'object') {
            if (value.type && (value.value || value.rendered_value)) {
                const contentType = value.type;
                const contentValue = value.rendered_value || value.value;

                if (contentType === 'image') {
                    return (
                        <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-purple-500" />
                            <img src={contentValue} alt="" className="w-8 h-8 object-cover rounded" />
                        </div>
                    );
                }
                if (contentType === 'audio') {
                    return <div className="flex items-center gap-1 text-orange-600"><Volume2 className="w-3 h-3" /> Audio</div>;
                }
                return <span className="text-xs">{contentValue}</span>;
            }

            return (
                <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-auto">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }

        return <span className="text-sm">{String(value)}</span>;
    };

    // Get change type icon and color
    const getChangeStyle = (changeType: string, isSemantic?: boolean) => {
        type StyleResult = {
            icon: typeof Plus;
            bgOld: string;
            bgNew: string;
            textOld: string;
            textNew: string;
            rowClass: string;
        };

        const base: Record<string, StyleResult> = {
            added: { icon: Plus, bgOld: '', bgNew: 'bg-green-50 dark:bg-green-900/30', textOld: '', textNew: 'text-green-700 dark:text-green-400', rowClass: '' },
            removed: { icon: Minus, bgOld: 'bg-red-50 dark:bg-red-900/30', bgNew: '', textOld: 'text-red-700 dark:text-red-400', textNew: '', rowClass: '' },
            modified: { icon: Edit3, bgOld: 'bg-red-50 dark:bg-red-900/30', bgNew: 'bg-green-50 dark:bg-green-900/30', textOld: 'text-red-700 dark:text-red-400', textNew: 'text-green-700 dark:text-green-400', rowClass: '' }
        };

        const style = base[changeType] || base.modified;

        // Semantic changes get special highlighting
        if (isSemantic) {
            return {
                ...style,
                icon: Star,
                bgOld: 'bg-amber-50 dark:bg-amber-900/30',
                bgNew: 'bg-emerald-50 dark:bg-emerald-900/30',
                rowClass: 'ring-2 ring-amber-300 dark:ring-amber-600'
            };
        }
        return { ...style, rowClass: '' };
    };

    // Render diff table
    const renderDiffTable = (items: DiffItem[], title: string, version?: { old?: number; new?: number }) => {
        if (!items || items.length === 0) return null;

        return (
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">{title}</h4>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-slate-600">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-1/4">Field</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                                    Previous {version?.old ? `(v${version.old})` : ''}
                                </th>
                                <th className="px-4 py-3 text-center w-8"></th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                                    New {version?.new ? `(v${version.new})` : ''}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                            {items.map((change, idx) => {
                                const style = getChangeStyle(change.change_type, change.is_semantic);
                                return (
                                    <tr key={idx} className={style.rowClass}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <style.icon className={`w-4 h-4 ${change.is_semantic ? 'text-amber-500' : 'text-gray-400'}`} />
                                                <span className={`text-sm font-medium ${change.is_semantic ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                                                    {change.field_label}
                                                    {change.is_semantic && <span className="ml-1 text-xs text-amber-600">(Important)</span>}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`px-4 py-3 ${style.bgOld}`}>
                                            <div className={style.textOld || 'text-gray-600 dark:text-slate-400'}>
                                                {renderContentValue(change.old)}
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                                        </td>
                                        <td className={`px-4 py-3 ${style.bgNew}`}>
                                            <div className={style.textNew || 'text-gray-600 dark:text-slate-400'}>
                                                {renderContentValue(change.new)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (isLoading) return (
        <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    // Parse diff data - handle both old (array) and new (object with content/meta) formats
    const getDiffContent = (diffResult: any): DiffItem[] => {
        if (!diffResult) return [];
        if (Array.isArray(diffResult)) return diffResult; // Old format
        return diffResult.content || []; // New format
    };

    const getDiffMeta = (diffResult: any): DiffItem[] => {
        if (!diffResult) return [];
        if (Array.isArray(diffResult)) return []; // Old format has no meta
        return diffResult.meta || [];
    };

    const hasContentChanges = (diffResult: any): boolean => {
        if (!diffResult) return false;
        if (Array.isArray(diffResult)) return diffResult.length > 0;
        return diffResult.has_content_changes || false;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Queue</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        {data?.total_pending || 0} pending activities to review
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Queue List */}
            <div className="bg-white dark:bg-slate-800 shadow rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                {data?.activities?.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <div className="text-4xl mb-3">✅</div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No pending reviews!</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">All activities have been reviewed.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                        {data?.activities?.map((activity) => (
                            <li key={activity.id} className="px-6 py-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Badges */}
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                                                {activity.activity_type?.replace('Activity', '') || 'Activity'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${activity.is_edit
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                                                }`}>
                                                {activity.is_edit ? '📝 Edit / Suggestion' : '✨ New Content'}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-slate-400">
                                                v{activity.version}
                                            </span>
                                        </div>

                                        {/* Question Text */}
                                        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                                            {activity.question_text || 'No question text'}
                                        </h3>

                                        {/* Metadata */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-500 dark:text-slate-400">
                                            <div>
                                                <span className="font-semibold text-gray-700 dark:text-slate-300">Author:</span>{' '}
                                                {activity.created_by?.username || 'Unknown'}
                                            </div>
                                            {activity.modified_by && activity.modified_by.id !== activity.created_by?.id && (
                                                <div>
                                                    <span className="font-semibold text-gray-700 dark:text-slate-300">Suggested by:</span>{' '}
                                                    <span className="text-blue-600 dark:text-blue-400 font-medium">{activity.modified_by.username}</span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="font-semibold text-gray-700 dark:text-slate-300">Lesson:</span>{' '}
                                                {activity.lesson?.title} ({activity.lesson?.level})
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-700 dark:text-slate-300">Points:</span>{' '}
                                                {activity.points}
                                            </div>
                                        </div>

                                        {/* Version Notes */}
                                        {activity.version_notes && (
                                            <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                                <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                                                    Revision Notes:
                                                </span>
                                                <p className="text-sm text-gray-700 dark:text-slate-300 italic">
                                                    "{activity.version_notes}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        {/* View Changes button - only for edits */}
                                        {activity.is_edit && (
                                            <button
                                                onClick={() => setDiffActivityId(activity.id)}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors"
                                            >
                                                <GitCompare className="w-4 h-4" />
                                                View Changes
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleApprove(activity.id)}
                                            disabled={approve.isPending}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm disabled:opacity-50 transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(activity.id)}
                                            disabled={reject.isPending}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Version Diff Modal */}
            {diffActivityId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                    <GitCompare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Version Comparison</h3>
                                    {diffData && (
                                        <p className="text-sm text-gray-500 dark:text-slate-400">
                                            {diffData.current?.activity_type?.replace('Activity', '') || 'Activity'} •{' '}
                                            v{diffData.previous?.version || 0} → v{diffData.current?.version}
                                            {diffData.modified_by && ` • Modified by ${diffData.modified_by.username}`}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setDiffActivityId(null)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {diffLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            ) : diffData && hasContentChanges(diffData.diff) ? (
                                <div className="space-y-6">
                                    {/* Version Notes */}
                                    {diffData.version_notes && (
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <span className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1">
                                                Modification Notes:
                                            </span>
                                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                                "{diffData.version_notes}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Content Changes (Important) */}
                                    {renderDiffTable(
                                        getDiffContent(diffData.diff),
                                        '📝 Content Changes',
                                        { old: diffData.previous?.version, new: diffData.current?.version }
                                    )}

                                    {/* Meta Changes (Less important) */}
                                    {getDiffMeta(diffData.diff).length > 0 && (
                                        <details className="group">
                                            <summary className="cursor-pointer text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300">
                                                Show meta changes ({getDiffMeta(diffData.diff).length} changes)
                                            </summary>
                                            <div className="mt-3">
                                                {renderDiffTable(
                                                    getDiffMeta(diffData.diff),
                                                    '⚙️ Meta Changes',
                                                    { old: diffData.previous?.version, new: diffData.current?.version }
                                                )}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-3">🔍</div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Content Changes Detected</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">
                                        {diffData?.previous
                                            ? 'Only metadata changed (version, status, etc.)'
                                            : 'This appears to be a new activity without a previous version.'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => setDiffActivityId(null)}
                                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    handleApprove(diffActivityId);
                                    setDiffActivityId(null);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Approve Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
