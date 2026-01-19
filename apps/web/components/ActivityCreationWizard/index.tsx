import { useState } from 'react';
import { ActivityWizardState, Difficulty } from '@alf/shared';
import Step1_ContextSelector from './Step1_ContextSelector';
import Step2_TargetSelector from './Step2_TargetSelector';
import Step3_Settings from './Step3_Settings';
import Step4_ActivityContent from './Step3_ActivityContent';
import { useI18n } from '../../context/I18nContext';

interface ActivityCreationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ActivityCreationWizard({
    isOpen,
    onClose,
    onSuccess
}: ActivityCreationWizardProps) {
    const { t, isRTL } = useI18n();
    const [wizardState, setWizardState] = useState<ActivityWizardState>({
        // Step 1: Course, Level
        courseId: null,
        levelId: null,

        // Step 2: Subject, Lesson
        subjectId: null,
        lessonId: null,

        // Step 3: Type & Configuration
        activityType: null,
        difficulty: Difficulty.MEDIUM,
        points: 10,
        order: 0,

        // Step 4: Specific Content
        instructionKey: '',
        questionTextKey: '',
        explanationKey: '',
        translationData: {},
        typeSpecificData: {},

        // Meta
        currentStep: 1,
        validationErrors: {}
    });

    const updateState = (updates: Partial<ActivityWizardState>) => {
        setWizardState(prev => ({ ...prev, ...updates }));
    };

    type WizardStep = ActivityWizardState['currentStep'];

    const goToStep = (step: WizardStep) => {
        setWizardState(prev => ({
            ...prev,
            currentStep: step
        }));
    };


    const validateStep1 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!wizardState.courseId) errors.courseId = t('wizard.validation.select_course');
        if (!wizardState.levelId) errors.levelId = t('wizard.validation.select_level');
        setWizardState(prev => ({ ...prev, validationErrors: errors }));
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!wizardState.subjectId) errors.subjectId = t('wizard.validation.select_subject');
        if (!wizardState.lessonId) errors.lessonId = t('wizard.validation.select_lesson');
        setWizardState(prev => ({ ...prev, validationErrors: errors }));
        return Object.keys(errors).length === 0;
    };

    const validateStep3 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!wizardState.activityType) errors.activityType = t('wizard.validation.select_type');
        setWizardState(prev => ({ ...prev, validationErrors: errors }));
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (wizardState.currentStep === 1) {
            if (validateStep1()) goToStep(2);
        } else if (wizardState.currentStep === 2) {
            if (validateStep2()) goToStep(3);
        } else if (wizardState.currentStep === 3) {
            if (validateStep3()) goToStep(4);
        }
    };

    const handleBack = () => {
        if (wizardState.currentStep === 2) goToStep(1);
        if (wizardState.currentStep === 3) goToStep(2);
        if (wizardState.currentStep === 4) goToStep(3);
    };


    const handleReset = () => {
        setWizardState({
            courseId: null,
            levelId: null,
            subjectId: null,
            lessonId: null,
            activityType: null,
            difficulty: Difficulty.MEDIUM,
            points: 10,
            order: 0,
            instructionKey: '',
            questionTextKey: '',
            explanationKey: '',
            translationData: {},
            typeSpecificData: {},
            currentStep: 1,
            validationErrors: {}
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-8 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-full max-h-[700px] flex flex-col relative dark:bg-slate-900 border dark:border-slate-800 transition-all overflow-hidden font-sans">
                {/* Condensed Header & Stepper */}
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-5 py-3 z-10">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-4 shrink-0">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="text-xl">📚</span> {t('wizard.title')}
                                <span className="text-[10px] uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">v2</span>
                            </h2>
                            <div className="h-4 w-[1px] bg-gray-200 dark:bg-slate-700 hidden sm:block" />
                            <p className="text-xs text-gray-500 dark:text-slate-400 hidden sm:block max-w-[150px] truncate">
                                {wizardState.currentStep === 1 && t('wizard.step1_title')}
                                {wizardState.currentStep === 2 && t('wizard.step2_title')}
                                {wizardState.currentStep === 3 && t('wizard.step3_title')}
                                {wizardState.currentStep === 4 && t('wizard.step4_title')}
                            </p>
                        </div>

                        {/* Integrated Progress Stepper */}
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {[1, 2, 3, 4].map((step) => (
                                <div key={step} className="flex items-center gap-2">
                                    <div className={`
                                        w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold transition-all
                                        ${wizardState.currentStep === step
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-600/20'
                                            : wizardState.currentStep > step
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
                                        }
                                    `}>
                                        {wizardState.currentStep > step ? '✓' : step}
                                    </div>
                                    {step < 4 && (
                                        <div className={`
                                            w-6 md:w-12 h-[2px] rounded-full
                                            ${wizardState.currentStep > step ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-800'}
                                        `} />
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Step Content Area - Now controlled by steps for internal scrolling */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-6">
                    {wizardState.currentStep === 1 && (
                        <Step1_ContextSelector
                            state={wizardState}
                            updateState={updateState}
                        />
                    )}

                    {wizardState.currentStep === 2 && (
                        <Step2_TargetSelector
                            state={wizardState}
                            updateState={updateState}
                        />
                    )}

                    {wizardState.currentStep === 3 && (
                        <Step3_Settings
                            state={wizardState}
                            updateState={updateState}
                        />
                    )}

                    {wizardState.currentStep === 4 && (
                        <Step4_ActivityContent
                            state={wizardState}
                            updateState={updateState}
                            onSuccess={() => {
                                onSuccess?.();
                                handleReset();
                                onClose();
                            }}
                        />
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="sticky bottom-0 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-t dark:border-slate-800 px-5 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={wizardState.currentStep === 1 ? onClose : handleBack}
                            className="px-4 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                            {wizardState.currentStep === 1 ? t('wizard.cancel') : `${isRTL ? '→' : '←'} ${t('wizard.back')}`}
                        </button>
                        {wizardState.currentStep > 1 && (
                            <span className="text-[10px] text-gray-400 italic">Progress saved</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {wizardState.currentStep < 4 && (
                            <button
                                onClick={handleNext}
                                className="px-5 py-1.5 text-xs font-bold bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                            >
                                {t('wizard.next')} {isRTL ? '←' : '→'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
