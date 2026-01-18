import { ActivityWizardState, ACTIVITY_TYPE_INFO, Difficulty } from '@alf/shared';
import { useCourses, useLevels, useSubjects, useLessons } from '@alf/shared';
import SubjectIcon from '../SubjectIcon';

interface Step2Props {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
}

import { useI18n } from '../../context/I18nContext';

interface Step2Props {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
}

export default function Step2_Summary({ state, updateState }: Step2Props) {
    const { t, isRTL } = useI18n();
    const { data: courses } = useCourses();
    const { data: levels } = useLevels(state.courseId);
    const { data: subjects } = useSubjects(state.courseId);
    const { data: lessonsData } = useLessons(state.levelId, state.subjectId);

    const selectedCourse = courses?.find(c => c.id === state.courseId);
    const selectedLevel = levels?.find(l => l.id === state.levelId);
    const selectedSubject = subjects?.find(s => s.id === state.subjectId);
    const selectedLesson = lessonsData?.lessons.find(l => l.id === state.lessonId);
    const activityTypeInfo = state.activityType ? ACTIVITY_TYPE_INFO[state.activityType] : null;

    const difficulties: { value: Difficulty; label: string; color: string }[] = [
        { value: Difficulty.EASY, label: t('wizard.easy'), color: 'bg-green-100 text-green-800' },
        { value: Difficulty.MEDIUM, label: t('wizard.medium'), color: 'bg-yellow-100 text-yellow-800' },
        { value: Difficulty.HARD, label: t('wizard.hard'), color: 'bg-red-100 text-red-800' }
    ];

    return (
        <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📋 {t('wizard.summary_title')}
                </h3>

                <div className="space-y-3 text-sm">
                    <div className="flex items-start">
                        <span className="font-medium text-gray-700 dark:text-slate-400 w-32">{t('wizard.course')}:</span>
                        <span className="text-gray-900 dark:text-white">
                            {selectedCourse?.flag_icon} {selectedCourse?.title}
                        </span>
                    </div>

                    <div className="flex items-start">
                        <span className="font-medium text-gray-700 dark:text-slate-400 w-32">{t('wizard.level')}:</span>
                        <span className="text-gray-900 dark:text-white">
                            {selectedLevel?.code} - {selectedLevel?.title}
                        </span>
                    </div>

                    <div className="flex items-start">
                        <span className="font-medium text-gray-700 dark:text-slate-400 w-32">{t('wizard.subject')}:</span>
                        <span className="text-gray-900 dark:text-white">
                            <span className="inline-flex items-center gap-2">
                                <SubjectIcon name={selectedSubject?.icon} className="h-5 w-5" />
                                <span>{selectedSubject?.title}</span>
                            </span>

                        </span>
                    </div>

                    <div className="flex items-start">
                        <span className="font-medium text-gray-700 dark:text-slate-400 w-32">{t('wizard.lesson')}:</span>
                        <span className="text-gray-900 dark:text-white">{selectedLesson?.title}</span>
                    </div>

                    <div className="flex items-start pt-2 border-t border-blue-200 dark:border-blue-800">
                        <span className="font-medium text-gray-700 dark:text-slate-400 w-32">{t('wizard.activity_type')}:</span>
                        <span className="text-gray-900 dark:text-white">
                            {activityTypeInfo?.icon} {activityTypeInfo?.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Settings */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    ⚙️ {t('wizard.settings_title')}
                </h3>

                <div className="space-y-4">
                    {/* Difficulty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            {t('wizard.difficulty')}
                        </label>
                        <div className="flex gap-3">
                            {difficulties.map((diff) => (
                                <button
                                    key={diff.value}
                                    type="button"
                                    onClick={() => updateState({ difficulty: diff.value })}
                                    className={`
                                        flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all
                                        ${state.difficulty === diff.value
                                            ? `${diff.color} border-current`
                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
                                        }
                                    `}
                                >
                                    {state.difficulty === diff.value && '✓ '}
                                    {diff.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Points */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                {t('wizard.points')}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={state.points}
                                    onChange={(e) => updateState({ points: parseInt(e.target.value) || 10 })}
                                    className="flex-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-2 text-base"
                                />
                                <div className="flex flex-col">
                                    <button
                                        type="button"
                                        onClick={() => updateState({ points: Math.min(100, state.points + 1) })}
                                        className="px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-xs"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateState({ points: Math.max(1, state.points - 1) })}
                                        className="px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-xs"
                                    >
                                        ▼
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                {t('wizard.points_range')}
                            </p>
                        </div>

                        {/* Order */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                {t('wizard.order')}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={state.order}
                                    onChange={(e) => updateState({ order: parseInt(e.target.value) || 0 })}
                                    className="flex-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-2 text-base"
                                />
                                <div className="flex flex-col">
                                    <button
                                        type="button"
                                        onClick={() => updateState({ order: state.order + 1 })}
                                        className="px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-xs"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateState({ order: Math.max(0, state.order - 1) })}
                                        className="px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-xs"
                                    >
                                        ▼
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                {t('wizard.order_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex">
                    <div className="shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-500">
                            💡 {t('wizard.draft_note')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
