'use client';

import React, { useState, useEffect } from 'react';
import { TeacherActivity, ACTIVITY_TYPE_INFO, ActivityType, useEditActivity, useLessons, useLevels, useSubjects, useSidebarNavigation } from '@alf/shared';
import { X, Save, Loader2, BookOpen, GraduationCap, Layers, FileText, Settings } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import InstructionKeyPicker from '../ActivityCreationWizard/InstructionKeyPicker';
import { getTypeEditor } from './typeEditors';

interface ActivityEditModalProps {
    activity: TeacherActivity | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    isSuggestion?: boolean;
}

// Activity type styles
const TYPE_STYLES: Record<string, { bg: string; text: string; icon: string; darkBg: string }> = {
    MCQActivity: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📝', darkBg: 'dark:bg-blue-900/40 dark:text-blue-300' },
    FillBlankActivity: { bg: 'bg-green-100', text: 'text-green-700', icon: '✏️', darkBg: 'dark:bg-green-900/40 dark:text-green-300' },
    MatchingActivity: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🔗', darkBg: 'dark:bg-purple-900/40 dark:text-purple-300' },
    DicteeActivity: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🎵', darkBg: 'dark:bg-orange-900/40 dark:text-orange-300' },
    DragOrderActivity: { bg: 'bg-teal-100', text: 'text-teal-700', icon: '🔢', darkBg: 'dark:bg-teal-900/40 dark:text-teal-300' },
    ConjugationActivity: { bg: 'bg-pink-100', text: 'text-pink-700', icon: '🔄', darkBg: 'dark:bg-pink-900/40 dark:text-pink-300' },
    MultipleAnswerActivity: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '📋', darkBg: 'dark:bg-indigo-900/40 dark:text-indigo-300' },
    TextInputActivity: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⌨️', darkBg: 'dark:bg-gray-800 dark:text-gray-300' },
};

const DIFFICULTIES = [
    { value: 'EASY', label: 'Easy', labelFr: 'Facile' },
    { value: 'MEDIUM', label: 'Medium', labelFr: 'Moyen' },
    { value: 'HARD', label: 'Hard', labelFr: 'Difficile' },
];

export default function ActivityEditModal({ activity, isOpen, onClose, onSuccess, isSuggestion }: ActivityEditModalProps) {
    const { t, locale } = useI18n();
    const editMutation = useEditActivity(activity?.id || 0);

    // Form state
    const [questionText, setQuestionText] = useState('');
    const [instructionKey, setInstructionKey] = useState('');
    const [difficulty, setDifficulty] = useState('MEDIUM');
    const [points, setPoints] = useState(10);
    const [lessonId, setLessonId] = useState<number | null>(null);
    const [versionNotes, setVersionNotes] = useState('');

    // Selected hierarchy for lesson picker
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

    // Fetch navigation data
    const { data: navData } = useSidebarNavigation();
    const { data: levels } = useLevels(selectedCourseId);
    const { data: subjects } = useSubjects(selectedCourseId);
    const { data: lessons } = useLessons(selectedSubjectId, selectedLevelId);

    // Type-specific data state (simplified for now)
    const [typeSpecificData, setTypeSpecificData] = useState<Record<string, any>>({});

    // Initialize form when activity changes
    useEffect(() => {
        if (activity && isOpen) {
            setQuestionText(activity.question_text || '');
            setInstructionKey(activity.instruction_key || '');
            setDifficulty(activity.difficulty || 'MEDIUM');
            setPoints(activity.points || 10);
            setLessonId(activity.lesson?.id || null);
            setTypeSpecificData(activity.type_specific_data || {});
            setVersionNotes('');
        }
    }, [activity, isOpen]);

    // Prepopulate course/level/subject when navData is available and activity has lesson
    useEffect(() => {
        if (!activity?.lesson || !navData || navData.length === 0) return;

        const lesson = activity.lesson;

        // Try to find the course containing a level or subject matching this lesson
        for (const course of navData) {
            // Check if this course has the matching level through subjects
            const matchingSubject = course.subjects?.find((s: any) =>
                s.title === lesson.subject || s.name === lesson.subject
            );

            if (matchingSubject) {
                setSelectedCourseId(course.id);
                setSelectedSubjectId(matchingSubject.id);

                // Try to find matching level in the course
                if (levels && levels.length > 0) {
                    const matchingLevel = levels.find((l: any) =>
                        l.title === lesson.level || l.name === lesson.level || l.code === lesson.level
                    );
                    if (matchingLevel) {
                        setSelectedLevelId(matchingLevel.id);
                    }
                }
                break;
            }
        }
    }, [activity, navData, levels]);

    const handleSave = async () => {
        if (!activity) return;

        // Build payload: only include fields the backend update serializer
        // actually declares. lesson_id is not updatable via this endpoint
        // (no field declared on ActivityUpdateSerializer). question_text was
        // removed from the model — the real paths are instruction_key and
        // question_text_key, both handled above.
        const payload: Record<string, any> = {
            instruction_key: instructionKey || undefined,
            difficulty,
            points,
            version_notes: versionNotes,
            type_specific_data: typeSpecificData,
            is_suggestion: isSuggestion,
        };

        // Only send question_text_key if the question textarea has content
        // (it maps to the i18n key, not raw text)
        if (questionText.trim()) {
            payload.question_text_key = questionText;
        }

        console.log('--- EXPLICIT DEBUG: Sending Activity Edit Payload ---');
        console.log('Target Activity ID:', activity.id);
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('----------------------------------------------------');

        try {
            await editMutation.mutateAsync(payload);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('--- EXPLICIT DEBUG: Activity Edit Failed ---');
            console.error('Error Status:', error.response?.status);
            console.error('Error Data:', error.response?.data);
            console.error('Error Headers:', error.response?.headers);
            console.error('Full Error Object:', error);
            console.error('-------------------------------------------');

            const errorMessage = typeof error.response?.data?.type_specific_data === 'string'
                ? error.response.data.type_specific_data
                : error.response?.data?.message || 'Failed to save changes';

            alert(`Edit failed: ${errorMessage}`);
        }
    };

    if (!isOpen || !activity) return null;

    const activityType = activity.activity_type as ActivityType;
    const typeStyle = TYPE_STYLES[activityType] || TYPE_STYLES.MCQActivity;
    const typeInfo = ACTIVITY_TYPE_INFO[activityType];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
                {/* Header */}
                <div className="p-4 md:p-6 border-b dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${typeStyle.bg} ${typeStyle.darkBg}`}>
                            <span className="text-xl">{typeStyle.icon}</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {isSuggestion ? t('admin.suggest_modification') : t('admin.edit_activity')}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs font-bold uppercase ${typeStyle.text} ${typeStyle.darkBg}`}>
                                    {typeInfo?.label || activityType?.replace('Activity', '') || 'Activity'}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                                    #{activity.id}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                    v{activity.version}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Metadata Section */}
                    <section>
                        <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5" />
                            {t('admin.metadata')}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Course */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                    {t('common.course')}
                                </label>
                                <select
                                    value={selectedCourseId || ''}
                                    onChange={(e) => {
                                        setSelectedCourseId(e.target.value ? Number(e.target.value) : null);
                                        setSelectedLevelId(null);
                                        setSelectedSubjectId(null);
                                    }}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="">{t('common.select')}</option>
                                    {navData?.map((course: any) => (
                                        <option key={course.id} value={course.id}>{course.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Level */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                    {t('common.level')}
                                </label>
                                <select
                                    value={selectedLevelId || ''}
                                    onChange={(e) => setSelectedLevelId(e.target.value ? Number(e.target.value) : null)}
                                    disabled={!selectedCourseId}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                                >
                                    <option value="">{t('common.select')}</option>
                                    {levels?.map((level: any) => (
                                        <option key={level.id} value={level.id}>{level.title || level.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                    {t('common.subject')}
                                </label>
                                <select
                                    value={selectedSubjectId || ''}
                                    onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)}
                                    disabled={!selectedCourseId}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                                >
                                    <option value="">{t('common.select')}</option>
                                    {subjects?.map((subject: any) => (
                                        <option key={subject.id} value={subject.id}>{subject.title || subject.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Lesson */}
                        <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                {t('common.lesson')}
                            </label>
                            <select
                                value={lessonId || ''}
                                onChange={(e) => setLessonId(e.target.value ? Number(e.target.value) : null)}
                                disabled={!selectedLevelId || !selectedSubjectId}
                                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                            >
                                <option value="">{t('common.select')}</option>
                                {(lessons as any)?.lessons?.map((lesson: any) => (
                                    <option key={lesson.id} value={lesson.id}>{lesson.title || lesson.name}</option>
                                ))}
                            </select>
                            {activity.lesson && (
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                    Current: {activity.lesson.title} ({activity.lesson.level} / {activity.lesson.subject})
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Instruction Key Section */}
                    <section>
                        <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            {t('admin.instruction')}
                        </h3>

                        <InstructionKeyPicker
                            activityType={activityType}
                            subjectCode={subjects?.find((s: any) => s.id === selectedSubjectId)?.code || null}
                            selectedKey={instructionKey}
                            onSelect={setInstructionKey}
                            courseId={selectedCourseId}
                        />
                    </section>

                    {/* Question Text Section */}
                    <section>
                        <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" />
                            {t('admin.question_text')}
                        </h3>

                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            rows={3}
                            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                            placeholder={t('admin.question_text_placeholder')}
                        />
                    </section>

                    {/* Settings Section */}
                    <section>
                        <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5" />
                            {t('admin.settings')}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Difficulty */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                    {t('common.difficulty')}
                                </label>
                                <select
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    {DIFFICULTIES.map(d => (
                                        <option key={d.value} value={d.value}>
                                            {locale === 'fr' ? d.labelFr : d.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Points */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                    {t('common.points')}
                                </label>
                                <input
                                    type="number"
                                    value={points}
                                    onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
                                    min={1}
                                    max={100}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Type-Specific Editor */}
                    <section>
                        <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5" />
                            {t('admin.type_specific_data')}
                        </h3>

                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
                            {(() => {
                                const Editor = getTypeEditor(activityType);
                                return <Editor
                                    data={typeSpecificData}
                                    onChange={setTypeSpecificData}
                                    locale={locale}
                                    activityType={activityType}
                                />;
                            })()}
                        </div>
                    </section>

                    {/* Version Notes */}
                    <section>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                            {t('admin.version_notes')} ({t('common.optional')})
                        </label>
                        <input
                            type="text"
                            value={versionNotes}
                            onChange={(e) => setVersionNotes(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder={t('admin.version_notes_placeholder')}
                        />
                    </section>
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t dark:border-slate-800 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={editMutation.isPending}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {editMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('common.saving')}
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isSuggestion ? t('admin.submit_suggestion') : t('common.save_changes')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}