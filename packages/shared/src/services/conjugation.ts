import api from './api';

export interface ConjugationRequest {
    verb: string;
    tense: string;
}

export interface ConjugationResult {
    verb: string;
    tense: string;
    conjugations: {
        pronoun: string;
        form: string;
    }[];
}

// Tense mapping: Frontend Label -> Verbecc Path
// Verbecc uses HYPHENS in tense names, not spaces
const TENSE_MAPPING: Record<string, { mood: string, tense: string }> = {
    'présent': { mood: 'indicatif', tense: 'présent' },
    'imparfait': { mood: 'indicatif', tense: 'imparfait' },
    'passé simple': { mood: 'indicatif', tense: 'passé-simple' },
    'futur': { mood: 'indicatif', tense: 'futur-simple' },
    'passé composé': { mood: 'indicatif', tense: 'passé-composé' },
    'plus-que-parfait': { mood: 'indicatif', tense: 'plus-que-parfait' },
    'futur antérieur': { mood: 'indicatif', tense: 'futur-antérieur' },
    'passé antérieur': { mood: 'indicatif', tense: 'passé-antérieur' },
    'conditionnel présent': { mood: 'conditionnel', tense: 'présent' },
    'conditionnel passé': { mood: 'conditionnel', tense: 'passé' },
    'subjonctif présent': { mood: 'subjonctif', tense: 'présent' },
    'subjonctif imparfait': { mood: 'subjonctif', tense: 'imparfait' },
    'subjonctif passé': { mood: 'subjonctif', tense: 'passé' },
    'subjonctif plus-que-parfait': { mood: 'subjonctif', tense: 'plus-que-parfait' },
    'impératif présent': { mood: 'imperatif', tense: 'imperatif-présent' },
    'impératif passé': { mood: 'imperatif', tense: 'imperatif-passé' },
};

const PRONOUNS = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'];

export const ConjugationService = {
    resolve: async ({ verb, tense }: ConjugationRequest): Promise<ConjugationResult> => {
        const mapping = TENSE_MAPPING[tense.toLowerCase()];
        if (!mapping) {
            throw new Error(`Unsupported tense: ${tense}`);
        }

        try {
            // Call Django Backend (verbecc)
            const response = await api.get(`/tools/conjugation/`, {
                params: { verb },
            });

            const verbeccData = response.data;

            // --- Map Verbecc to UI format ---
            const moodData = verbeccData.moods?.[mapping.mood];
            if (!moodData) {
                throw new Error(`Mood '${mapping.mood}' not found`);
            }

            const tenseForms = moodData[mapping.tense];
            if (!tenseForms || !Array.isArray(tenseForms)) {
                throw new Error(`Tense '${mapping.tense}' not found in mood '${mapping.mood}'`);
            }

            const conjugations = PRONOUNS.map((pronoun, index) => {
                // TypeScript guard: tenseForms is guaranteed to be defined by the check above
                const rawForm = tenseForms![index] ?? '—';

                // Backend now returns ONLY the conjugated verb (no pronoun)
                // e.g., "vais", "irai", "allons"
                let conjugatedForm = '—';
                if (typeof rawForm === 'string') {
                    conjugatedForm = rawForm;
                } else if (rawForm) {
                    conjugatedForm = String(rawForm);
                }

                return {
                    pronoun: pronoun,
                    form: conjugatedForm  // Just the verb, no pronoun
                };
            });

            return {
                verb,
                tense,
                conjugations
            };

        } catch (error) {
            console.error('[ConjugationService] Error:', error);
            throw error;
        }
    }
};