export const ACTIVITY_CATEGORIES = {
    all: {
        label: 'Toutes les Activités',
        types: []  // Empty means all types
    },
    orthographe: {
        label: 'Orthographe',
        types: ['FillBlankActivity', 'TextInputActivity']
    },
    dictee: {
        label: 'Dictée',
        types: ['DicteeActivity']
    },
    grammaire: {
        label: 'Grammaire',
        types: ['MCQActivity', 'MultipleAnswerActivity']
    },
    vocabulaire: {
        label: 'Vocabulaire',
        types: ['MatchingActivity', 'DragOrderActivity']
    },
    conjugaison: {
        label: 'Conjugaison',
        types: ['ConjugationActivity']
    }
} as const;

export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES;
