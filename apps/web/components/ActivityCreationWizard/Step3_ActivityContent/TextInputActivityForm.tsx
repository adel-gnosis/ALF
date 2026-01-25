import { ActivityWizardState, useSubjects, useCreateActivity } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';
import { useMemo, useState } from 'react';

interface TextInputActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function TextInputActivityForm({ state, updateState, onSuccess }: TextInputActivityFormProps) {
    const { t } = useI18n();
    const createActivity = useCreateActivity();
    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    // Local state for Short Answer fields
    const [correctAnswersRaw, setCorrectAnswersRaw] = useState((state.typeSpecificData as any)?.correct_answers?.join('; ') || '');
    const [acceptPartial, setAcceptPartial] = useState((state.typeSpecificData as any)?.accept_partial || false);
    const [caseSensitive, setCaseSensitive] = useState((state.typeSpecificData as any)?.case_sensitive || false);

    const handleSubmit = async () => {
        // Parse correct answers from semicolon-separated string
        const answersList = correctAnswersRaw
            .split(';')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

        if (answersList.length === 0) {
            alert(t('wizard.validation.correct_answer_required') || 'At least one correct answer is required');
            return;
        }

        const instructionKey = state.instructionKey || 'activity.text_input.instruction.generic';

        const payload = {
            activity_type: 'TextInputActivity',
            lesson_id: state.lessonId!,
            instruction_key: instructionKey,
            question_text_key: state.questionTextKey,
            difficulty: state.difficulty,
            points: state.points,
            order: state.order,
            type_specific_data: {
                correct_answers: answersList,
                accept_partial: acceptPartial,
                case_sensitive: caseSensitive
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
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">✍️</div>
                    <div>
                        <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">{t('wizard.text_input.title')}</h3>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">{t('wizard.text_input.desc')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        📋 {t('wizard.instruction_label')}
                    </label>
                    <InstructionKeyPicker
                        activityType="TextInputActivity"
                        subjectCode={subjectCode}
                        courseId={state.courseId}
                        selectedKey={state.instructionKey || 'activity.text_input.instruction.generic'}
                        onSelect={(key) => updateState({ instructionKey: key })}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        ❓ {t('wizard.question_text_label')} (i18n)
                    </label>
                    <input
                        type="text"
                        value={state.questionTextKey || ''}
                        onChange={(e) => updateState({ questionTextKey: e.target.value })}
                        placeholder={t('wizard.question_text_placeholder')}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {/* Correct Answers Input */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                        ✅ {t('wizard.correct_answer')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={correctAnswersRaw}
                        onChange={(e) => setCorrectAnswersRaw(e.target.value)}
                        placeholder="Ex: answer1; answer2; answer3..."
                        rows={3}
                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        dir="auto"
                    />
                    <p className="text-xs text-gray-500">
                        {t('wizard.text_input.answers_hint') || 'Separate multiple correct answers with a semicolon (;).'}
                    </p>
                </div>

                {/* Settings Checkboxes */}
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="acceptPartial"
                            checked={acceptPartial}
                            onChange={(e) => setAcceptPartial(e.target.checked)}
                            className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="acceptPartial" className="text-sm text-gray-700 dark:text-slate-300 select-none cursor-pointer">
                            {t('wizard.text_input.accept_partial') || 'Accept Partial Matches'}
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="caseSensitive"
                            checked={caseSensitive}
                            onChange={(e) => setCaseSensitive(e.target.checked)}
                            className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="caseSensitive" className="text-sm text-gray-700 dark:text-slate-300 select-none cursor-pointer">
                            {t('wizard.case_sensitive')}
                        </label>
                    </div>
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-slate-800">
                <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <span className="text-lg">💾</span> {t('wizard.draft_hint')}
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createActivity.isPending}
                    className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                    {createActivity.isPending ? t('wizard.creating') : t('wizard.create_btn')}
                </button>
            </div>
        </div>
    );
}
