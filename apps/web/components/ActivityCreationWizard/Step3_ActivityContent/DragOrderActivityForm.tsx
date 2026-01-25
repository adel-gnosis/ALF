import { useMemo, useState } from 'react';
import { ActivityWizardState, useSubjects } from '@alf/shared';
import { useCreateActivity } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';

interface DragOrderActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
}

export default function DragOrderActivityForm({ state, updateState, onSuccess }: DragOrderActivityFormProps) {
    const { t, isRTL } = useI18n();
    const createActivity = useCreateActivity();
    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    const [rawText, setRawText] = useState('');

    const parsedItems = useMemo(() => {
        if (!rawText.trim()) return [];

        // Regex to find content inside [brackets] or space-separated words
        // [([^\]]+)] matches anything inside brackets
        // ([^\s\[\]]+) matches non-space, non-bracket characters
        const regex = /\[([^\]]+)\]|([^\s\[\]]+)/g;
        const items: string[] = [];
        let match;

        while ((match = regex.exec(rawText)) !== null) {
            if (match[1] !== undefined) {
                items.push(match[1].trim()); // Content inside brackets
            } else if (match[2] !== undefined) {
                items.push(match[2].trim()); // Standard word
            }
        }
        return items.filter(item => item.length > 0);
    }, [rawText]);

    const validateForm = (): boolean => {
        if (!rawText.trim()) {
            if (!rawText.trim()) {
                alert(t('wizard.validation.phrase_text_required'));
                return false;
            }
            return false;
        }

        if (parsedItems.length < 2) {
            if (parsedItems.length < 2) {
                alert(t('wizard.validation.at_least_two_items'));
                return false;
            }
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const instructionKey = state.instructionKey || 'activity.drag_order.instruction.generic';

        const payload = {
            activity_type: 'DragOrderActivity',
            lesson_id: state.lessonId!,
            instruction_key: instructionKey,
            question_text_key: state.questionTextKey,
            difficulty: state.difficulty,
            points: state.points,
            order: state.order,
            type_specific_data: {
                words: parsedItems,
                correct_order: parsedItems.map((_, index) => index) // Initial order is the correct one
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
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">🔢</div>
                    <div>
                        <div>
                            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300">{t('wizard.drag_order_title')}</h3>
                            <p className="text-xs text-purple-700 dark:text-purple-400">{t('wizard.drag_order_desc')}</p>
                        </div>
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
                        activityType="DragOrderActivity"
                        subjectCode={subjectCode}
                        courseId={state.courseId}
                        selectedKey={state.instructionKey || 'activity.drag_order.instruction.generic'}
                        onSelect={(key) => updateState({ instructionKey: key })}
                    />
                </div>

                {/* Question Text Key Selection */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                        ❓ {t('wizard.question_text_label')} (Optional)
                    </label>
                    <input
                        type="text"
                        value={state.questionTextKey || ''}
                        onChange={(e) => updateState({ questionTextKey: e.target.value })}
                        placeholder={t('wizard.question_text_placeholder')}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Main Content Input */}
            <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                    📝 {t('wizard.full_sentence_label')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder={t('wizard.drag_order_placeholder')}
                        rows={3}
                        className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        dir="ltr"
                    />
                    <div className={`absolute bottom-2 ${isRTL ? 'left-2' : 'right-2'} flex gap-2`}>
                        <div className={`absolute bottom-2 ${isRTL ? 'left-2' : 'right-2'} flex gap-2`}>
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase">{t('wizard.drag_order.grouping_label')}</span>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">{t('wizard.drag_order.split_label')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                        💡 {t('wizard.drag_order_hint_1')}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        ✨ {t('wizard.drag_order_hint_2')}
                    </p>
                </div>
            </div>

            {/* Preview Section */}
            {parsedItems.length > 0 && (
                <div className="bg-gray-50 dark:bg-slate-800/50 border border-dashed border-gray-300 dark:border-slate-700 p-4 rounded-xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">{t('wizard.preview_order')}</h4>
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{parsedItems.length} {t('wizard.items')}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2" dir="ltr">
                        {parsedItems.map((item, i) => (
                            <div key={i} className="group relative">
                                <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-900/50 rounded-lg text-gray-900 dark:text-white font-bold shadow-sm hover:border-purple-400 transition-colors">
                                    {item}
                                </div>
                                <div className="absolute -top-2 -left-2 w-4 h-4 bg-purple-600 text-white text-[8px] flex items-center justify-center rounded-full font-black shadow-sm">
                                    {i + 1}
                                </div>
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
                    className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
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
