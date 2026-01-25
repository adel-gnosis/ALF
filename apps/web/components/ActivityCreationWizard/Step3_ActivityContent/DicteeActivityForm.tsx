import { useEffect, useMemo, useState } from 'react';
import { ActivityWizardState, useSubjects, API_BASE_URL, useDicteeTTS } from '@alf/shared';
import { useCreateActivity } from '@alf/shared';
import { useI18nKeys } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';

interface DicteeActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

// Reusable Audio Player Component
interface AudioPlayerProps {
    url: string;
    label?: string;
    className?: string;
}

function AudioPlayer({ url, label, className = '' }: AudioPlayerProps) {
    const cleanMediaBase = API_BASE_URL.replace(/\/api\/?$/, '').endsWith('/')
        ? API_BASE_URL.replace(/\/api\/?$/, '').slice(0, -1)
        : API_BASE_URL.replace(/\/api\/?$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = url.startsWith('http') ? url : `${cleanMediaBase}${cleanUrl}`;

    return (
        <div className={`bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 ${className}`}>
            {label && (
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">{label}</p>
            )}
            <audio
                key={fullUrl}
                src={fullUrl}
                controls
                preload="metadata"
                className="w-full"
                crossOrigin="anonymous"
                onError={(e) => console.error("Audio Load Error:", fullUrl, e)}
                style={{
                    height: '40px',
                    outline: 'none'
                }}
            />
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-2 font-mono truncate" title={fullUrl}>
                {fullUrl}
            </p>
        </div>
    );
}

export default function DicteeActivityForm({ state, updateState, onSuccess }: DicteeActivityFormProps) {
    const { t, isRTL, locale } = useI18n();
    const createActivity = useCreateActivity();
    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    const [correctText, setCorrectText] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [createdDicteeId, setCreatedDicteeId] = useState<number | null>(null);

    const { triggerTTS, isGenerating, error: ttsError, isTimeout, setIsTimeout, generatedUrls } = useDicteeTTS(
        createdDicteeId || 0,
        0
    );

    const [selectedVoice, setSelectedVoice] = useState('male_default');

    const audioVariants = [
        { id: 'male_default', label: t('wizard.voice_male_default') || 'Homme - Naturel', icon: '👨' },
        { id: 'male_slow', label: t('wizard.voice_male_slow') || 'Homme - Dictée (lent)', icon: '👨‍🏫' },
        { id: 'female_default', label: t('wizard.voice_female_default') || 'Femme - Naturelle', icon: '👩' },
        { id: 'female_slow', label: t('wizard.voice_female_slow') || 'Femme - Dictée (lent)', icon: '👩‍🏫' }
    ];

    const validateForm = (): boolean => {
        if (!correctText.trim()) {
            alert(t('wizard.validation.correct_text_required'));
            return false;
        }
        return true;
    };

    const saveActivity = async (submitForReview: boolean) => {
        if (!validateForm()) return null;

        const instructionKey = state.instructionKey || 'activity.dictee.instruction.generic';

        const payload = {
            activity_type: 'DicteeActivity',
            lesson_id: state.lessonId!,
            instruction_key: instructionKey,
            question_text_key: state.questionTextKey,
            translation_data: {},
            difficulty: state.difficulty,
            points: state.points,
            order: state.order,
            type_specific_data: {
                audio_urls: generatedUrls.filter(url => url.trim()),
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
                const response = await saveActivity(false);
                if (response?.id) {
                    currentId = response.id;
                }
            } catch (err) {
                return;
            }
        }

        if (currentId) {
            triggerTTS([], [], currentId);
        }
    };

    const getCurrentAudioUrl = () => {
        if (!selectedVoice || generatedUrls.length === 0) return null;

        let matchingUrl = generatedUrls.find(url => url.includes(`_${selectedVoice}_`));

        if (!matchingUrl) {
            matchingUrl = generatedUrls.find(url => url.toLowerCase().includes(selectedVoice.toLowerCase()));
        }

        if (!matchingUrl && generatedUrls.length > 0) {
            const variantIndex = audioVariants.findIndex(v => v.id === selectedVoice);
            if (variantIndex >= 0 && variantIndex < generatedUrls.length) {
                matchingUrl = generatedUrls[variantIndex];
            }
        }

        return matchingUrl || null;
    };

    const currentAudioUrl = getCurrentAudioUrl();
    const availableCount = generatedUrls.length;
    const expectedCount = 4;

    return (
        <div className="max-w-4xl mx-auto space-y-4 text-left">
            {/* Header - Compact */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-2xl">🎵</div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">{t('wizard.dictee_title')}</h3>
                        <p className="text-xs text-blue-700 dark:text-blue-400">{t('wizard.dictee_desc')}</p>
                    </div>
                </div>
            </div>

            {/* Instruction + Correct Text - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instruction Selection */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        📋 {t('wizard.instruction_label')}
                    </label>
                    <InstructionKeyPicker
                        activityType="DicteeActivity"
                        subjectCode={subjectCode}
                        courseId={state.courseId}
                        selectedKey={state.instructionKey || 'activity.dictee.instruction.generic'}
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
                        onChange={(e) => updateState({ questionTextKey: e.target.value })}
                        placeholder={t('wizard.question_text_placeholder') || 'Enter question text key...'}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Case Sensitive Checkbox */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        ⚙️ {t('wizard.settings_title')}
                    </label>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 h-[42px]">
                        <input
                            type="checkbox"
                            id="caseSensitive"
                            checked={caseSensitive}
                            onChange={(e) => setCaseSensitive(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor="caseSensitive" className="text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                            {t('wizard.case_sensitive')}
                        </label>
                    </div>
                </div>
            </div>

            {/* Correct Text - Full width */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                    ✏️ {t('wizard.correct_text_label')} <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={correctText}
                    onChange={(e) => setCorrectText(e.target.value)}
                    placeholder={t('wizard.correct_text_placeholder')}
                    rows={2}
                    className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    dir="ltr"
                />
            </div>

            {/* Audio Generation - Compact Version */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 p-3 rounded-lg">
                {/* Generation Button + Status in one line */}
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300">
                            ✨ {t('wizard.audio_auto_title')}
                        </h4>
                        {isGenerating && availableCount > 0 && (
                            <p className="text-[10px] text-purple-600 dark:text-purple-400">
                                {t('wizard.voices_ready').replace('{count}', availableCount.toString()).replace('{total}', expectedCount.toString())}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleGenerateTTS}
                        disabled={isGenerating || createActivity.isPending || !correctText.trim()}
                        className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('wizard.generating_audio')}
                            </>
                        ) : (
                            <>
                                <span>🎤</span>
                                {t('wizard.generate_audio_btn')}
                            </>
                        )}
                    </button>
                </div>

                {/* Errors/Warnings - Compact */}
                {(isTimeout || ttsError) && (
                    <div className={`p-2 rounded text-xs mb-3 ${isTimeout ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
                        {isTimeout ? `⚠️ ${t('wizard.tts_timeout')}` : ttsError}
                    </div>
                )}

                {/* Audio Player - Only show when generated, compact */}
                {generatedUrls.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">
                                🎧 {t('wizard.audio_preview')}
                            </label>
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="flex-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-purple-500"
                            >
                                {audioVariants.map(variant => (
                                    <option key={variant.id} value={variant.id}>
                                        {variant.icon} {variant.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {currentAudioUrl && (
                            <AudioPlayer url={currentAudioUrl} />
                        )}
                    </div>
                )}

                {/* Empty state - Only show when NO audio yet */}
                {generatedUrls.length === 0 && !isGenerating && (
                    <div className="text-center py-3 text-xs text-purple-600 dark:text-purple-400">
                        💡 {t('wizard.no_audio_yet')}
                    </div>
                )}
            </div>

            {/* Submit Buttons - Compact */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-slate-800">
                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                    💾 {t('wizard.draft_hint')}
                </p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={createActivity.isPending}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        {t('wizard.save_draft_btn')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        disabled={createActivity.isPending}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        {createActivity.isPending ? t('wizard.creating') : t('wizard.create_btn')}
                    </button>
                </div>
            </div>

            <button id="wizard-submit-btn" type="button" onClick={() => handleSubmit(false)} className="hidden" />
        </div>
    );
}