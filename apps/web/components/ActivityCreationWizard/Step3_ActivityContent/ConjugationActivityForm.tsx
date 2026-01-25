
import { ActivityWizardState, useSubjects, useCreateActivity, useConjugateVerb, ConjugationResult } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';
import { useMemo, useState } from 'react';

// API Response Types
interface SearchResult {
    results: string[];
}

// ConjugationResult imported from @alf/shared

interface ConjugationActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function ConjugationActivityForm({ state, updateState, onSuccess }: ConjugationActivityFormProps) {
    const { t, isRTL } = useI18n();
    const createActivity = useCreateActivity();
    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    // Local State for Wizard
    const [verbQuery, setVerbQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [selectedVerb, setSelectedVerb] = useState('');
    const [selectedTense, setSelectedTense] = useState('présent');
    const [selectedPronouns, setSelectedPronouns] = useState<Record<string, boolean>>({
        'je': true,
        'tu': true,
        'il': true,
        'elle': true,
        'on': true,
        'nous': true,
        'vous': true,
        'ils': true,
        'elles': true
    });

    // Data handling
    const [previewData, setPreviewData] = useState<ConjugationResult | null>(null);
    const [editableItems, setEditableItems] = useState<{ pronoun: string; form: string }[]>([]);

    // Shared Hook for Conjugation
    const { refetch: fetchConjugations, isFetching: isLoadingPreview } = useConjugateVerb(
        { verb: selectedVerb, tense: selectedTense },
        false // enabled: false, manual trigger
    );

    // Bulk Creation Progress
    const [creationProgress, setCreationProgress] = useState<{ current: number, total: number } | null>(null);

    // Tenses supported by our Backend/Mapping
    const TENSES = [
        // Indicatif
        'présent',
        'imparfait',
        'passé simple',
        'futur',
        'passé composé',
        'plus-que-parfait',
        'futur antérieur',
        'passé antérieur',
        // Conditionnel
        'conditionnel présent',
        'conditionnel passé',
        // Subjonctif
        'subjonctif présent',
        'subjonctif imparfait',
        'subjonctif passé',
        'subjonctif plus-que-parfait',
        // Impératif
        'impératif présent',
        'impératif passé',
    ];
    // --- Actions ---

    const handleSearch = async (query: string) => {
        setVerbQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`/api/conjugation/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) {
                console.error('Search failed:', res.status, await res.text());
                setSearchResults([]);
                return;
            }

            try {
                const data: SearchResult = await res.json();
                setSearchResults(data.results || []);
            } catch (jsonErr) {
                console.error('Search JSON parse failed:', jsonErr);
                setSearchResults([]);
            }
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectVerb = (verb: string) => {
        setSelectedVerb(verb);
        setVerbQuery(verb);
        setSearchResults([]); // Hide dropdown
        setPreviewData(null); // Reset preview
        setEditableItems([]);
    };

    const handleGeneratePreview = async () => {
        if (!selectedVerb) return;

        try {
            const { data, isError, error } = await fetchConjugations();

            if (isError || !data) {
                console.error('Preview API error:', error);
                alert(t('wizard.error_message') || t('wizard.conjugation.error_generation'));
                setPreviewData(null);
                setEditableItems([]);
                return;
            }

            console.log('[Frontend] Preview Data received:', data);

            setPreviewData(data);
            // seed editable items
            setEditableItems(data.conjugations.map(c => ({ pronoun: c.pronoun, form: c.form })));

        } catch (err) {
            console.error('Preview failed', err);
            alert(t('wizard.error_message'));
        }
    };

    const handleUpdateItem = (index: number, val: string) => {
        setEditableItems(prev => {
            const next = [...prev];
            next[index].form = val;
            return next;
        });
    };

    const handleBulkCreate = async () => {
        if (!previewData || editableItems.length === 0) return;

        // Filter conjugations by selected pronouns using editableItems
        const itemsToCreate = editableItems.filter(c => selectedPronouns[c.pronoun]);

        console.log('[Frontend] Submitting items:', itemsToCreate);

        if (itemsToCreate.length === 0) {
            alert(t('wizard.validation.no_pronoun_selected'));
            return;
        }

        if (!confirm(t('wizard.conjugation.confirm_bulk_creation').replace('{count}', itemsToCreate.length.toString()).replace('{verb}', selectedVerb))) {
            return;
        }

        setCreationProgress({ current: 0, total: itemsToCreate.length });

        const instructionKey = state.instructionKey || 'activity.conjugation.instruction.generic';

        try {
            // Process sequentially to be safe
            for (let i = 0; i < itemsToCreate.length; i++) {
                const item = itemsToCreate[i];

                const payload = {
                    activity_type: 'ConjugationActivity',
                    lesson_id: state.lessonId!,
                    instruction_key: instructionKey,
                    question_text_key: state.questionTextKey,
                    difficulty: state.difficulty,
                    points: state.points,
                    order: state.order + i, // Increment order for each
                    type_specific_data: {
                        verb_infinitive: selectedVerb,
                        tense: selectedTense,
                        pronoun: item.pronoun,
                        correct_conjugation: item.form // Uses editable value
                    }
                };

                await createActivity.mutateAsync(payload);
                setCreationProgress({ current: i + 1, total: itemsToCreate.length });
            }

            // Success!
            alert(t('wizard.success_message'));
            onSuccess();

        } catch (error: any) {
            console.error('Bulk creation error', error);
            alert(`${t('common.error')}: ${error.response?.data?.message || t('wizard.error_message')}`);
            setCreationProgress(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 text-left pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">🔄</div>
                    <div>
                        <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300">{t('wizard.conjugation.conjugation_title')}</h3>
                        <p className="text-xs text-purple-700 dark:text-purple-400">{t('wizard.conjugation.conjugation_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Verb Search */}
                <div className="relative z-20">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                        🔍 {t('wizard.conjugation.verb_search')}
                    </label>
                    <input
                        type="text"
                        value={verbQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={t('wizard.conjugation.verb_placeholder')}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    {/* Dropdown Results */}
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl">
                            {searchResults.map(verb => (
                                <button
                                    key={verb}
                                    onClick={() => handleSelectVerb(verb)}
                                    className="w-full text-left px-4 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm"
                                >
                                    {verb}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Tense Selection */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                        ⏳ {t('wizard.conjugation.tense_select')}
                    </label>
                    <select
                        value={selectedTense}
                        onChange={(e) => {
                            setSelectedTense(e.target.value);
                            setPreviewData(null); // Reset preview on tense change
                            setEditableItems([]);
                        }}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none capitalize"
                    >
                        {TENSES.map(tense => (
                            <option key={tense} value={tense}>{tense}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 3. Instruction & Question Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        📋 {t('wizard.instruction_label')}
                    </label>
                    <InstructionKeyPicker
                        activityType="ConjugationActivity"
                        subjectCode={subjectCode}
                        courseId={state.courseId}
                        selectedKey={state.instructionKey || 'activity.conjugation.instruction.generic'}
                        onSelect={(key) => updateState({ instructionKey: key })}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        ❓ {t('wizard.question_text_optional')}
                    </label>
                    <input
                        type="text"
                        value={state.questionTextKey || ''}
                        onChange={(e) => updateState({ questionTextKey: e.target.value })}
                        placeholder={t('wizard.question_text_placeholder')}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </div>
            </div>

            {/* 4. Action Button: Generate Preview */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleGeneratePreview}
                    disabled={!selectedVerb || isLoadingPreview}
                    className="px-6 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg font-semibold text-sm hover:bg-purple-200 transition-colors disabled:opacity-50"
                >
                    {isLoadingPreview ? '...' : t('wizard.conjugation.generate_preview')}
                </button>
            </div>


            {/* 5. Preview & Pronoun Selection */}
            {editableItems.length > 0 && (
                <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-purple-500">◉</span>
                            {selectedVerb} - <span className="capitalize">{selectedTense}</span>
                        </h4>
                        <span className="text-xs text-gray-500">
                            {t('wizard.conjugation.review_items_desc')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Singular */}
                        <div className="space-y-2">
                            <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                {t('wizard.singular')}
                            </h5>
                            {editableItems.slice(0, 5).map((item, index) => (
                                <div
                                    key={item.pronoun}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selectedPronouns[item.pronoun]
                                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 ring-1 ring-purple-500/20'
                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div
                                            className={`w-5 h-5 rounded flex items-center justify-center border cursor-pointer flex-shrink-0 ${selectedPronouns[item.pronoun]
                                                ? 'bg-purple-500 border-purple-500 text-white'
                                                : 'border-gray-400'
                                                }`}
                                            onClick={() =>
                                                setSelectedPronouns((prev) => ({
                                                    ...prev,
                                                    [item.pronoun]: !prev[item.pronoun],
                                                }))
                                            }
                                        >
                                            {selectedPronouns[item.pronoun] && <span className="text-xs">✓</span>}
                                        </div>
                                        <div className="flex items-center gap-2 font-mono text-sm w-full">
                                            <span className="text-purple-600 dark:text-purple-400 w-12 flex-shrink-0 font-semibold">
                                                {item.pronoun}
                                            </span>
                                            <input
                                                type="text"
                                                value={item.form}
                                                onChange={(e) => handleUpdateItem(index, e.target.value)}
                                                className="font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none w-full px-1"
                                                placeholder="..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right Column: Plural */}
                        <div className="space-y-2">
                            <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                {t('wizard.plural')}
                            </h5>
                            {editableItems.slice(5, 9).map((item, index) => {
                                const actualIndex = index + 5; // Offset for correct index
                                return (
                                    <div
                                        key={item.pronoun}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selectedPronouns[item.pronoun]
                                            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 ring-1 ring-purple-500/20'
                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div
                                                className={`w-5 h-5 rounded flex items-center justify-center border cursor-pointer flex-shrink-0 ${selectedPronouns[item.pronoun]
                                                    ? 'bg-purple-500 border-purple-500 text-white'
                                                    : 'border-gray-400'
                                                    }`}
                                                onClick={() =>
                                                    setSelectedPronouns((prev) => ({
                                                        ...prev,
                                                        [item.pronoun]: !prev[item.pronoun],
                                                    }))
                                                }
                                            >
                                                {selectedPronouns[item.pronoun] && <span className="text-xs">✓</span>}
                                            </div>
                                            <div className="flex items-center gap-2 font-mono text-sm w-full">
                                                <span className="text-purple-600 dark:text-purple-400 w-16 flex-shrink-0 font-semibold">
                                                    {item.pronoun}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={item.form}
                                                    onChange={(e) => handleUpdateItem(actualIndex, e.target.value)}
                                                    className="font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none w-full px-1"
                                                    placeholder="..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary Count */}
                    <div className="text-right text-xs text-gray-500 font-medium">
                        {t('wizard.activities_selected').replace('{count}', editableItems.filter((c) => selectedPronouns[c.pronoun]).length.toString())}
                    </div>
                </div>
            )}

            {/* 6. Main Submit Button (Bulk Create) */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-slate-800">
                <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <span className="text-lg">💾</span> {t('wizard.draft_hint')}
                </div>

                <button
                    type="button"
                    onClick={handleBulkCreate}
                    disabled={editableItems.length === 0 || creationProgress !== null}
                    className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                    {creationProgress ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>
                                {t('wizard.creation_progress').replace('{current}', creationProgress.current.toString()).replace('{total}', creationProgress.total.toString())}
                            </span>
                        </>
                    ) : (
                        <>
                            <span>{t('wizard.create_activities_btn')}</span>
                            {editableItems.length > 0 && (
                                <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                                    {editableItems.filter(c => selectedPronouns[c.pronoun]).length}
                                </span>
                            )}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
