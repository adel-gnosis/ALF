/**
 * Activity Creation Wizard Types
 */

import { Difficulty } from './console';

export interface Course {
    id: number;
    code: string;
    title: string;
    course_type: 'LANGUAGE' | 'MATH' | 'SCIENCE' | 'OTHER';
    description: string;
    target_language: string;
    source_language: string | null;
    icon: string;
    color: string;
    flag_icon: string;
    source_flag_icon: string;
    order: number;
}

export interface Level {
    id: number;
    code: string;
    title: string;
    description: string;
    order: number;
    image_url: string | null;
    course: number;  // Course ID only (not full object)
}

export interface Subject {
    id: number;
    code: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    order: number;
    course: number;  // Course ID only (not full object)
    // New fields from updated model
    kind: 'KNOWLEDGE' | 'SKILL';
    is_active: boolean;
    title_key: string;
    description_key: string;
}

export interface Lesson {
    id: number;
    title: string;
    description: string;
    order: number;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    level: {
        id: number;
        code: string;
        title: string;
        course_id: number;
        course_title: string;
    };
    subject: {
        id: number;
        code: string;
        title: string;
        icon: string;
        color: string;
    };
    created_by_username: string | null;
}

export interface I18nKey {
    key: string;
    label_en: string;
    label_fr: string;
    label_ar: string;
}

export type ActivityType =
    | 'MCQActivity'
    | 'FillBlankActivity'
    | 'MatchingActivity'
    | 'DragOrderActivity'
    | 'ConjugationActivity'
    | 'MultipleAnswerActivity'
    | 'TextInputActivity'
    | 'DicteeActivity';

// Re-export Difficulty from console types to avoid duplication
export type { Difficulty } from './console';

export interface ActivityWizardState {
    // Step 1: Context
    courseId: number | null;
    levelId: number | null;
    subjectId: number | null;
    lessonId: number | null;
    activityType: ActivityType | null;

    // Step 2: Common settings
    difficulty: Difficulty;
    points: number;
    order: number;

    // Step 3: Activity-specific data
    instructionKey: string;
    questionTextKey: string;
    explanationKey: string;
    translationData: Record<string, any>;
    typeSpecificData: Record<string, any>;

    // Metadata
    currentStep: 1 | 2 | 3 | 4;
    validationErrors: Record<string, string>;
}

// Subject to Activity Type Mapping
export const SUBJECT_ACTIVITY_MAPPING: Record<string, ActivityType[]> = {
    'DICTEE': ['DicteeActivity'],
    'CONJUGAISON': [
        'ConjugationActivity',
        'MCQActivity',
        'FillBlankActivity',
        'MultipleAnswerActivity'
    ],
    'GRAMMAIRE': [
        'MCQActivity',
        'FillBlankActivity',
        'DragOrderActivity',
        'TextInputActivity',
        'MultipleAnswerActivity'
    ],
    'VOCABULAIRE': [
        'MCQActivity',
        'MatchingActivity',
        'MultipleAnswerActivity',
        'TextInputActivity'
    ],
    'COMPREHENSION': [
        'MCQActivity',
        'MultipleAnswerActivity',
        'TextInputActivity'
    ]
};

// Activity Type Metadata
export const ACTIVITY_TYPE_INFO: Record<ActivityType, {
    label: string;
    icon: string;
    description: string;
    complexity: 'simple' | 'advanced';
}> = {
    'DicteeActivity': {
        label: 'Dictée',
        icon: '🎵',
        description: 'Écouter et écrire',
        complexity: 'simple'
    },
    'FillBlankActivity': {
        label: 'Remplir le Blanc',
        icon: '✏️',
        description: 'Compléter une phrase',
        complexity: 'simple'
    },
    'ConjugationActivity': {
        label: 'Conjugaison',
        icon: '🔄',
        description: 'Conjuguer un verbe',
        complexity: 'simple'
    },
    'TextInputActivity': {
        label: 'Saisie de Texte',
        icon: '⌨️',
        description: 'Réponse libre',
        complexity: 'simple'
    },
    'DragOrderActivity': {
        label: 'Ordonner les Mots',
        icon: '🔢',
        description: 'Arranger dans l\'ordre',
        complexity: 'simple'
    },
    'MCQActivity': {
        label: 'QCM',
        icon: '📝',
        description: 'Choix multiple',
        complexity: 'advanced'
    },
    'MatchingActivity': {
        label: 'Association',
        icon: '🔗',
        description: 'Associer les paires',
        complexity: 'advanced'
    },
    'MultipleAnswerActivity': {
        label: 'Réponses Multiples',
        icon: '📋',
        description: 'Plusieurs bonnes réponses',
        complexity: 'advanced'
    }
};