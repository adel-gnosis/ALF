import React, { useState, useRef, useEffect } from 'react';
import { useUploadMedia, API_BASE_URL } from '@alf/shared';
import { Upload, Play, Pause, Plus, Trash2, Image as ImageIcon, Volume2, Loader2, Check, ArrowUp, ArrowDown } from 'lucide-react';

// Common props for all type editors
export interface TypeEditorProps {
    data: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    locale: string;
}

// --- Helpers ---

const generateId = () => Math.random().toString(36).substring(2, 11);

const getMediaBaseUrl = () => {
    const baseUrl = API_BASE_URL || 'http://localhost:8000/api';
    return baseUrl.replace(/\/api\/?$/, '');
};

const getMediaUrl = (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = getMediaBaseUrl();
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

const AudioPlayer: React.FC<{ url: string }> = ({ url }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio(getMediaUrl(url));
            audioRef.current.onended = () => setIsPlaying(false);
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <button
            onClick={togglePlay}
            className={`p-2 rounded-lg transition-all ${isPlaying ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 scale-95 shadow-inner' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 shadow-sm'}`}
            title="Play Audio"
        >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
    );
};

const MediaUploader: React.FC<{
    onUpload: (url: string) => void;
    type: 'image' | 'audio';
    locale: string;
    label?: string;
    className?: string;
}> = ({ onUpload, type, locale, label, className }) => {
    const uploadMutation = useUploadMedia();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const result = await uploadMutation.mutateAsync({ file, type });
            onUpload(result.url);
        } catch (error) {
            console.error('Upload failed:', error);
            alert(locale === 'fr' ? 'Échec du téléchargement' : locale === 'ar' ? 'فشل الرفع' : 'Upload failed');
        }
    };

    return (
        <div className={className}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={type === 'image' ? 'image/*' : 'audio/*'}
                className="hidden"
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 shadow-sm"
            >
                {uploadMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <Upload className="w-3.5 h-3.5" />
                )}
                {label || (type === 'image' ? (locale === 'fr' ? 'Image' : 'Image') : (locale === 'fr' ? 'Audio' : 'Audio'))}
            </button>
        </div>
    );
};

// --- Editors ---

// MCQ Editor
export const MCQEditor: React.FC<TypeEditorProps> = ({ data, onChange, locale }) => {
    // Normalization: convert legacy data to choices_v2
    useEffect(() => {
        if (!data.choices_v2 && data.choices) {
            const normalizedChoices = data.choices.map((c: any, i: number) => ({
                id: `c_${i}`,
                content: typeof c === 'string' ? { type: 'text', value: c } : { ...c }
            }));
            const normalizedCorrectId = typeof data.correct_answer_index === 'number'
                ? `c_${data.correct_answer_index}`
                : (normalizedChoices.length > 0 ? normalizedChoices[0].id : '');

            onChange({
                ...data,
                choices: undefined, // Clear legacy
                correct_answer_index: undefined, // Clear legacy
                choices_v2: normalizedChoices,
                correct_choice_id: normalizedCorrectId
            });
        }
    }, [data.choices, data.choices_v2]);

    const choices = data.choices_v2 || [];
    const correctChoiceId = data.correct_choice_id || (choices.length > 0 ? choices[0].id : '');

    const updateChoice = (id: string, updates: Partial<any>) => {
        const newChoices = choices.map((c: any) =>
            c.id === id ? { ...c, content: { ...c.content, ...updates } } : c
        );
        onChange({ ...data, choices_v2: newChoices, correct_choice_id: correctChoiceId });
    };

    const addChoice = () => {
        const newId = `c_${generateId()}`;
        const newChoices = [...choices, { id: newId, content: { type: 'text', value: '' } }];
        onChange({ ...data, choices_v2: newChoices, correct_choice_id: correctChoiceId });
    };

    const removeChoice = (id: string) => {
        const newChoices = choices.filter((c: any) => c.id !== id);
        let newCorrectId = correctChoiceId;
        if (id === correctChoiceId && newChoices.length > 0) {
            newCorrectId = newChoices[0].id;
        }
        onChange({ ...data, choices_v2: newChoices, correct_choice_id: newCorrectId });
    };

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {locale === 'fr' ? 'Choix de réponse' : locale === 'ar' ? 'خيارات الإجابة' : 'Answer Choices'}
            </h4>
            <div className="space-y-3">
                {choices.map((choice: any) => {
                    const isImage = choice.content?.type === 'image';
                    const val = choice.content?.value || '';
                    const isCorrect = correctChoiceId === choice.id;

                    return (
                        <div key={choice.id} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-600 group">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onChange({ ...data, correct_choice_id: choice.id })}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800'}`}
                                >
                                    {isCorrect && <Check className="w-4 h-4" />}
                                </button>

                                <div className="flex-1 flex items-center gap-2">
                                    <select
                                        value={choice.content?.type || 'text'}
                                        onChange={(e) => updateChoice(choice.id, { type: e.target.value as any, value: '' })}
                                        className="text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-none rounded-md px-2 py-0.5 outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        <option value="text">Text</option>
                                        <option value="image">Image</option>
                                    </select>

                                    {isImage ? (
                                        <div className="flex-1 flex items-center gap-3">
                                            {val ? (
                                                <div className="relative group/img">
                                                    <img src={getMediaUrl(val)} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm" />
                                                    <button
                                                        onClick={() => updateChoice(choice.id, { value: '' })}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <MediaUploader
                                                    type="image"
                                                    locale={locale}
                                                    onUpload={(url) => updateChoice(choice.id, { value: url })}
                                                    label={locale === 'fr' ? 'Upload Image' : 'Upload Image'}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={val}
                                            onChange={(e) => updateChoice(choice.id, { value: e.target.value })}
                                            placeholder={locale === 'fr' ? 'Texte du choix...' : 'Choice text...'}
                                            className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 outline-none p-0 dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-600"
                                        />
                                    )}
                                </div>

                                {choices.length > 2 && (
                                    <button
                                        onClick={() => removeChoice(choice.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <button
                onClick={addChoice}
                className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
                <Plus className="w-4 h-4" />
                {locale === 'fr' ? 'Ajouter un choix' : locale === 'ar' ? 'إضافة خيار' : 'Add choice'}
            </button>
        </div>
    );
};

// Multiple Answer Editor
export const MultipleAnswerEditor: React.FC<TypeEditorProps> = ({ data, onChange, locale }) => {
    // Normalization: convert legacy data to choices_v2
    useEffect(() => {
        if (!data.choices_v2 && data.choices) {
            const normalizedChoices = data.choices.map((c: any, i: number) => ({
                id: `c_${i}`,
                content: typeof c === 'string' ? { type: 'text', value: c } : { ...c }
            }));
            const normalizedCorrectIds = (data.correct_indices || [])
                .map((idx: number) => `c_${idx}`)
                .filter((id: string) => normalizedChoices.some((c: any) => c.id === id));

            onChange({
                ...data,
                choices: undefined,
                correct_indices: undefined,
                choices_v2: normalizedChoices,
                correct_choice_ids: normalizedCorrectIds
            });
        }
    }, [data.choices, data.choices_v2]);

    const choices = data.choices_v2 || [];
    const correctChoiceIds = data.correct_choice_ids || [];

    const updateChoice = (id: string, updates: Partial<any>) => {
        const newChoices = choices.map((c: any) =>
            c.id === id ? { ...c, content: { ...c.content, ...updates } } : c
        );
        onChange({ ...data, choices_v2: newChoices, correct_choice_ids: correctChoiceIds });
    };

    const handleCorrectToggle = (id: string) => {
        const newIds = correctChoiceIds.includes(id)
            ? correctChoiceIds.filter((i: string) => i !== id)
            : [...correctChoiceIds, id];
        onChange({ ...data, correct_choice_ids: newIds });
    };

    const addChoice = () => {
        const newId = `c_${generateId()}`;
        const newChoices = [...choices, { id: newId, content: { type: 'text', value: '' } }];
        onChange({ ...data, choices_v2: newChoices, correct_choice_ids: correctChoiceIds });
    };

    const removeChoice = (id: string) => {
        const newChoices = choices.filter((c: any) => c.id !== id);
        const newIds = correctChoiceIds.filter((cid: string) => cid !== id);
        onChange({ ...data, choices_v2: newChoices, correct_choice_ids: newIds });
    };

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {locale === 'fr' ? 'Réponses multiples' : locale === 'ar' ? 'إجابات متعددة' : 'Multiple Answers'}
            </h4>
            <div className="space-y-3">
                {choices.map((choice: any) => {
                    const isImage = choice.content?.type === 'image';
                    const val = choice.content?.value || '';
                    const isCorrect = correctChoiceIds.includes(choice.id);

                    return (
                        <div key={choice.id} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-600 group">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleCorrectToggle(choice.id)}
                                    className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-all shadow-sm ${isCorrect ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800'}`}
                                >
                                    {isCorrect && <Check className="w-4 h-4" />}
                                </button>

                                <div className="flex-1 flex items-center gap-2">
                                    <select
                                        value={choice.content?.type || 'text'}
                                        onChange={(e) => updateChoice(choice.id, { type: e.target.value as any, value: '' })}
                                        className="text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-slate-700 text-gray-400 border-none rounded-md px-2 py-0.5 outline-none cursor-pointer"
                                    >
                                        <option value="text">Text</option>
                                        <option value="image">Image</option>
                                    </select>

                                    {isImage ? (
                                        <div className="flex-1 flex items-center gap-3">
                                            {val ? (
                                                <div className="relative group/img">
                                                    <img src={getMediaUrl(val)} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm" />
                                                    <button
                                                        onClick={() => updateChoice(choice.id, { value: '' })}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <MediaUploader
                                                    type="image"
                                                    locale={locale}
                                                    onUpload={(url) => updateChoice(choice.id, { value: url })}
                                                    label={locale === 'fr' ? 'Upload Image' : 'Upload Image'}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={val}
                                            onChange={(e) => updateChoice(choice.id, { value: e.target.value })}
                                            placeholder={locale === 'fr' ? 'Texte du choix...' : 'Choice text...'}
                                            className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 outline-none p-0 dark:text-slate-200 placeholder-gray-300 dark:placeholder-slate-600"
                                        />
                                    )}
                                </div>

                                {choices.length > 2 && (
                                    <button
                                        onClick={() => removeChoice(choice.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <button
                onClick={addChoice}
                className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all px-2 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            >
                <Plus className="w-4 h-4" />
                {locale === 'fr' ? 'Ajouter un choix' : locale === 'ar' ? 'إضافة خيار' : 'Add choice'}
            </button>
        </div>
    );
};

// Fill Blank Editor
export const FillBlankEditor: React.FC<TypeEditorProps> = ({ data, onChange, locale }) => {
    // Normalization: migrate legacy answer keys → correct_answer.
    // NOTE: phrase_key is a real i18n field on the model — do NOT clobber it
    // into phrase. They are independent: phrase is the raw sentence, phrase_key
    // is the i18n lookup key. Preserve both as-is.
    useEffect(() => {
        const updates: any = {};
        if (!data.correct_answer && (data.blank_answer || data.answer)) {
            updates.correct_answer = data.blank_answer || data.answer;
            updates.blank_answer = undefined;
            updates.answer = undefined;
        }
        if (Object.keys(updates).length > 0) {
            onChange({ ...data, ...updates });
        }
    }, [data.blank_answer, data.answer]);

    const phrase = data.phrase || '';
    const phraseKey = data.phrase_key || '';
    const answer = data.correct_answer || '';
    // NOTE: FillBlankActivity has no case_sensitive field — removed.

    return (
        <div className="space-y-5">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {locale === 'fr' ? 'Configuration des blancs' : 'Blank Configuration'}
            </h4>

            <div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-4">
                {/* phrase_key: show as read-only badge when present so teachers know an i18n key is set */}
                {phraseKey && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">i18n key</span>
                        <span className="text-xs font-mono text-green-700 dark:text-green-300">{phraseKey}</span>
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                        {locale === 'fr' ? 'Phrase (utilisez ___ pour le blanc)' : 'Phrase (use ___ for blank)'}
                    </label>
                    <input
                        type="text"
                        value={phrase}
                        onChange={(e) => onChange({ ...data, phrase: e.target.value })}
                        placeholder="Ex: Je ___ à la maison."
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                        {locale === 'fr' ? 'Réponse attendue' : 'Expected Answer'}
                    </label>
                    <input
                        type="text"
                        value={answer}
                        onChange={(e) => onChange({ ...data, correct_answer: e.target.value })}
                        placeholder="Ex: vais"
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-bold text-green-600 dark:text-green-400 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

// Dictee Editor
export const DicteeEditor: React.FC<TypeEditorProps> = ({ data, onChange, locale }) => {
    // Normalization
    useEffect(() => {
        if (!data.correct_text && (data.text || data.transcription)) {
            onChange({
                ...data,
                correct_text: data.text || data.transcription,
                text: undefined,
                transcription: undefined
            });
        }
    }, [data.text, data.transcription]);

    const text = data.correct_text || '';
    const audioUrls = data.audio_urls || [];
    const caseSensitive = data.case_sensitive ?? false;

    const addAudioUrl = (url: string) => {
        const newUrls = [...audioUrls, url];
        onChange({ ...data, audio_urls: newUrls });
    };

    const removeAudioUrl = (index: number) => {
        const newUrls = audioUrls.filter((_: any, i: number) => i !== index);
        onChange({ ...data, audio_urls: newUrls });
    };

    return (
        <div className="space-y-5">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {locale === 'fr' ? 'Configuration de la dictée' : 'Dictation Config'}
            </h4>

            <div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-4">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                        {locale === 'fr' ? 'Transcription correcte' : 'Correct Transcription'}
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => onChange({ ...data, correct_text: e.target.value })}
                        placeholder="Le texte que l'étudiant doit écrire..."
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none resize-none transition-all"
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                            {locale === 'fr' ? 'Fichiers Audio' : 'Audio Files'}
                        </label>
                        <MediaUploader
                            type="audio"
                            locale={locale}
                            onUpload={addAudioUrl}
                            label={locale === 'fr' ? 'Uploader Audio' : 'Upload Audio'}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {audioUrls.map((url: string, index: number) => (
                            <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800/50 group">
                                <AudioPlayer url={url} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-mono text-gray-400 dark:text-slate-500 truncate">
                                        {url.split('/').pop()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeAudioUrl(index)}
                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {audioUrls.length === 0 && (
                            <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
                                <Volume2 className="w-8 h-8 text-gray-200 dark:text-slate-800 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 dark:text-slate-600">Aucun fichier audio</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={caseSensitive}
                                onChange={(e) => onChange({ ...data, case_sensitive: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-orange-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                        </div>
                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                            {locale === 'fr' ? 'Respecter la casse' : 'Case sensitive'}
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
};

// Matching Editor
export const MatchingEditor: React.FC<TypeEditorProps> = ({ data, onChange, locale }) => {
    // Normalization: convert pairs -> pairs_v2
    useEffect(() => {
        if (!data.pairs_v2 && data.pairs) {
            const normalizedPairs = data.pairs.map((p: any, i: number) => ({
                id: `p_${i}`,
                left: p.left || { type: 'text', value: p.item_a || '' },
                right: p.right || { type: 'text', value: p.item_b || '' }
            }));
            onChange({ ...data, pairs: undefined, pairs_v2: normalizedPairs });
        }
    }, [data.pairs, data.pairs_v2]);

    const pairs = data.pairs_v2 || [];

    const updateItem = (pairId: string, side: 'left' | 'right', updates: Partial<any>) => {
        const newPairs = pairs.map((p: any) =>
            p.id === pairId ? { ...p, [side]: { ...p[side], ...updates } } : p
        );
        onChange({ ...data, pairs_v2: newPairs });
    };

    const addPair = () => {
        const newId = `p_${generateId()}`;
        const newPairs = [...pairs, { id: newId, left: { type: 'text', value: '' }, right: { type: 'text', value: '' } }];
        onChange({ ...data, pairs_v2: newPairs });
    };

    const removePair = (id: string) => {
        const newPairs = pairs.filter((p: any) => p.id !== id);
        onChange({ ...data, pairs_v2: newPairs });
    };

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {locale === 'fr' ? 'Paires d\'association' : 'Matching Pairs'}
            </h4>

            <div className="space-y-3">
                {pairs.map((pair: any) => {
                    const lType = pair.left?.type || 'text';
                    const rType = pair.right?.type || 'text';
                    const lVal = pair.left?.value || '';
                    const rVal = pair.right?.value || '';

                    return (
                        <div key={pair.id} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm group">
                            <div className="flex-1 space-y-2">
                                <select
                                    value={lType}
                                    onChange={(e) => updateItem(pair.id, 'left', { type: e.target.value as any, value: '' })}
                                    className="text-[9px] font-black uppercase tracking-tighter bg-gray-100 dark:bg-slate-700 rounded px-1.5"
                                >
                                    <option value="text">Text</option>
                                    <option value="image">Img</option>
                                </select>
                                {lType === 'image' ? (
                                    lVal ? (
                                        <div className="relative w-16 h-16">
                                            <img src={getMediaUrl(lVal)} className="w-full h-full object-cover rounded-md border dark:border-slate-600" />
                                            <button onClick={() => updateItem(pair.id, 'left', { value: '' })} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"><Trash2 className="w-2.5 h-2.5" /></button>
                                        </div>
                                    ) : <MediaUploader type="image" locale={locale} onUpload={(url) => updateItem(pair.id, 'left', { value: url })} />
                                ) : (
                                    <input
                                        type="text"
                                        value={lVal}
                                        onChange={(e) => updateItem(pair.id, 'left', { value: e.target.value })}
                                        className="w-full bg-transparent border-b border-gray-100 dark:border-slate-800 text-xs font-semibold focus:border-purple-500 p-0 outline-none"
                                        placeholder="Item A"
                                    />
                                )}
                            </div>

                            <div className="flex flex-col items-center justify-center p-2 rounded-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                                <ArrowUp className="w-3 h-3 text-gray-300" />
                                <ArrowDown className="w-3 h-3 text-gray-300" />
                            </div>

                            <div className="flex-1 space-y-2">
                                <select
                                    value={rType}
                                    onChange={(e) => updateItem(pair.id, 'right', { type: e.target.value as any, value: '' })}
                                    className="text-[9px] font-black uppercase tracking-tighter bg-gray-100 dark:bg-slate-700 rounded px-1.5 ml-auto block"
                                >
                                    <option value="text">Text</option>
                                    <option value="image">Img</option>
                                </select>
                                {rType === 'image' ? (
                                    rVal ? (
                                        <div className="relative w-16 h-16 ml-auto">
                                            <img src={getMediaUrl(rVal)} className="w-full h-full object-cover rounded-md border dark:border-slate-600" />
                                            <button onClick={() => updateItem(pair.id, 'right', { value: '' })} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"><Trash2 className="w-2.5 h-2.5" /></button>
                                        </div>
                                    ) : <div className="flex justify-end"><MediaUploader type="image" locale={locale} onUpload={(url) => updateItem(pair.id, 'right', { value: url })} /></div>
                                ) : (
                                    <input
                                        type="text"
                                        value={rVal}
                                        onChange={(e) => updateItem(pair.id, 'right', { value: e.target.value })}
                                        className="w-full bg-transparent border-b border-gray-100 dark:border-slate-800 text-xs font-semibold focus:border-purple-500 p-0 outline-none text-right"
                                        placeholder="Item B"
                                    />
                                )}
                            </div>

                            <button onClick={() => removePair(pair.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={addPair}
                className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-all px-2 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
                <Plus className="w-4 h-4" />
                {locale === 'fr' ? 'Ajouter une paire' : 'Add pair'}
            </button>
        </div>
    );
};

// Drag Order Editor
export const DragOrderEditor: React.FC<TypeEditorProps> = ({ data, onChange, locale }) => {
    // Normalization: items/ordered_items -> words/correct_order
    useEffect(() => {
        const legacyItems = data.items || data.ordered_items;
        if (!data.words && legacyItems) {
            const newWords = [...legacyItems];
            const newOrder = newWords.map((_: any, i: number) => i);
            onChange({ ...data, items: undefined, ordered_items: undefined, words: newWords, correct_order: newOrder });
        }
    }, [data.items, data.ordered_items]);

    const words = data.words || [];
    const correctOrder = data.correct_order || words.map((_: any, i: number) => i);

    const handleWordChange = (index: number, value: string) => {
        const newWords = [...words];
        newWords[index] = value;
        onChange({ ...data, words: newWords, correct_order: correctOrder });
    };

    const addItem = () => {
        const newWords = [...words, ''];
        const newOrder = [...correctOrder, correctOrder.length];
        onChange({ ...data, words: newWords, correct_order: newOrder });
    };

    const removeItem = (index: number) => {
        const newWords = words.filter((_: any, i: number) => i !== index);
        const newOrder = newWords.map((_: any, i: number) => i);
        onChange({ ...data, words: newWords, correct_order: newOrder });
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === words.length - 1)) return;
        const newWords = [...words];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newWords[index], newWords[targetIndex]] = [newWords[targetIndex], newWords[index]];
        const newOrder = newWords.map((_: any, i: number) => i);
        onChange({ ...data, words: newWords, correct_order: newOrder });
    };

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {locale === 'fr' ? 'Ordre des éléments' : 'Sequence Order'}
            </h4>

            <div className="space-y-2">
                {words.map((word: string, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm group">
                        <div className="w-6 h-6 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-[10px] font-black flex items-center justify-center border border-teal-100 dark:border-teal-800">
                            {index + 1}
                        </div>
                        <input
                            type="text"
                            value={word}
                            onChange={(e) => handleWordChange(index, e.target.value)}
                            placeholder="Type item..."
                            className="flex-1 bg-transparent border-none text-sm font-semibold focus:ring-0 outline-none p-0 dark:text-slate-200"
                        />
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => moveItem(index, 'up')}
                                disabled={index === 0}
                                className="p-1.5 text-gray-300 hover:text-teal-500 disabled:opacity-20"
                            >
                                <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => moveItem(index, 'down')}
                                disabled={index === words.length - 1}
                                className="p-1.5 text-gray-300 hover:text-teal-500 disabled:opacity-20"
                            >
                                <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => removeItem(index)}
                                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addItem}
                className="flex items-center gap-2 text-sm font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-all px-2 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20"
            >
                <Plus className="w-4 h-4" />
                {locale === 'fr' ? 'Ajouter un élément' : 'Add Item'}
            </button>
        </div>
    );
};

// Text Input Editor
export const TextInputEditor: React.FC<TypeEditorProps> = ({ data, onChange, locale }) => {
    // Normalization
    useEffect(() => {
        const legacyAnswers = data.accepted_answers || data.model_answers || (data.model_answer ? [data.model_answer] : null);
        if (!data.correct_answers && legacyAnswers) {
            onChange({ ...data, model_answer: undefined, model_answers: undefined, accepted_answers: undefined, correct_answers: legacyAnswers });
        }
    }, [data.accepted_answers, data.model_answer]);

    const correctAnswers = data.correct_answers || [];
    const caseSensitive = data.case_sensitive ?? false;

    const updateAnswer = (index: number, val: string) => {
        const newAns = [...correctAnswers];
        newAns[index] = val;
        onChange({ ...data, correct_answers: newAns });
    };

    return (
        <div className="space-y-5">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {locale === 'fr' ? 'Libre Expression' : 'Text Input Config'}
            </h4>

            <div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-4">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                        {locale === 'fr' ? 'Réponses Acceptées' : 'Accepted Answers'}
                    </label>
                    {correctAnswers.map((ans: string, i: number) => (
                        <div key={i} className="flex gap-2">
                            <textarea
                                value={ans}
                                onChange={(e) => updateAnswer(i, e.target.value)}
                                placeholder="Réponse modèle..."
                                className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-gray-400 outline-none resize-none transition-all"
                                rows={2}
                            />
                            {correctAnswers.length > 1 && (
                                <button onClick={() => onChange({ ...data, correct_answers: correctAnswers.filter((_: any, idx: number) => idx !== i) })} className="self-start p-2 text-gray-300 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={() => onChange({ ...data, correct_answers: [...correctAnswers, ''] })} className="text-[10px] font-bold text-blue-500 hover:underline">+ {locale === 'fr' ? 'Ajouter une variante' : 'Add Variation'}</button>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={caseSensitive}
                                onChange={(e) => onChange({ ...data, case_sensitive: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                        </div>
                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                            {locale === 'fr' ? 'Respecter la casse' : 'Case sensitive'}
                        </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={data.accept_partial ?? false}
                                onChange={(e) => onChange({ ...data, accept_partial: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                        </div>
                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                            {locale === 'fr' ? 'Accepter les correspondances partielles' : 'Accept partial matches'}
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
};

// Conjugation Editor
export const ConjugationEditor: React.FC<TypeEditorProps> = ({ data, onChange, locale }) => {
    // Normalization
    useEffect(() => {
        const updates: any = {};
        if (!data.verb_infinitive && (data.verb || data.infinitive)) {
            updates.verb_infinitive = data.verb || data.infinitive;
            updates.verb = undefined;
            updates.infinitive = undefined;
        }
        if (!data.correct_conjugation && (data.correct_answer || data.conjugation || data.answer)) {
            updates.correct_conjugation = data.correct_answer || data.conjugation || data.answer;
            updates.correct_answer = undefined;
            updates.conjugation = undefined;
            updates.answer = undefined;
        }
        if (Object.keys(updates).length > 0) {
            onChange({ ...data, ...updates });
        }
    }, [data.verb, data.correct_answer, data.conjugation, data.answer, data.infinitive]);

    const verb = data.verb_infinitive || '';
    const tense = data.tense || '';
    const pronoun = data.pronoun || '';
    const correct = data.correct_conjugation || '';

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {locale === 'fr' ? 'Paramètres de conjugaison' : 'Conjugation Params'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-3">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-pink-500 mb-1">Verb</label>
                        <input
                            type="text"
                            value={verb}
                            onChange={(e) => onChange({ ...data, verb_infinitive: e.target.value })}
                            className="w-full bg-transparent border-none text-sm font-bold p-0 focus:ring-0"
                            placeholder="manger"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-pink-400 mb-1">Tense</label>
                        <input
                            type="text"
                            value={tense}
                            onChange={(e) => onChange({ ...data, tense: e.target.value })}
                            className="w-full bg-transparent border-none text-sm font-medium p-0 focus:ring-0"
                            placeholder="présent"
                        />
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-3">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Pronoun</label>
                        <input
                            type="text"
                            value={pronoun}
                            onChange={(e) => onChange({ ...data, pronoun: e.target.value })}
                            className="w-full bg-transparent border-none text-sm font-bold p-0 focus:ring-0"
                            placeholder="je"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Correct Form</label>
                        <input
                            type="text"
                            value={correct}
                            onChange={(e) => onChange({ ...data, correct_conjugation: e.target.value })}
                            className="w-full bg-transparent border-none text-sm font-black text-green-600 dark:text-green-400 p-0 focus:ring-0"
                            placeholder="mange"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Generic Editor for unknown types (JSON View)
export const GenericEditor: React.FC<TypeEditorProps & { activityType: string }> = ({ data, onChange, locale, activityType }) => {
    const [jsonText, setJsonText] = useState(JSON.stringify(data, null, 2));
    const [error, setError] = useState<string | null>(null);

    const handleJsonChange = (val: string) => {
        setJsonText(val);
        try {
            const parsed = JSON.parse(val);
            onChange(parsed);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Raw Data Editor ({activityType})
                </label>
                {error && (
                    <span className="text-[10px] font-bold text-red-500 animate-pulse">
                        Invalid JSON
                    </span>
                )}
            </div>
            <textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={10}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-mono text-xs text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>
    );
};

// Map activity types to their respective editors
export const getTypeEditor = (type: string) => {
    const editors: Record<string, React.FC<any>> = {
        MCQActivity: MCQEditor,
        FillBlankActivity: FillBlankEditor,
        MatchingActivity: MatchingEditor,
        DragOrderActivity: DragOrderEditor,
        ConjugationActivity: ConjugationEditor,
        MultipleAnswerActivity: MultipleAnswerEditor,
        TextInputActivity: TextInputEditor,
        DicteeActivity: DicteeEditor,
    };

    return editors[type] || GenericEditor;
};