import { useEffect } from 'react';
import { ActivityWizardState } from '@alf/shared';
import { useCourses, useLevels } from '@alf/shared';
import { useI18n } from '../../context/I18nContext';

interface Step1Props {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
}

export default function Step1_ContextSelector({ state, updateState }: Step1Props) {
    const { t } = useI18n();
    const { data: courses, isLoading: loadingCourses } = useCourses();
    const { data: levels, isLoading: loadingLevels } = useLevels(state.courseId);

    // Auto-select first course on mount (French by default)
    useEffect(() => {
        if (courses && courses.length > 0 && !state.courseId) {
            updateState({ courseId: courses[0].id });
        }
    }, [courses]);

    return (
        <div className="flex-1 overflow-y-auto p-1 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 p-3 rounded-lg flex items-center gap-3">
                <span className="text-xl">🌍</span>
                <div>
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-400 uppercase tracking-wider">{t('wizard.step1_title')}</h3>
                    <p className="text-[10px] text-blue-700/70 dark:text-blue-300/60 font-medium">Configure the foundation for your new activity.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Course Selector */}
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-400 uppercase tracking-tight">
                        {t('wizard.course')} <span className="text-red-500">*</span>
                    </label>
                    {loadingCourses ? (
                        <div className="h-9 w-full bg-gray-100 dark:bg-slate-800 animate-pulse rounded-md" />
                    ) : (
                        <select
                            value={state.courseId || ''}
                            onChange={(e) => {
                                const courseId = parseInt(e.target.value);
                                updateState({
                                    courseId,
                                    levelId: null,
                                    subjectId: null,
                                    lessonId: null
                                });
                            }}
                            className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        >
                            <option value="">{t('wizard.loading')}</option>
                            {courses?.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.flag_icon} {course.title}
                                </option>
                            ))}
                        </select>
                    )}
                    {state.validationErrors.courseId && (
                        <p className="text-red-500 text-[10px] mt-1 font-medium">{state.validationErrors.courseId}</p>
                    )}
                </div>

                {/* Level Selector */}
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-400 uppercase tracking-tight">
                        {t('wizard.level')} <span className="text-red-500">*</span>
                    </label>
                    {loadingLevels ? (
                        <div className="h-9 w-full bg-gray-100 dark:bg-slate-800 animate-pulse rounded-md" />
                    ) : (
                        <select
                            value={state.levelId || ''}
                            onChange={(e) => {
                                const levelId = parseInt(e.target.value);
                                updateState({
                                    levelId,
                                    lessonId: null,
                                    activityType: null,
                                });
                            }}
                            disabled={!state.courseId}
                            className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                        >
                            <option value="">{t('wizard.loading_levels')}</option>
                            {levels?.map(level => (
                                <option key={level.id} value={level.id}>
                                    {level.code} - {level.title}
                                </option>
                            ))}
                        </select>
                    )}
                    {state.validationErrors.levelId && (
                        <p className="text-red-500 text-[10px] mt-1 font-medium">{state.validationErrors.levelId}</p>
                    )}
                </div>
            </div>

            {!state.courseId && (
                <div className="text-center py-6 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Please select a course to continue...</p>
                </div>
            )}
        </div>
    );
}
