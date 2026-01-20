import { useMemo, useState } from 'react';
import { ActivityWizardState, useSubjects, ActivityType, API_BASE_URL, useDicteeTTS } from '@alf/shared';
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
    const [createdDicteeId, setCreatedDicteeId] = useState<number | null>(null);

    // TTS states
    const [selectedVoices, setSelectedVoices] = useState<string[]>(['male']);
    const [selectedSpeeds, setSelectedSpeeds] = useState<string[]>(['1.0']);

    const { triggerTTS, isGenerating, error: ttsError, isTimeout, setIsTimeout, generatedUrls } = useDicteeTTS(
        createdDicteeId || 0,
        0 // Always 0 during creation wizard
    );

    // Sync generatedUrls to audioUrls state
    useEffect(() => {
        if (generatedUrls.length > 0) {
            setAudioUrls(prev => {
                const combined = Array.from(new Set([...prev.filter(u => u.trim()), ...generatedUrls]));
                return combined.length > 0 ? combined : [''];
            });
        }
    }, [generatedUrls]);

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

        // Audio URLs are now optional for Dictee

        return true;
    };

    const saveActivity = async (submitForReview: boolean) => {
        if (!validateForm()) return null;

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
            const response = await createActivity.mutateAsync(payload);
            setCreatedDicteeId(response.id);
            alert(submitForReview
                ? t('wizard.success_message_review')
                : t('wizard.success_message_draft')
            );
            return response;
        } catch (error: any) {
            console.error('Wizard Save Error:', error.response?.data);
            const errorData = error.response?.data;
            let errorMessage = t('wizard.error_message');

            if (errorData) {
                if (errorData.message) errorMessage = errorData.message;
                else if (errorData.detail) errorMessage = errorData.detail;
                else {
                    const fields = Object.keys(errorData);
                    if (fields.length > 0) {
                        errorMessage = fields.map(f => {
                            const fieldErrors = errorData[f];
                            if (Array.isArray(fieldErrors)) {
                                return `${f}: ${fieldErrors.join(', ')}`;
                            }
                            return `${f}: ${fieldErrors}`;
                        }).join(' | ');
                    }
                }
            }

            alert(`${t('common.error')}: ${errorMessage}`);
            throw error;
        }
    };

    const handleSubmit = async (submitForReview: boolean) => {
        const response = await saveActivity(submitForReview);
        if (response) {
            onSuccess();
        }
    };

    const handleGenerateTTS = async () => {
        let currentId = createdDicteeId;

        if (!currentId) {
            try {
                const response = await saveActivity(false); // Save as draft first
                if (response?.id) {
                    currentId = response.id;
                }
            } catch (err) {
                return;
            }
        }

        if (currentId) {
            triggerTTS(selectedVoices, selectedSpeeds, currentId);
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

                    {/* Audio Preview in Wizard */}
                    {(() => {
                        const manualUrls = audioUrls.filter(url => url.trim());
                        const allUrls = Array.from(new Set([...manualUrls, ...generatedUrls]));
                        if (allUrls.length === 0) return null;

                        return (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-800 space-y-2">
                                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                    🎧 {t('wizard.preview')}
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {allUrls.map((url, i) => {
                                        const cleanMediaBase = API_BASE_URL.replace(/\/api\/?$/, '').endsWith('/')
                                            ? API_BASE_URL.replace(/\/api\/?$/, '').slice(0, -1)
                                            : API_BASE_URL.replace(/\/api\/?$/, '');
                                        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
                                        const fullUrl = url.startsWith('http') ? url : `${cleanMediaBase}${cleanUrl}`;
                                        return (
                                            <div key={i} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700 shadow-sm">
                                                <audio src={fullUrl} controls className="h-8 flex-1" />
                                                <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">{url.split('/').pop()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
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

            {/* TTS Generation Section for Wizard */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-3">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                    ✨ {t('wizard.generate_audio_btn')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">{t('wizard.tts_voices_label')}</label>
                        <div className="flex gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedVoices.includes('male')}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedVoices([...selectedVoices, 'male']);
                                        else setSelectedVoices(selectedVoices.filter(v => v !== 'male'));
                                    }}
                                    className="rounded border-blue-300"
                                /> {t('wizard.tts_male')}
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedVoices.includes('female')}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedVoices([...selectedVoices, 'female']);
                                        else setSelectedVoices(selectedVoices.filter(v => v !== 'female'));
                                    }}
                                    className="rounded border-blue-300"
                                /> {t('wizard.tts_female')}
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">{t('wizard.tts_speeds_label')}</label>
                        <div className="flex gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedSpeeds.includes('0.9')}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedSpeeds([...selectedSpeeds, '0.9']);
                                        else setSelectedSpeeds(selectedSpeeds.filter(s => s !== '0.9'));
                                    }}
                                    className="rounded border-blue-300"
                                /> {t('wizard.tts_slow')}
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedSpeeds.includes('1.0')}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedSpeeds([...selectedSpeeds, '1.0']);
                                        else setSelectedSpeeds(selectedSpeeds.filter(s => s !== '1.0'));
                                    }}
                                    className="rounded border-blue-300"
                                /> {t('wizard.tts_normal')}
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                    <button
                        type="button"
                        onClick={handleGenerateTTS}
                        disabled={isGenerating || createActivity.isPending || selectedVoices.length === 0 || selectedSpeeds.length === 0}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        {isGenerating || createActivity.isPending ? (
                            <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('wizard.generating_audio')}
                            </>
                        ) : t('wizard.generate_audio_btn')}
                    </button>
                    {isTimeout && (
                        <span className="text-[10px] leading-tight text-yellow-600 dark:text-yellow-400 font-medium max-w-[200px]">
                            {t('wizard.tts_timeout')}
                        </span>
                    )}
                </div>
                {ttsError && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">{ttsError}</p>
                )}
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
