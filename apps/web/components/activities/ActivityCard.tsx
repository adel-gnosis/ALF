'use client';

import React from 'react';
import { TeacherActivity, ACTIVITY_TYPE_INFO, ActivityType } from '@alf/shared';
import { Eye, Edit2, CheckCircle, Clock, FileEdit, AlertCircle, Archive, Volume2, Send, Loader2 } from 'lucide-react';

interface ActivityCardProps {
    activity: TeacherActivity;
    onPreview: (activity: TeacherActivity) => void;
    onEdit?: (activity: TeacherActivity) => void;
    onSubmit?: () => void;
    isSubmitting?: boolean;
}

// Activity type visual styles with dark mode support
const ACTIVITY_STYLES: Record<string, { color: string; bgColor: string; borderColor: string; icon: string; darkBg: string; darkBorder: string }> = {
    MCQActivity: { color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: '📝', darkBg: 'dark:bg-blue-500/10', darkBorder: 'dark:border-blue-500/20' },
    FillBlankActivity: { color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: '✏️', darkBg: 'dark:bg-green-500/10', darkBorder: 'dark:border-green-500/20' },
    MatchingActivity: { color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', icon: '🔗', darkBg: 'dark:bg-purple-500/10', darkBorder: 'dark:border-purple-500/20' },
    DicteeActivity: { color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', icon: '🎵', darkBg: 'dark:bg-orange-500/10', darkBorder: 'dark:border-orange-500/20' },
    DragOrderActivity: { color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', icon: '🔢', darkBg: 'dark:bg-teal-500/10', darkBorder: 'dark:border-teal-500/20' },
    ConjugationActivity: { color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', icon: '🔄', darkBg: 'dark:bg-pink-500/10', darkBorder: 'dark:border-pink-500/20' },
    MultipleAnswerActivity: { color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', icon: '📋', darkBg: 'dark:bg-indigo-500/10', darkBorder: 'dark:border-indigo-500/20' },
    TextInputActivity: { color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', icon: '⌨️', darkBg: 'dark:bg-gray-500/10', darkBorder: 'dark:border-gray-500/20' },
};

const STATUS_STYLES: Record<string, { color: string; bgColor: string; icon: React.ComponentType<any> }> = {
    APPROVED: { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/40', icon: CheckCircle },
    PENDING: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/40', icon: Clock },
    DRAFT: { color: 'text-gray-600 dark:text-slate-400', bgColor: 'bg-gray-100 dark:bg-slate-700', icon: FileEdit },
    REJECTED: { color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/40', icon: AlertCircle },
    ARCHIVED: { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40', icon: Archive },
};

const DIFFICULTY_COLORS: Record<string, string> = {
    EASY: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    HARD: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

/**
 * Helper to extract activity content from the new standardized format
 */
function getActivityData(activity: TeacherActivity): any {
    const typeData = activity.type_specific_data || {};

    // Strictly extract from the new standardized structure
    return {
        ...typeData,
        choices_v2: typeData.choices_v2 || [],
        pairs_v2: typeData.pairs_v2 || [],
        audio_urls: typeData.audio_urls || [],
        words: typeData.words || [],
        correct_choice_id: typeData.correct_choice_id || '',
        correct_choice_ids: typeData.correct_choice_ids || [],
    };
}

export default function ActivityCard({ activity, onPreview, onEdit, onSubmit, isSubmitting }: ActivityCardProps) {
    const activityType = activity.activity_type as ActivityType;
    const style = ACTIVITY_STYLES[activityType] || ACTIVITY_STYLES.MCQActivity;
    const statusStyle = STATUS_STYLES[activity.status] || STATUS_STYLES.DRAFT;
    const StatusIcon = statusStyle.icon;
    const data = getActivityData(activity);

    // Render activity-type specific mini preview
    const renderMiniPreview = () => {
        switch (activityType) {
            case 'MCQActivity':
            case 'MultipleAnswerActivity': {
                const choices = data.choices_v2 || [];
                const isMultiple = activityType === 'MultipleAnswerActivity';
                return (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {choices.slice(0, 4).map((choice: any, i: number) => (
                            <div
                                key={choice.id || i}
                                className="px-2 py-1 bg-white/60 dark:bg-slate-800/60 rounded border border-gray-100 dark:border-slate-700 text-[10px] text-gray-600 dark:text-slate-400"
                            >
                                {choice.content?.type === 'image'
                                    ? '🖼️ Image'
                                    : choice.content?.type === 'audio'
                                        ? '🎵 Audio'
                                        : (choice.rendered_value || choice.content?.value || `Opt ${i + 1}`)}
                            </div>
                        ))}
                        {choices.length > 4 && (
                            <div className="text-[10px] text-gray-400 self-center">+{choices.length - 4} more</div>
                        )}
                    </div>
                );
            }

            case 'FillBlankActivity': {
                const phrase = data.phrase || activity.question_text || '';
                if (!phrase.includes('___')) return null;
                return (
                    <div className="mt-2 text-[11px] text-gray-500 italic line-clamp-1">
                        {phrase.replace('___', '______')}
                    </div>
                );
            }

            case 'MatchingActivity': {
                const pairs = data.pairs_v2 || [];
                return (
                    <div className="mt-2 flex gap-1 items-center">
                        {pairs.slice(0, 2).map((pair: any, i: number) => (
                            <div key={i} className="px-1.5 py-0.5 bg-white/40 dark:bg-black/20 rounded text-[9px] text-gray-400">
                                {i === 0 ? 'Match p1' : 'Match p2'}
                            </div>
                        ))}
                        {pairs.length > 2 && <span className="text-[9px] text-gray-400">+{pairs.length - 2}</span>}
                    </div>
                );
            }

            case 'DicteeActivity': {
                const audioUrls = data.audio_urls || [];
                const dicteeText = data.text || data.correct_answer || '';
                return (
                    <div className="mt-3 px-3 py-2 bg-white/60 rounded-lg border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Volume2 className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">
                                {audioUrls.length} audio file{audioUrls.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-sm text-gray-700 truncate">
                                {dicteeText ? `"${dicteeText.substring(0, 30)}..."` : 'Listen and write...'}
                            </p>
                        </div>
                    </div>
                );
            }

            case 'DragOrderActivity': {
                const words = data.words || [];
                return (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {words.slice(0, 4).map((word: any, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-white/40 dark:bg-black/20 rounded text-[9px] text-gray-500">
                                {typeof word === 'string' ? word : (word.rendered_value || word.value)}
                            </span>
                        ))}
                    </div>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div
            className={`group relative rounded-2xl border-2 ${style.borderColor} ${style.darkBorder} ${style.bgColor} ${style.darkBg} p-4 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer`}
            onClick={() => onPreview(activity)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{style.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wide ${style.color}`}>
                        {ACTIVITY_TYPE_INFO[activityType]?.label || activityType?.replace('Activity', '') || 'Activity'}
                    </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onPreview(activity); }}
                        className="p-1.5 rounded-lg hover:bg-white/50 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Preview"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(activity); }}
                            className="p-1.5 rounded-lg hover:bg-white/50 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                    {onSubmit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSubmit(); }}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                            title="Submit for Review"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Instruction Text (if available) */}
            {activity.instruction_text && (
                <p className="text-xs text-gray-500 italic mb-1 line-clamp-1">
                    📋 {activity.instruction_text}
                </p>
            )}

            {/* Question Text */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 min-h-[2.5rem]">
                {activity.question_text || 'No question text'}
            </h3>

            {/* Type-specific preview */}
            {renderMiniPreview()}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400 bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded">
                        {activity.lesson?.level || 'A1'} • {activity.lesson?.subject || 'Grammar'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${DIFFICULTY_COLORS[activity.difficulty] || DIFFICULTY_COLORS.MEDIUM}`}>
                        {activity.difficulty}
                    </span>
                </div>

                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusStyle.bgColor}`}>
                    <StatusIcon className={`w-3 h-3 ${statusStyle.color}`} />
                    <span className={`text-[10px] font-bold ${statusStyle.color}`}>
                        {activity.status}
                    </span>
                </div>
            </div>

            {/* Version badge */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] text-gray-400 dark:text-slate-500 bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded">
                    v{activity.version}
                </span>
            </div>
        </div>
    );
}

// Export helper for use in preview modal
export { getActivityData };
