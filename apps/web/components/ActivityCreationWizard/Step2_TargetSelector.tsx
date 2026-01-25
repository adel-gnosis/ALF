import { ActivityWizardState, useSubjects, useLessons } from '@alf/shared';
import SubjectIcon from '../SubjectIcon';
import { useI18n } from '../../context/I18nContext';

interface Step2Props {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
}

export default function Step2_TargetSelector({ state, updateState }: Step2Props) {
    const { t } = useI18n();
    const { data: subjects, isLoading: loadingSubjects } = useSubjects(state.courseId || 0);
    const { data: lessonsData, isLoading: loadingLessons } = useLessons(state.levelId || 0, state.subjectId || 0);

    return (
        <div className="flex-1 flex flex-col min-h-0 space-y-6">
            <div className="shrink-0 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-lg px-4 py-2 flex items-center justify-between">
                <span className="text-xl">🎯</span>
                <div>
                    <h3 className="text-xs font-bold text-purple-900 dark:text-purple-400 uppercase tracking-wider">{t('wizard.target_selection_title')}</h3>
                    <p className="text-[10px] text-purple-700/70 dark:text-purple-300/60 font-medium">{t('wizard.target_selection_desc')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-0">
                {/* Subject Selector */}
                <div className="flex flex-col min-h-0">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-400 uppercase tracking-tight mb-2">
                        {t('wizard.subject')} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex-1 bg-gray-50/50 dark:bg-slate-900/40 border dark:border-slate-800 rounded-lg overflow-hidden flex flex-col">
                        {loadingSubjects ? (
                            <div className="p-3 space-y-2">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-md" />)}
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
                                {subjects?.map((subject) => {
                                    const isSelected = state.subjectId === subject.id;
                                    return (
                                        <button
                                            key={subject.id}
                                            type="button"
                                            onClick={() => updateState({
                                                subjectId: subject.id,
                                                lessonId: null,
                                                activityType: null,
                                            })}
                                            className={`
                                                group flex items-center gap-3 p-2 rounded-md border text-left transition-all
                                                ${isSelected
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-600/20 shadow-sm"
                                                    : "border-transparent bg-white/50 hover:bg-white dark:bg-slate-800/20 hover:border-gray-200 dark:hover:border-slate-700"
                                                }
                                            `}
                                        >
                                            <div className="p-1.5 rounded-sm bg-gray-50 dark:bg-slate-700 group-hover:scale-110 transition-transform">
                                                <SubjectIcon name={subject.icon} className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                    {subject.title}
                                                </div>
                                                <div className="text-[9px] text-gray-400 font-mono uppercase">
                                                    {subject.code}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {state.validationErrors.subjectId && (
                        <p className="text-red-500 text-[10px] font-medium mt-1">{state.validationErrors.subjectId}</p>
                    )}
                </div>

                {/* Lesson Selector */}
                <div className="flex flex-col min-h-0">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-400 uppercase tracking-tight mb-2">
                        {t('wizard.lesson')} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex-1 bg-gray-50/50 dark:bg-slate-900/40 border dark:border-slate-800 rounded-lg overflow-hidden flex flex-col">
                        {loadingLessons ? (
                            <div className="p-3 space-y-2">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-md" />)}
                            </div>
                        ) : state.subjectId ? (
                            lessonsData?.lessons && lessonsData.lessons.length > 0 ? (
                                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
                                    {lessonsData.lessons.map((lesson) => {
                                        const isSelected = state.lessonId === lesson.id;
                                        return (
                                            <button
                                                key={lesson.id}
                                                type="button"
                                                onClick={() => updateState({ lessonId: lesson.id })}
                                                className={`
                                                    group flex items-center gap-3 p-2 rounded-md border text-left transition-all
                                                    ${isSelected
                                                        ? "border-purple-500 bg-purple-50 dark:bg-purple-600/20 shadow-sm"
                                                        : "border-transparent bg-white/50 hover:bg-white dark:bg-slate-800/20 hover:border-gray-200 dark:hover:border-slate-700"
                                                    }
                                                `}
                                            >
                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
                                                    {lesson.id % 99}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                        {lesson.title}
                                                    </div>
                                                    <div className="text-[9px] text-gray-400 uppercase tracking-wide">
                                                        {t('wizard.lesson_unit_label')}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                        <span className="text-xl">📭</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">{t('wizard.no_lessons_found')}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{t('wizard.try_another_subject')}</p>
                                </div>
                            )
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-60">
                                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-3 border border-dashed border-gray-200 dark:border-slate-800">
                                    <span className="text-base grayscale">👈</span>
                                </div>
                                <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">{t('wizard.select_subject_prompt')}</p>
                                <p className="text-[10px] text-gray-400/80 mt-1 italic">{t('wizard.waiting_selection')}</p>
                            </div>
                        )}
                    </div>
                    {state.validationErrors.lessonId && (
                        <p className="text-red-500 text-[10px] font-medium mt-1">{state.validationErrors.lessonId}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
