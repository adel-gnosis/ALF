import { ActivityWizardState, ACTIVITY_TYPE_INFO, ActivityType, Difficulty } from '@alf/shared';
import { useSubjects, useAvailableActivityTypes } from '@alf/shared';
import { useI18n } from '../../context/I18nContext';

interface Step3Props {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
}

export default function Step3_Settings({ state, updateState }: Step3Props) {
    const { t, isRTL } = useI18n();
    const { data: subjects } = useSubjects(state.courseId);

    // Get selected subject to filter activity types
    const selectedSubject = subjects?.find(s => s.id === state.subjectId);
    const availableActivityTypes = useAvailableActivityTypes(selectedSubject?.code || null);

    // Filter activity types based on subject
    const filteredActivityTypes = state.subjectId
        ? availableActivityTypes
        : Object.keys(ACTIVITY_TYPE_INFO) as ActivityType[];

    const difficulties = [
        { value: Difficulty.EASY, label: t('wizard.easy'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        { value: Difficulty.MEDIUM, label: t('wizard.medium'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        { value: Difficulty.HARD, label: t('wizard.hard'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    ];

    return (
        <div className="flex-1 overflow-y-auto p-1 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 p-3 rounded-lg flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <div>
                    <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">{t('wizard.config_title')}</h3>
                    <p className="text-[10px] text-emerald-700/70 dark:text-emerald-300/60 font-medium">{t('wizard.config_desc')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Type Selector (Left 2/3) */}
                <div className="lg:col-span-2 space-y-3">
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-400 uppercase tracking-tight">
                        {t('wizard.activity_type')} <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {filteredActivityTypes.map((type) => {
                            const info = ACTIVITY_TYPE_INFO[type];
                            const isSelected = state.activityType === type;
                            const isAdvanced = info.complexity === 'advanced';

                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => updateState({ activityType: type })}
                                    className={`
                                        relative p-2.5 border rounded-md text-left transition-all group
                                        ${isSelected
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-600/10 shadow-sm'
                                            : 'border-gray-100 bg-white hover:border-gray-200 dark:bg-slate-800/30 dark:border-slate-700 dark:hover:border-slate-600'
                                        }
                                        ${isAdvanced ? 'opacity-50' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base group-hover:scale-110 transition-transform">{info.icon}</span>
                                        <span className="font-bold text-[11px] text-gray-900 dark:text-white truncate">
                                            {t(`wizard.activity_type_${type}`)}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 dark:text-slate-400 leading-tight line-clamp-2">
                                        {t(`wizard.activity_desc_${type}`)}
                                    </p>
                                    {isAdvanced && (
                                        <div className="absolute top-1 right-1 bg-yellow-100 dark:bg-yellow-900/50 text-[8px] px-1 py-0.5 rounded text-yellow-700 dark:text-yellow-500 font-bold uppercase">
                                            P2
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Secondary Settings (Right 1/3) */}
                <div className="space-y-5">
                    {/* Difficulty */}
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-400 uppercase tracking-tight">
                            {t('wizard.difficulty')}
                        </label>
                        <div className="flex flex-col gap-1.5">
                            {difficulties.map((diff) => (
                                <button
                                    key={diff.value}
                                    type="button"
                                    onClick={() => updateState({ difficulty: diff.value })}
                                    className={`
                                        flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-bold transition-all
                                        ${state.difficulty === diff.value
                                            ? `${diff.color} ring-1 ring-inset ring-current/20`
                                            : 'bg-white dark:bg-slate-800/20 border border-gray-100 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                        }
                                    `}
                                >
                                    {diff.label}
                                    {state.difficulty === diff.value && <span>✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Numeric Settings */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-400 uppercase tracking-tight">
                                {t('wizard.points')}
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={state.points}
                                onChange={(e) => updateState({ points: parseInt(e.target.value) || 1 })}
                                className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800/30 dark:text-white rounded-md px-2 py-1 text-xs outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-400 uppercase tracking-tight">
                                {t('wizard.order')}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={state.order}
                                onChange={(e) => updateState({ order: parseInt(e.target.value) || 0 })}
                                className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800/30 dark:text-white rounded-md px-2 py-1 text-xs outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
