import { useMemo, useState, useEffect } from 'react';
import { ActivityWizardState, useSubjects } from '@alf/shared';
import { useCreateActivity } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import InstructionKeyPicker from '../InstructionKeyPicker';
import { MediaPickerModal } from '../MediaPickerModal';
import { Upload } from 'lucide-react';

interface Choice {
    id: string;
    content: {
        type: 'text' | 'image' | 'audio';
        value: string;
        i18n?: Record<string, string>;
    };
}

interface ChoiceActivityFormProps {
    state: ActivityWizardState;
    updateState: (updates: Partial<ActivityWizardState>) => void;
    onSuccess: () => void;
    multiple?: boolean;
}

export default function ChoiceActivityForm({ state, updateState, onSuccess, multiple = false }: ChoiceActivityFormProps) {
    const { t, isRTL } = useI18n();
    const createActivity = useCreateActivity();
    const { data: subjects } = useSubjects(state.courseId);

    const subjectCode = useMemo(() => {
        return subjects?.find(s => s.id === state.subjectId)?.code ?? null;
    }, [subjects, state.subjectId]);

    // Local state for choices
    const [choices, setChoices] = useState<Choice[]>([]);
    const [correctChoiceIds, setCorrectChoiceIds] = useState<string[]>([]);

    // Media Picker state
    const [mediaPickerConfig, setMediaPickerConfig] = useState<{
        isOpen: boolean;
        type: 'image' | 'audio';
        choiceId: string | null;
    }>({
        isOpen: false,
        type: 'image',
        choiceId: null
    });

    // Initialize if editing or switching
    useEffect(() => {
        const existingData = state.typeSpecificData || {};
        if (existingData.choices_v2) {
            setChoices(existingData.choices_v2);
        } else {
            // Default 3 choices for a better UX
            setChoices([
                { id: `c_${Math.random().toString(36).substr(2, 6)}`, content: { type: 'text', value: '' } },
                { id: `c_${Math.random().toString(36).substr(2, 6)}`, content: { type: 'text', value: '' } },
                { id: `c_${Math.random().toString(36).substr(2, 6)}`, content: { type: 'text', value: '' } }
            ]);
        }

        if (multiple) {
            setCorrectChoiceIds(existingData.correct_choice_ids || []);
        } else {
            setCorrectChoiceIds(existingData.correct_choice_id ? [existingData.correct_choice_id] : []);
        }
    }, [multiple]);

    const addChoice = () => {
        if (choices.length >= 10) return;
        const newId = `c_${Math.random().toString(36).substr(2, 6)}`;
        setChoices([...choices, { id: newId, content: { type: 'text', value: '' } }]);
    };

    const removeChoice = (id: string) => {
        if (choices.length <= 2) return;
        setChoices(choices.filter(c => c.id !== id));
        setCorrectChoiceIds(correctChoiceIds.filter(cid => cid !== id));
    };

    const updateChoice = (id: string, updates: Partial<Choice['content']>) => {
        setChoices(choices.map(c =>
            c.id === id ? { ...c, content: { ...c.content, ...updates } } : c
        ));
    };

    const toggleCorrect = (id: string) => {
        if (multiple) {
            if (correctChoiceIds.includes(id)) {
                setCorrectChoiceIds(correctChoiceIds.filter(cid => cid !== id));
            } else {
                setCorrectChoiceIds([...correctChoiceIds, id]);
            }
        } else {
            setCorrectChoiceIds([id]);
        }
    };

    const openMediaPicker = (
        choiceId: string,
        type: 'text' | 'image' | 'audio'
    ) => {
        if (type === 'text') return;

        setMediaPickerConfig({
            isOpen: true,
            type,
            choiceId
        });
    };


    const handleMediaSelect = (url: string) => {
        if (mediaPickerConfig.choiceId) {
            updateChoice(mediaPickerConfig.choiceId, { value: url });
        }
        setMediaPickerConfig(prev => ({ ...prev, isOpen: false }));
    };

    const validateForm = (): boolean => {
        if (choices.some(c => !c.content.value.trim())) {
            alert(t('wizard.validation.all_choices_required'));
            return false;
        }

        if (correctChoiceIds.length === 0) {
            alert(multiple
                ? t('wizard.validation.select_at_least_one_correct')
                : t('wizard.validation.select_correct_choice')
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const defaultInstruction = multiple
            ? 'activity.multiple_answer.instruction.generic'
            : 'activity.mcq.instruction.generic';

        const instructionKey = state.instructionKey || defaultInstruction;

        const payload = {
            activity_type: multiple ? 'MultipleAnswerActivity' : 'MCQActivity',
            lesson_id: state.lessonId!,
            instruction_key: instructionKey,
            question_text_key: state.questionTextKey,
            difficulty: state.difficulty,
            points: state.points,
            order: state.order,
            type_specific_data: {
                choices_v2: choices,
                ...(multiple
                    ? { correct_choice_ids: correctChoiceIds }
                    : { correct_choice_id: correctChoiceIds[0] })
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
            <div className={`p-4 rounded-xl border-2 transition-colors ${multiple
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-100 dark:border-amber-900/30'
                : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-100 dark:border-blue-900/30'
                }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${multiple ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                        {multiple ? '📋' : '📝'}
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-tight ${multiple ? 'text-amber-900 dark:text-amber-400' : 'text-blue-900 dark:text-blue-400'
                            }`}>
                            {multiple ? t('wizard.multiple_answer_title') : t('wizard.mcq_title')}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-slate-400 font-medium">
                            {multiple ? t('wizard.multiple_answer_desc') : t('wizard.mcq_desc')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        📋 {t('wizard.instruction_label')}
                    </label>
                    <InstructionKeyPicker
                        activityType={multiple ? 'MultipleAnswerActivity' : 'MCQActivity'}
                        subjectCode={subjectCode}
                        courseId={state.courseId}
                        selectedKey={state.instructionKey || (multiple ? 'activity.multiple_answer.instruction.generic' : 'activity.mcq.instruction.generic')}
                        onSelect={(key) => updateState({ instructionKey: key })}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        ❓ {t('wizard.question_text_label')} (Optional)
                    </label>
                    <input
                        type="text"
                        value={state.questionTextKey || ''}
                        onChange={(e) => updateState({ questionTextKey: e.target.value })}
                        placeholder={t('wizard.question_text_placeholder')}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        ✨ {t('wizard.choices_label')}
                    </label>
                    <span className="text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 px-2 py-0.5 rounded-full">
                        {choices.length}/10
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {choices.map((choice, index) => {
                        const isCorrect = correctChoiceIds.includes(choice.id);
                        return (
                            <div key={choice.id} className={`group relative flex gap-3 items-start p-4 rounded-2xl border-2 transition-all ${isCorrect
                                ? 'bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-900/50'
                                : 'bg-white dark:bg-slate-800/40 border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'
                                }`}>
                                {/* Correct Selection Indicator */}
                                <button
                                    type="button"
                                    onClick={() => toggleCorrect(choice.id)}
                                    className={`mt-1.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isCorrect
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                        : 'bg-gray-100 dark:bg-slate-700 text-transparent group-hover:text-gray-300'
                                        }`}
                                >
                                    <span className="text-lg">✓</span>
                                </button>

                                <div className="flex-1 space-y-3">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {/* Type Selector Pills */}
                                        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-800">
                                            {['text', 'image', 'audio'].map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => updateChoice(choice.id, { type: type as any })}
                                                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${choice.content.type === type
                                                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                                        : 'text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-400'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex-1 min-w-[200px] flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={choice.content.value}
                                                onChange={(e) => updateChoice(choice.id, { value: e.target.value })}
                                                placeholder={
                                                    choice.content.type === 'text'
                                                        ? t('wizard.choice_text_placeholder')
                                                        : t('wizard.choice_url_placeholder')
                                                }
                                                className="flex-1 bg-transparent border-none px-1 py-1 text-sm font-medium focus:ring-0 outline-none text-gray-900 dark:text-white"
                                                dir="ltr"
                                            />
                                            {choice.content.type !== 'text' && (
                                                <button
                                                    type="button"
                                                    onClick={() => openMediaPicker(choice.id, choice.content.type)}
                                                    className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                    title={t('wizard.pick_from_library')}
                                                >
                                                    <Upload className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rich Preview Section */}
                                    {choice.content.value && choice.content.type !== 'text' && (
                                        <div className="relative mt-2 p-2 bg-gray-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                                            {choice.content.type === 'image' ? (
                                                <div className="flex justify-center">
                                                    <img
                                                        src={choice.content.value}
                                                        alt="Preview"
                                                        className="h-24 max-w-full rounded-lg object-contain shadow-sm"
                                                        onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="px-2">
                                                    <audio src={choice.content.value} controls className="h-10 w-full" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => removeChoice(choice.id)}
                                        disabled={choices.length <= 2}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all disabled:opacity-0"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={addChoice}
                    disabled={choices.length >= 10}
                    className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 hover:bg-gray-50/80 dark:hover:bg-slate-800/40 hover:border-blue-200 dark:hover:border-blue-900/30 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                >
                    <span className="text-lg">+</span> {t('wizard.add_choice')}
                </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-200 dark:border-slate-800 gap-4">
                <div className="text-[11px] text-gray-500 dark:text-slate-400 font-bold flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
                    <span className="text-base">💾</span> {t('wizard.draft_hint')}
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createActivity.isPending}
                    className={`w-full sm:w-auto px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 ${multiple
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-orange-500/20'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/20'
                        }`}
                >
                    {createActivity.isPending ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t('wizard.creating')}
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            {t('wizard.create_btn')}
                        </>
                    )}
                </button>
            </div>

            <MediaPickerModal
                isOpen={mediaPickerConfig.isOpen}
                type={mediaPickerConfig.type}
                onClose={() => setMediaPickerConfig(prev => ({ ...prev, isOpen: false }))}
                onSelect={handleMediaSelect}
            />

            <button id="wizard-submit-btn" type="button" onClick={handleSubmit} className="hidden" />
        </div>
    );
}
