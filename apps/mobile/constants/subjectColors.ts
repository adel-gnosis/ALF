// Subject theme colors matching backend seed data
export const SUBJECT_COLORS = {
    GRAMMAR: '#3B82F6',      // Blue
    CONJUGATION: '#10B981',  // Green
    VOCABULARY: '#F59E0B',   // Orange
    SPELLING: '#EF4444',     // Red
    COMPREHENSION: '#8B5CF6', // Purple
} as const;

export const SUBJECT_COLORS_BY_TITLE = {
    'Grammaire': '#3B82F6',
    'Conjugaison': '#10B981',
    'Vocabulaire / Lexique': '#F59E0B',
    'Orthographe': '#EF4444',
    'Compréhension': '#8B5CF6',
} as const;

export function getSubjectColor(subjectTitle: string): string {
    return SUBJECT_COLORS_BY_TITLE[subjectTitle as keyof typeof SUBJECT_COLORS_BY_TITLE] || '#6B7280';
}
