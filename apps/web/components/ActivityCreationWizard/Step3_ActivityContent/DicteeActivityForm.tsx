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
        0 // Always 0 during creation wizard
    );

    // Audio player state
    const [selectedVoice, setSelectedVoice] = useState('male_default');

    // Audio variants with labels
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
                const response = await saveActivity(false); // Save as draft first
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

    // Get current audio URL for selected voice - FIXED MATCHING LOGIC
    const getCurrentAudioUrl = () => {
        if (!selectedVoice || generatedUrls.length === 0) return null;
        
        console.log('Looking for voice:', selectedVoice);
        console.log('Available URLs:', generatedUrls);
        
        // Try exact match first
        let matchingUrl = generatedUrls.find(url => url.includes(`_${selectedVoice}_`));
        
        // Fallback: try partial match
        if (!matchingUrl) {
            matchingUrl = generatedUrls.find(url => url.toLowerCase().includes(selectedVoice.toLowerCase()));
        }
        
        // Last resort: return any URL with index based on variant order
        if (!matchingUrl && generatedUrls.length > 0) {
            const variantIndex = audioVariants.findIndex(v => v.id === selectedVoice);
            if (variantIndex >= 0 && variantIndex < generatedUrls.length) {
                matchingUrl = generatedUrls[variantIndex];
            }
        }
        
        console.log('Matched URL:', matchingUrl);
        return matchingUrl || null;
    };

    const currentAudioUrl = getCurrentAudioUrl();

    // Count available audio files
    const availableCount = generatedUrls.length;
    const expectedCount = 4;

    return (
        <div className="max-w-3xl mx-auto space-y-6 text-left">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 p-5 rounded-xl">
                <div className="flex items-start gap-4">
                    <div className="text-4xl">🎵</div>
                    <div>
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">{t('wizard.dictee_title')}</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">{t('wizard.dictee_desc')}</p>
                    </div>
                </div>
            </div>

            {/* Instruction Selection */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
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

            {/* Correct Text */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                    ✏️ {t('wizard.correct_text_label')} <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={correctText}
                    onChange={(e) => setCorrectText(e.target.value)}
                    placeholder={t('wizard.correct_text_placeholder')}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    dir={isRTL ? 'rtl' : 'ltr'}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400">{t('wizard.correct_text_desc')}</p>
            </div>

            {/* Audio Generation Section */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                            ✨ {t('wizard.audio_auto_title') || 'Audio Automatique (4 voix)'}
                        </h4>
                        {isGenerating && availableCount > 0 && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                {availableCount}/{expectedCount} voix générées...
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleGenerateTTS}
                        disabled={isGenerating || createActivity.isPending || !correctText.trim()}
                        className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

                {/* Timeout warning */}
                {isTimeout && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                            ⚠️ {t('wizard.tts_timeout')}
                        </p>
                    </div>
                )}

                {/* Error message */}
                {ttsError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                        <p className="text-xs text-red-700 dark:text-red-400 font-medium">{ttsError}</p>
                    </div>
                )}

                {/* Audio Player */}
                {generatedUrls.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-purple-100 dark:border-purple-900/50 space-y-3">
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                            🎧 {t('wizard.audio_preview')} ({availableCount}/{expectedCount})
                        </label>
                        
                        {/* Voice Selector */}
                        <div className="flex items-center gap-3">
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="flex-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-500"
                            >
                                {audioVariants.map(variant => (
                                    <option key={variant.id} value={variant.id}>
                                        {variant.icon} {variant.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Audio Player Component */}
                        {currentAudioUrl ? (
                            <AudioPlayer 
                                url={currentAudioUrl} 
                                label={audioVariants.find(v => v.id === selectedVoice)?.label}
                            />
                        ) : (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg text-center">
                                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                    ⏳ Cette voix n'est pas encore disponible. Veuillez patienter...
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {generatedUrls.length === 0 && !isGenerating && (
                    <div className="text-center py-6 text-sm text-purple-600 dark:text-purple-400">
                        💡 {t('wizard.no_audio_yet') || 'Cliquez sur "Générer les audios" pour créer 4 voix différentes'}
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                    ⚙️ {t('wizard.settings_title')}
                </label>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                    <input
                        type="checkbox"
                        id="caseSensitive"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="caseSensitive" className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                        {t('wizard.case_sensitive')}
                    </label>
                </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-between items-center pt-6 border-t-2 border-gray-200 dark:border-slate-800">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                    💾 {t('wizard.draft_hint')}
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={createActivity.isPending}
                        className="px-6 py-2.5 border-2 border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        {t('wizard.save_draft_btn')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        disabled={createActivity.isPending}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        {createActivity.isPending ? t('wizard.creating') : t('wizard.create_btn')}
                    </button>
                </div>
            </div>

            {/* Hidden button for wizard integration */}
            <button id="wizard-submit-btn" type="button" onClick={() => handleSubmit(false)} className="hidden" />
        </div>
    );
}