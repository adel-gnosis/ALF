import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityWizardState, useSubjects, ActivityType, I18nKey } from '@alf/shared';
import { useCreateActivity } from '@alf/shared';
import { useI18nKeys } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';

interface FillBlankActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function FillBlankActivityForm({ state, updateState, onSuccess }: FillBlankActivityFormProps) {
    const { t, isRTL, locale } = useI18n();
    const createActivity = useCreateActivity();

    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    // Removal of old instruction key logic

    const [correctAnswer, setCorrectAnswer] = useState('');
    const [usePhraseKey, setUsePhraseKey] = useState(true);
    const [phraseKey, setPhraseKey] = useState('');
    const [phraseText, setPhraseText] = useState('');

    const validateForm = (): boolean => {
        if (!correctAnswer.trim()) {
            alert(t('wizard.validation.correct_answer_required'));
            return false;
        }

        if (usePhraseKey && !phraseKey.trim()) {
            alert(t('wizard.validation.phrase_key_required'));
            return false;
        }

        if (!usePhraseKey && !phraseText.trim()) {
            alert(t('wizard.validation.phrase_text_required'));
            return false;
        }

        if (!usePhraseKey && phraseText && !phraseText.includes('___') && !phraseText.includes('_')) {
            const confirm = window.confirm(t('wizard.validation.no_blank_confirm'));
            if (!confirm) return false;
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
            translation_data: usePhraseKey && phraseKey.trim()
                ? { phrase_key: phraseKey.trim() }
                : {},
            difficulty: state.difficulty,
            points: state.points,
            order: state.order,
            type_specific_data: {
                correct_answer: correctAnswer.trim(),
                phrase_key: usePhraseKey ? phraseKey.trim() : null,
                phrase: !usePhraseKey ? phraseText.trim() : null
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
        <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-400 p-4 rounded text-left">
                <div className="flex items-start">
                    <div className="text-3xl mr-3">✏️</div>
                    <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-400">{t('wizard.fill_blank_title')}</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            {t('wizard.fill_blank_desc')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Instruction Key Selection */}
            <div className="text-left animate-in fade-in duration-500">
                <InstructionKeyPicker
                    activityType="FillBlankActivity"
                    subjectCode={subjectCode}
                    courseId={state.courseId}
                    selectedKey={state.instructionKey || 'activity.fill_blank.instruction.generic'}
                    onSelect={(key: string) => updateState({ instructionKey: key })}
                />
            </div>

            {/* Correct Answer */}
            <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    ✅ {t('wizard.correct_answer')} <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder={t('wizard.correct_answer_placeholder')}
                    className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-2 text-base"
                    dir={isRTL ? 'rtl' : 'ltr'}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {t('wizard.correct_answer_desc')}
                </p>
            </div>

            {/* Phrase Mode Toggle */}
            <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                    📄 {t('wizard.phrase_mode')}
                </label>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setUsePhraseKey(true)}
                        className={`
                            flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all
                            ${usePhraseKey
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20 text-blue-900 dark:text-blue-400'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                            }
                        `}
                    >
                        {usePhraseKey && '✓ '}
                        {t('wizard.use_phrase_key')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setUsePhraseKey(false)}
                        className={`
                            flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all
                            ${!usePhraseKey
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20 text-blue-900 dark:text-blue-400'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                            }
                        `}
                    >
                        {!usePhraseKey && '✓ '}
                        {t('wizard.enter_text_directly')}
                    </button>
                </div>
            </div>

            {/* Phrase Input (conditional) */}
            {usePhraseKey ? (
                <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        🔑 {t('wizard.phrase_key_label')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={phraseKey}
                        onChange={(e) => setPhraseKey(e.target.value)}
                        placeholder="phrases.school_go"
                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-2 text-base font-mono"
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        {t('wizard.phrase_key_example')}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                        ⚠️ {t('wizard.phrase_key_warning')}
                    </p>
                </div>
            ) : (
                <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        📝 {t('wizard.phrase_with_blank')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={phraseText}
                        onChange={(e) => setPhraseText(e.target.value)}
                        placeholder={t('wizard.phrase_placeholder')}
                        rows={3}
                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-2 text-base"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        {t('wizard.phrase_hint')}
                    </p>
                </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-slate-800">
                <div className="text-sm text-gray-500 dark:text-slate-400">
                    💾 {t('wizard.draft_hint')}
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createActivity.isPending}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {createActivity.isPending ? t('wizard.creating') : t('wizard.create_btn')}
                </button>
            </div>
            {/* hidden button for wizard integration if needed */}
            <button id="wizard-submit-btn" type="button" onClick={handleSubmit} className="hidden" />
        </div>
    );
}
