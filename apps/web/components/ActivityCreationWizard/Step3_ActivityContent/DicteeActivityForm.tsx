import { useMemo, useState } from 'react';
import { ActivityWizardState, useSubjects, ActivityType } from '@alf/shared';
import { useCreateActivity } from '@alf/shared';
import { useI18nKeys } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';

interface DicteeActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function DicteeActivityForm({ state, updateState, onSuccess }: DicteeActivityFormProps) {
    const { t, isRTL, locale } = useI18n();
    const createActivity = useCreateActivity();
    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    // Removal of old instruction key logic

    const [audioUrls, setAudioUrls] = useState<string[]>(['']);
    const [correctText, setCorrectText] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);

    const handleAddAudioUrl = () => {
        setAudioUrls([...audioUrls, '']);
    };

    const handleRemoveAudioUrl = (index: number) => {
        setAudioUrls(audioUrls.filter((_, i) => i !== index));
    };

    const handleAudioUrlChange = (index: number, value: string) => {
        const updated = [...audioUrls];
        updated[index] = value;
        setAudioUrls(updated);
    };

    const validateForm = (): boolean => {
        if (!correctText.trim()) {
            alert(t('wizard.validation.correct_text_required'));
            return false;
        }

        const filteredUrls = audioUrls.filter(url => url.trim());
        if (filteredUrls.length === 0) {
            alert(t('wizard.validation.audio_url_required'));
            return false;
        }

        return true;
    };

    const handleSubmit = async (submitForReview: boolean) => {
        if (!validateForm()) return;

        const instructionKey = state.instructionKey || 'activity.dictee.instruction.generic';


        const payload = {
            activity_type: 'DicteeActivity',
            lesson_id: state.lessonId!,
            instruction_key: instructionKey,
            translation_data: {},
            difficulty: state.difficulty,
            points: state.points,
            order: state.order,
            type_specific_data: {
                audio_urls: audioUrls.filter(url => url.trim()),
                correct_text: correctText.trim(),
                case_sensitive: caseSensitive
            }
        };

        try {
            await createActivity.mutateAsync(payload);
            alert(submitForReview
                ? t('wizard.success_message_review')
                : t('wizard.success_message_draft')
            );
            onSuccess();
        } catch (error: any) {
            alert(`${t('common.error')}: ${error.response?.data?.message || t('wizard.error_message')}`);
        }
    };

    return (
        <div className="space-y-6 text-left">
            <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-400 p-4 rounded">
                <div className="flex items-start">
                    <div className="text-3xl mr-3">🎵</div>
                    <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-400">{t('wizard.dictee_title')}</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            {t('wizard.dictee_desc')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Instruction Key Selection */}
            <div className="text-left animate-in fade-in duration-500">
                <InstructionKeyPicker
                    activityType="DicteeActivity"
                    subjectCode={subjectCode}
                    courseId={state.courseId}
                    selectedKey={state.instructionKey || 'activity.dictee.instruction.generic'}
                    onSelect={(key) => updateState({ instructionKey: key })}
                />

                {state.instructionKey && state.instructionKey.includes('custom') && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                        <p className="text-[10px] text-yellow-700 dark:text-yellow-500 font-medium">
                            ⚠️ {t('wizard.phrase_key_warning')}
                        </p>
                    </div>
                )}
            </div>

            {/* Audio URLs */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    🎧 {t('wizard.audio_files_label')} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                    {audioUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => handleAudioUrlChange(index, e.target.value)}
                                placeholder="/media/audio/phrase.mp3"
                                className="flex-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-2 text-base font-mono"
                            />
                            {audioUrls.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAudioUrl(index)}
                                    className="px-3 py-2 text-red-600 hover:text-red-800 font-medium"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddAudioUrl}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
                    >
                        + {t('wizard.add_audio_file')}
                    </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                    💡 {t('wizard.audio_files_hint')}
                </p>
            </div>

            {/* Correct Text */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    ✍️ {t('wizard.correct_text_label')} <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={correctText}
                    onChange={(e) => setCorrectText(e.target.value)}
                    placeholder={t('wizard.correct_text_placeholder')}
                    className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-2 text-base"
                    dir={isRTL ? 'rtl' : 'ltr'}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {t('wizard.correct_text_desc')}
                </p>
            </div>

            {/* Options */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    ⚙️ {t('wizard.settings_title')}
                </label>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="caseSensitive"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded"
                    />
                    <label htmlFor="caseSensitive" className="ml-2 text-sm text-gray-700 dark:text-slate-300">
                        {t('wizard.case_sensitive')}
                    </label>
                </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-slate-800">
                <div className="text-sm text-gray-500 dark:text-slate-400">
                    💾 {t('wizard.draft_hint')}
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={createActivity.isPending}
                        className="px-6 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                        {t('wizard.save_draft_btn')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        disabled={createActivity.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {createActivity.isPending ? t('wizard.creating') : t('wizard.create_btn')}
                    </button>
                </div>
            </div>
            {/* hidden button for wizard integration if needed */}
            <button id="wizard-submit-btn" type="button" onClick={() => handleSubmit(false)} className="hidden" />
        </div>
    );
}
