import { ActivityWizardState, useSubjects, useCreateActivity } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';
import { MediaPicker } from '../MediaPicker';
import { useMemo, useState } from 'react';
import { X, Image as ImageIcon, Type, Link } from 'lucide-react';

interface MatchingActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

interface MatchItem {
    type: 'text' | 'image';
    value: string;
}

interface Pair {
    left: MatchItem;
    right: MatchItem;
}

export default function MatchingActivityForm({ state, updateState, onSuccess }: MatchingActivityFormProps) {
    const { t, isRTL } = useI18n();
    const createActivity = useCreateActivity();
    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    // Media Picker State
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const [activePairIndex, setActivePairIndex] = useState<number | null>(null);
    const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);

    // Initial Pairs
    const [pairs, setPairs] = useState<Pair[]>([
        { left: { type: 'text', value: '' }, right: { type: 'text', value: '' } },
        { left: { type: 'text', value: '' }, right: { type: 'text', value: '' } },
        { left: { type: 'text', value: '' }, right: { type: 'text', value: '' } }
    ]);

    const addPair = () => {
        setPairs([...pairs, { left: { type: 'text', value: '' }, right: { type: 'text', value: '' } }]);
    };

    const removePair = (index: number) => {
        if (pairs.length <= 2) return;
        const newPairs = [...pairs];
        newPairs.splice(index, 1);
        setPairs(newPairs);
    };

    const updatePairValue = (index: number, side: 'left' | 'right', value: string) => {
        const newPairs = [...pairs];
        newPairs[index][side].value = value;
        setPairs(newPairs);
    };

    const toggleType = (index: number, side: 'left' | 'right') => {
        const newPairs = [...pairs];
        const currentType = newPairs[index][side].type;
        newPairs[index][side] = {
            type: currentType === 'text' ? 'image' : 'text',
            value: '' // Reset value when switching type
        };
        setPairs(newPairs);
    };

    const openMediaPicker = (index: number, side: 'left' | 'right') => {
        setActivePairIndex(index);
        setActiveSide(side);
        setMediaPickerOpen(true);
    };

    const handleMediaSelect = (url: string) => {
        if (activePairIndex !== null && activeSide) {
            updatePairValue(activePairIndex, activeSide, url);
        }
        setMediaPickerOpen(false);
    };

    const handleSubmit = async () => {
        // Validate
        const validPairs = pairs.filter(p => p.left.value.trim() && p.right.value.trim());
        if (validPairs.length < 2) {
            alert(t('wizard.validation.at_least_two_items'));
            return;
        }

        const instructionKey = state.instructionKey || 'activity.matching.instruction.generic';

        // Construct pairs_v2 payload
        const pairsV2 = validPairs.map((p, index) => ({
            id: `pair_${Date.now()}_${index}`,
            left: { type: p.left.type, value: p.left.value },
            right: { type: p.right.type, value: p.right.value }
        }));

        const payload = {
            activity_type: 'MatchingActivity',
            lesson_id: state.lessonId!,
            instruction_key: instructionKey,
            question_text_key: state.questionTextKey,
            difficulty: state.difficulty,
            points: state.points,
            order: state.order,
            type_specific_data: {
                pairs_v2: pairsV2
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
        <div className="max-w-4xl mx-auto space-y-6 text-left relative">
            {/* Media Picker Modal Overlay */}
            {mediaPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg">{t('wizard.media_picker_title')}</h3>
                            <button onClick={() => setMediaPickerOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <MediaPicker type="image" onSelect={handleMediaSelect} onClose={() => setMediaPickerOpen(false)} />
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">🧩</div>
                    <div>
                        <h3 className="text-sm font-bold text-cyan-900 dark:text-cyan-300">{t('wizard.matching.title')}</h3>
                        <p className="text-xs text-cyan-700 dark:text-cyan-400">{t('wizard.matching.desc')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        📋 {t('wizard.instruction_label')}
                    </label>
                    <InstructionKeyPicker
                        activityType="MatchingActivity"
                        subjectCode={subjectCode}
                        courseId={state.courseId}
                        selectedKey={state.instructionKey || 'activity.matching.instruction.generic'}
                        onSelect={(key) => updateState({ instructionKey: key })}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        ❓ {t('wizard.question_text_label')} (Optional)
                    </label>
                    <input
                        type="text"
                        value={state.questionTextKey || ''}
                        onChange={(e) => updateState({ questionTextKey: e.target.value })}
                        placeholder={t('wizard.question_text_placeholder')}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                </div>
            </div>

            {/* Pairs Grid */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        {t('wizard.matching.pairs_count').replace('{count}', pairs.length.toString())}
                    </label>
                </div>

                <div className="space-y-3">
                    {pairs.map((pair, index) => (
                        <div key={index} className="flex flex-col md:flex-row gap-4 items-center animate-in slide-in-from-left-4 duration-300 bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800" style={{ animationDelay: `${index * 50}ms` }}>

                            {/* LEFT ITEM */}
                            <div className="flex-1 w-full space-y-2">
                                {index === 0 && <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase text-center md:text-left">{t('wizard.matching.item_a')}</label>}

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleType(index, 'left')}
                                        className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                        title="Toggle Text/Image"
                                    >
                                        {pair.left.type === 'text' ? <Type className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                    </button>

                                    {pair.left.type === 'image' ? (
                                        <div
                                            onClick={() => openMediaPicker(index, 'left')}
                                            className="flex-1 h-10 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors relative overflow-hidden group"
                                        >
                                            {pair.left.value ? (
                                                <img src={pair.left.value} alt="Left Item" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-gray-400 flex items-center gap-1"><Link className="w-3 h-3" /> Select Image</span>
                                            )}
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={pair.left.value}
                                            onChange={(e) => updatePairValue(index, 'left', e.target.value)}
                                            placeholder="Item A..."
                                            className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                            dir="auto"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* SEPARATOR */}
                            <div className="text-gray-300 dark:text-slate-600 pt-0 md:pt-6">↔️</div>

                            {/* RIGHT ITEM */}
                            <div className="flex-1 w-full space-y-2">
                                {index === 0 && <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase text-center md:text-left">{t('wizard.matching.item_b')}</label>}

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleType(index, 'right')}
                                        className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                        title="Toggle Text/Image"
                                    >
                                        {pair.right.type === 'text' ? <Type className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                    </button>

                                    {pair.right.type === 'image' ? (
                                        <div
                                            onClick={() => openMediaPicker(index, 'right')}
                                            className="flex-1 h-10 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors relative overflow-hidden group"
                                        >
                                            {pair.right.value ? (
                                                <img src={pair.right.value} alt="Right Item" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-gray-400 flex items-center gap-1"><Link className="w-3 h-3" /> Select Image</span>
                                            )}
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={pair.right.value}
                                            onChange={(e) => updatePairValue(index, 'right', e.target.value)}
                                            placeholder="Item B..."
                                            className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            dir="auto"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="pt-0 md:pt-6">
                                <button
                                    onClick={() => removePair(index)}
                                    disabled={pairs.length <= 2}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 self-end"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addPair}
                    className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 hover:border-cyan-300 hover:text-cyan-600 dark:hover:border-cyan-800 transition-all flex items-center justify-center gap-2"
                >
                    <span className="text-base">+</span> {t('wizard.matching.add_pair')}
                </button>
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
                    className="px-8 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                    {createActivity.isPending ? t('wizard.creating') : t('wizard.create_btn')}
                </button>
            </div>
        </div>
    );
}
