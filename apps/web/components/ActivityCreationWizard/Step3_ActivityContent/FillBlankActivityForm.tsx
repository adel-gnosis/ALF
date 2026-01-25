import { useMemo, useState } from 'react';
import { ActivityWizardState, useSubjects } from '@alf/shared';
import { useCreateActivity } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';

interface FillBlankActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function FillBlankActivityForm({ state, updateState, onSuccess }: FillBlankActivityFormProps) {
    const { t, isRTL } = useI18n();
    const createActivity = useCreateActivity();

    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    const [rawText, setRawText] = useState('');

    const parsedData = useMemo(() => {
        const regex = /\*(.*?)\*/;
        const match = rawText.match(regex);
        if (match) {
            const correctAnswer = match[1];
            const phrase = rawText.replace(regex, '___');
            return { correctAnswer, phrase, isValid: true };
        }
        return { correctAnswer: '', phrase: rawText, isValid: false };
    }, [rawText]);

    const handleQuestionTextChange = (val: string) => {
        updateState({ questionTextKey: val });
    };

    const validateForm = (): boolean => {
        if (!rawText.trim()) {
            alert(t('wizard.validation.phrase_text_required'));
            return false;
        }

        if (!parsedData.isValid) {
            alert(t('wizard.validation.no_asterisk_found'));
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const instructionKey = state.instructionKey || 'activity.fill_blank.instruction.generic';

        const payload = {
            activity_type: 'FillBlankActivity',
            lesson_id: state.lessonId!,
            instruction_key: instructionKey,
            question_text_key: state.questionTextKey,
            difficulty: state.difficulty,
            points: state.points,
            order: state.order,
            type_specific_data: {
                correct_answer: parsedData.correctAnswer.trim(),
                phrase: parsedData.phrase.trim()
            }
        };

        try {
            await createActivity.mutateAsync(payload);
            alert(t('wizard.success_message'));
            onSuccess();
        } catch (error: any) {
            alert(`${t('common.error')}: ${error.response?.data?.message || t('wizard.error_message')}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 text-left">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">✏️</div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">{t('wizard.fill_blank_title')}</h3>
                        <p className="text-xs text-blue-700 dark:text-blue-400">{t('wizard.fill_blank_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instruction Selection */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        📋 {t('wizard.instruction_label')}
                    </label>
                    <InstructionKeyPicker
                        activityType="FillBlankActivity"
                        subjectCode={subjectCode}
                        courseId={state.courseId}
                        selectedKey={state.instructionKey || 'activity.fill_blank.instruction.generic'}
                        onSelect={(key) => updateState({ instructionKey: key })}
                    />
                </div>

                {/* Question Text Key Selection - Now a simple input */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        ❓ {t('wizard.question_text_optional')}
                    </label>
                    <input
                        type="text"
                        value={state.questionTextKey || ''}
                        onChange={(e) => handleQuestionTextChange(e.target.value)}
                        placeholder={t('wizard.question_text_placeholder')}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Main Content Input */}
            <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                    📝 {t('wizard.phrase_with_notation_label')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder={t('wizard.phrase_notation_placeholder')}
                        rows={3}
                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        dir="ltr"
                    />
                    <div className={`absolute bottom-2 ${isRTL ? 'left-2' : 'right-2'} flex gap-1`}>
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">{t('wizard.notation_legend')}</span>
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                    {t('wizard.phrase_notation_hint')}
                </p>
            </div>

            {/* Preview Section */}
            {rawText.trim() && (
                <div className="bg-gray-50 dark:bg-slate-800/50 border border-dashed border-gray-300 dark:border-slate-700 p-4 rounded-xl animate-in fade-in zoom-in-95 duration-300">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">{t('wizard.preview')}</h4>
                    <div className="flex flex-wrap items-center gap-2" dir="ltr">
                        {parsedData.phrase.split('___').map((part, i, arr) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-lg font-medium text-gray-900 dark:text-white">{part}</span>
                                {i < arr.length - 1 && (
                                    <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-blue-700 dark:text-blue-300 font-bold border-b-2 border-b-blue-500">
                                        {parsedData.correctAnswer || '...'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Submit Section */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-slate-800">
                <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <span className="text-lg">💾</span> {t('wizard.draft_hint')}
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createActivity.isPending}
                    className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                    {createActivity.isPending ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('wizard.creating')}
                        </>
                    ) : (
                        t('wizard.create_btn')
                    )}
                </button>
            </div>
            <button id="wizard-submit-btn" type="button" onClick={handleSubmit} className="hidden" />
        </div>
    );
}

