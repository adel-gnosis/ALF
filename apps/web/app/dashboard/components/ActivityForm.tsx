import { useCreateActivity, useEditActivity, TeacherActivity, useDicteeTTS, API_BASE_URL } from '@alf/shared';
import { useI18n } from '../../../context/I18nContext';
import { useEffect, useState } from 'react';

interface ActivityFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    editActivity?: TeacherActivity;
    isSuggestion?: boolean;
}

const ACTIVITY_TYPES = [
    { value: 'MCQActivity', label: 'QCM (Choix Multiple)' },
    { value: 'FillBlankActivity', label: 'Remplir le Blanc' },
    { value: 'MatchingActivity', label: 'Association de Paires' },
    { value: 'DragOrderActivity', label: 'Ordonner les Mots' },
    { value: 'ConjugationActivity', label: 'Conjugaison' },
    { value: 'MultipleAnswerActivity', label: 'Réponses Multiples' },
    { value: 'TextInputActivity', label: 'Saisie de Texte' },
    { value: 'DicteeActivity', label: 'Dictée' },
];

const DIFFICULTIES = [
    { value: 'EASY', label: 'Facile' },
    { value: 'MEDIUM', label: 'Moyen' },
    { value: 'HARD', label: 'Difficile' },
];

export default function ActivityForm({ isOpen, onClose, onSuccess, editActivity, isSuggestion }: ActivityFormProps) {
    const createActivity = useCreateActivity();
    const editActivityMutation = useEditActivity(editActivity?.id || 0);

    const [activityType, setActivityType] = useState('');
    const [lessonId, setLessonId] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [explanation, setExplanation] = useState('');
    const [difficulty, setDifficulty] = useState('MEDIUM');
    const [points, setPoints] = useState(10);
    const [versionNotes, setVersionNotes] = useState('');

    // MCQ & MultipleAnswer fields
    const [choices, setChoices] = useState(['', '', '', '']);
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
    const [correctIndices, setCorrectIndices] = useState<number[]>([0]);

    // FillBlank fields
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [phrase, setPhrase] = useState('');
    const [phraseKey, setPhraseKey] = useState('');

    // Matching fields
    const [pairs, setPairs] = useState<Record<string, string>>({});
    const [pairKey, setPairKey] = useState('');
    const [pairValue, setPairValue] = useState('');

    // DragOrder fields
    const [words, setWords] = useState<string[]>(['']);

    // Conjugation fields
    const [verbInfinitive, setVerbInfinitive] = useState('');
    const [tense, setTense] = useState('');
    const [pronoun, setPronoun] = useState('');
    const [correctConjugation, setCorrectConjugation] = useState('');

    // TextInput fields
    const [correctAnswers, setCorrectAnswers] = useState<string[]>(['']);
    const [caseSensitive, setCaseSensitive] = useState(false);

    // Dictee fields
    const [correctText, setCorrectText] = useState('');
    const [audioUrls, setAudioUrls] = useState<string[]>(['']);
    const [createdDicteeId, setCreatedDicteeId] = useState<number | null>(null);

    const { t } = useI18n();
    const mediaBaseUrl = API_BASE_URL.replace(/\/api$/, '');

    // TTS states
    const [selectedVoices, setSelectedVoices] = useState<string[]>(['male']);
    const [selectedSpeeds, setSelectedSpeeds] = useState<string[]>(['1.0']);

    const { triggerTTS, isGenerating, error: ttsError, isTimeout, setIsTimeout, generatedUrls } = useDicteeTTS(
        editActivity?.id || createdDicteeId || 0,
        editActivity && 'audio_urls' in editActivity.type_specific_data
            ? editActivity.type_specific_data.audio_urls.length
            : 0
    );

    // Pre-fill form when editActivity is provided
    useEffect(() => {
        if (editActivity && isOpen) {
            setActivityType(editActivity.activity_type);
            setLessonId(editActivity.lesson.id.toString());
            setQuestionText(editActivity.question_text);
            setExplanation(editActivity.explanation || '');
            setDifficulty(editActivity.difficulty);
            setPoints(editActivity.points);
            setVersionNotes('');

            // Type-specific data
            const data = (editActivity as any);
            if (editActivity.activity_type === 'MCQActivity') {
                setChoices(data.choices || ['', '', '', '']);
                setCorrectAnswerIndex(data.correct_answer_index || 0);
            } else if (editActivity.activity_type === 'FillBlankActivity') {
                setCorrectAnswer(data.correct_answer || '');
                setPhrase(data.phrase || '');
                setPhraseKey(data.phrase_key || '');
            } else if (editActivity.activity_type === 'MatchingActivity') {
                setPairs(data.pairs || {});
            } else if (editActivity.activity_type === 'DragOrderActivity') {
                setWords(data.words || ['']);
            } else if (editActivity.activity_type === 'ConjugationActivity') {
                setVerbInfinitive(data.verb_infinitive || '');
                setTense(data.tense || '');
                setPronoun(data.pronoun || '');
                setCorrectConjugation(data.correct_conjugation || '');
            } else if (editActivity.activity_type === 'MultipleAnswerActivity') {
                setChoices(data.choices || ['', '', '', '']);
                setCorrectIndices(data.correct_indices || [0]);
            } else if (editActivity.activity_type === 'TextInputActivity') {
                setCorrectAnswers(data.correct_answers || ['']);
                setCaseSensitive(data.case_sensitive || false);
            } else if (editActivity.activity_type === 'DicteeActivity') {
                setCorrectText(data.correct_text || '');
                setAudioUrls(data.audio_urls || ['']);
                setCaseSensitive(data.case_sensitive || false);
            }
        } else if (!editActivity && isOpen) {
            resetForm();
        }
    }, [editActivity, isOpen]);

    const resetForm = () => {
        setActivityType('');
        setLessonId('');
        setQuestionText('');
        setExplanation('');
        setDifficulty('MEDIUM');
        setPoints(10);
        setVersionNotes('');
        setChoices(['', '', '', '']);
        setCorrectAnswerIndex(0);
        setCorrectIndices([0]);
        setCorrectAnswer('');
        setPhrase('');
        setPhraseKey('');
        setPairs({});
        setPairKey('');
        setPairValue('');
        setWords(['']);
        setVerbInfinitive('');
        setTense('');
        setPronoun('');
        setCorrectConjugation('');
        setCorrectAnswers(['']);
        setCaseSensitive(false);
        setCorrectText('');
        setAudioUrls(['']);
        setCreatedDicteeId(null);
    };

    const saveActivity = async () => {
        const isDictee = activityType === 'DicteeActivity';
        if (!activityType || !lessonId || (!questionText && !isDictee)) {
            alert('Veuillez remplir tous les champs obligatoires');
            return null;
        }

        const typeSpecificData: any = {};

        switch (activityType) {
            case 'MCQActivity':
                if (choices.filter(c => c.trim()).length < 2) {
                    alert('Vous devez fournir au moins 2 choix');
                    return null;
                }
                typeSpecificData.choices = choices.filter(c => c.trim());
                typeSpecificData.correct_answer_index = correctAnswerIndex;
                break;

            case 'FillBlankActivity':
                if (!correctAnswer.trim()) {
                    alert('Veuillez fournir la réponse correcte');
                    return null;
                }
                typeSpecificData.correct_answer = correctAnswer;
                typeSpecificData.phrase = phrase;
                typeSpecificData.phrase_key = phraseKey;
                break;

            case 'MatchingActivity':
                if (Object.keys(pairs).length < 2) {
                    alert('Vous devez fournir au moins 2 paires');
                    return null;
                }
                typeSpecificData.pairs = pairs;
                break;

            case 'DragOrderActivity':
                const filteredWords = words.filter(w => w.trim());
                if (filteredWords.length < 2) {
                    alert('Vous devez fournir au moins 2 mots');
                    return null;
                }
                typeSpecificData.words = filteredWords;
                typeSpecificData.correct_order = filteredWords.map((_, i) => i);
                break;

            case 'ConjugationActivity':
                if (!verbInfinitive || !tense || !pronoun || !correctConjugation) {
                    alert('Tous les champs de conjugaison sont obligatoires');
                    return null;
                }
                typeSpecificData.verb_infinitive = verbInfinitive;
                typeSpecificData.tense = tense;
                typeSpecificData.pronoun = pronoun;
                typeSpecificData.correct_conjugation = correctConjugation;
                break;

            case 'MultipleAnswerActivity':
                if (choices.filter(c => c.trim()).length < 2) {
                    alert('Vous devez fournir au moins 2 choix');
                    return null;
                }
                if (correctIndices.length === 0) {
                    alert('Sélectionnez au moins une réponse correcte');
                    return null;
                }
                typeSpecificData.choices = choices.filter(c => c.trim());
                typeSpecificData.correct_indices = correctIndices;
                break;

            case 'TextInputActivity':
                const filteredAnswers = correctAnswers.filter(a => a.trim());
                if (filteredAnswers.length === 0) {
                    alert('Fournissez au moins une réponse correcte');
                    return null;
                }
                typeSpecificData.correct_answers = filteredAnswers;
                typeSpecificData.case_sensitive = caseSensitive;
                break;

            case 'DicteeActivity':
                if (!correctText.trim()) {
                    alert('Fournissez le texte correct de la dictée');
                    return null;
                }
                typeSpecificData.correct_text = correctText;
                typeSpecificData.audio_urls = audioUrls.filter(u => u.trim());
                typeSpecificData.case_sensitive = caseSensitive;
                break;
        }

        try {
            if (editActivity) {
                const response = await editActivityMutation.mutateAsync({
                    activity_type: activityType,
                    lesson_id: parseInt(lessonId),
                    question_text: questionText,
                    instruction_key: isDictee && !questionText ? 'activity.dictee.instruction.generic' : undefined,
                    explanation,
                    difficulty,
                    points,
                    version_notes: versionNotes,
                    type_specific_data: typeSpecificData,
                });
                alert(response.message || 'Activité mise à jour avec succès !');
                return response;
            } else {
                const response = await createActivity.mutateAsync({
                    activity_type: activityType,
                    lesson_id: parseInt(lessonId),
                    question_text: questionText,
                    instruction_key: isDictee && !questionText ? 'activity.dictee.instruction.generic' : undefined,
                    explanation,
                    difficulty,
                    points,
                    type_specific_data: typeSpecificData,
                });
                alert('Activité créée avec succès !');
                if (activityType === 'DicteeActivity') {
                    setCreatedDicteeId(response.id);
                }
                return response;
            }
        } catch (error: any) {
            console.error('Save Activity Error:', error.response?.data);
            const errorData = error.response?.data;
            let errorMessage = 'Impossible de sauvegarder l\'activité';

            if (errorData) {
                if (typeof errorData === 'string') errorMessage = errorData;
                else if (errorData.message) errorMessage = errorData.message;
                else if (errorData.detail) errorMessage = errorData.detail;
                else {
                    // Handle DRF field errors
                    const fields = Object.keys(errorData);
                    if (fields.length > 0) {
                        errorMessage = fields.map(f => {
                            const fieldErrors = errorData[f];
                            if (Array.isArray(fieldErrors)) {
                                return `${f}: ${fieldErrors.join(', ')}`;
                            }
                            return `${f}: ${fieldErrors}`;
                        }).join(' | ');
                    }
                }
            }

            alert(`Erreur: ${errorMessage}`);
            throw error;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const response = await saveActivity();
        if (response) {
            resetForm();
            onSuccess?.();
            onClose();
        }
    };

    const handleGenerateTTS = async () => {
        let currentId = editActivity?.id || createdDicteeId;

        // If not created yet, create it first
        if (!currentId) {
            try {
                const response = await saveActivity();
                if (response?.id) {
                    currentId = response.id;
                    // We don't close/reset here because we want to see generation
                }
            } catch (err) {
                // Error already handled
                return;
            }
        }

        if (currentId) {
            triggerTTS(selectedVoices, selectedSpeeds, currentId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isSuggestion ? 'Suggérer une Modification' : editActivity ? 'Éditer l\'Activité' : 'Créer une Activité'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Suggestion Info Banner */}
                    {isSuggestion && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                            <div className="flex">
                                <div className="shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        Vous suggérez une modification pour une activité créée par un autre enseignant.
                                        Votre version sera soumise à la validation d'un administrateur avant publication.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Type & Lesson */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type d'Activité <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={activityType}
                                onChange={(e) => setActivityType(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
                                required
                                disabled={!!editActivity}
                            >
                                <option value="">Sélectionner...</option>
                                {ACTIVITY_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                            {editActivity && <p className="text-[10px] text-gray-400 mt-0.5">Le type ne peut pas être modifié</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ID de la Leçon <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={lessonId}
                                onChange={(e) => setLessonId(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                placeholder="Ex: 5"
                                required
                            />
                        </div>
                    </div>

                    {/* Common Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question / Instruction <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            rows={3}
                            placeholder="Ex: Quel est le verbe conjugué?"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Explication (optionnelle)
                        </label>
                        <textarea
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                            rows={2}
                            placeholder="Explication de la réponse correcte"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulté</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2"
                            >
                                {DIFFICULTIES.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                            <input
                                type="number"
                                value={points}
                                onChange={(e) => setPoints(parseInt(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                min="1"
                                max="100"
                            />
                        </div>
                    </div>

                    {/* Type-Specific Fields */}
                    {activityType === 'MCQActivity' && (
                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-3">Choix de Réponses</h3>
                            {choices.map((choice, i) => (
                                <div key={i} className="flex items-center gap-2 mb-2">
                                    <input
                                        type="radio"
                                        name="correct"
                                        checked={correctAnswerIndex === i}
                                        onChange={() => setCorrectAnswerIndex(i)}
                                        title="Marquer comme réponse correcte"
                                    />
                                    <input
                                        type="text"
                                        value={choice}
                                        onChange={(e) => {
                                            const newChoices = [...choices];
                                            newChoices[i] = e.target.value;
                                            setChoices(newChoices);
                                        }}
                                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                                        placeholder={`Choix ${i + 1}`}
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setChoices([...choices, ''])}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                + Ajouter un choix
                            </button>
                        </div>
                    )}

                    {activityType === 'FillBlankActivity' && (
                        <div className="border-t pt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Réponse Correcte <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={correctAnswer}
                                    onChange={(e) => setCorrectAnswer(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    placeholder="Ex: suis"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Mot ou phrase que l'étudiant doit taper</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phrase avec blancs (optionnel)
                                </label>
                                <textarea
                                    value={phrase}
                                    onChange={(e) => setPhrase(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    rows={2}
                                    placeholder="Ex: Je ___ à l'école. (Utilisez ___ pour les blancs)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Clé i18n de la phrase (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={phraseKey}
                                    onChange={(e) => setPhraseKey(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    placeholder="Ex: phrases.school_go"
                                />
                            </div>
                        </div>
                    )}

                    {activityType === 'MatchingActivity' && (
                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-3">Paires à Associer</h3>
                            <div className="space-y-2 mb-3">
                                {Object.entries(pairs).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                        <span className="flex-1 text-sm">{key} → {value}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newPairs = { ...pairs };
                                                delete newPairs[key];
                                                setPairs(newPairs);
                                            }}
                                            className="text-red-600 text-sm"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={pairKey}
                                    onChange={(e) => setPairKey(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                                    placeholder="Clé (ex: le chat)"
                                />
                                <input
                                    type="text"
                                    value={pairValue}
                                    onChange={(e) => setPairValue(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                                    placeholder="Valeur (ex: cat)"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (pairKey && pairValue) {
                                            setPairs({ ...pairs, [pairKey]: pairValue });
                                            setPairKey('');
                                            setPairValue('');
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </div>
                    )}

                    {activityType === 'DragOrderActivity' && (
                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-3">Mots à Ordonner</h3>
                            {words.map((word, i) => (
                                <div key={i} className="flex items-center gap-2 mb-2">
                                    <span className="text-gray-500">{i + 1}.</span>
                                    <input
                                        type="text"
                                        value={word}
                                        onChange={(e) => {
                                            const newWords = [...words];
                                            newWords[i] = e.target.value;
                                            setWords(newWords);
                                        }}
                                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                                        placeholder={`Mot ${i + 1}`}
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setWords([...words, ''])}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                + Ajouter un mot
                            </button>
                            <p className="text-xs text-gray-500 mt-2">L'ordre actuel est l'ordre correct</p>
                        </div>
                    )}

                    {activityType === 'ConjugationActivity' && (
                        <div className="border-t pt-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Verbe (infinitif) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={verbInfinitive}
                                        onChange={(e) => setVerbInfinitive(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                        placeholder="Ex: être"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Temps <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={tense}
                                        onChange={(e) => setTense(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                        placeholder="Ex: présent"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Pronom <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={pronoun}
                                        onChange={(e) => setPronoun(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                        placeholder="Ex: je"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Conjugaison Correcte <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={correctConjugation}
                                        onChange={(e) => setCorrectConjugation(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                        placeholder="Ex: suis"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activityType === 'MultipleAnswerActivity' && (
                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-3">Choix (sélection multiple)</h3>
                            {choices.map((choice, i) => (
                                <div key={i} className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={correctIndices.includes(i)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setCorrectIndices([...correctIndices, i]);
                                            } else {
                                                setCorrectIndices(correctIndices.filter(idx => idx !== i));
                                            }
                                        }}
                                        title="Marquer comme réponse correcte"
                                    />
                                    <input
                                        type="text"
                                        value={choice}
                                        onChange={(e) => {
                                            const newChoices = [...choices];
                                            newChoices[i] = e.target.value;
                                            setChoices(newChoices);
                                        }}
                                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                                        placeholder={`Choix ${i + 1}`}
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setChoices([...choices, ''])}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                + Ajouter un choix
                            </button>
                        </div>
                    )}

                    {activityType === 'TextInputActivity' && (
                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-3">Réponses Acceptées</h3>
                            {correctAnswers.map((answer, i) => (
                                <input
                                    key={i}
                                    type="text"
                                    value={answer}
                                    onChange={(e) => {
                                        const newAnswers = [...correctAnswers];
                                        newAnswers[i] = e.target.value;
                                        setCorrectAnswers(newAnswers);
                                    }}
                                    className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                                    placeholder={`Réponse ${i + 1}`}
                                />
                            ))}
                            <button
                                type="button"
                                onClick={() => setCorrectAnswers([...correctAnswers, ''])}
                                className="text-sm text-blue-600 hover:text-blue-800 mb-3"
                            >
                                + Ajouter une variante
                            </button>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={caseSensitive}
                                    onChange={(e) => setCaseSensitive(e.target.checked)}
                                    id="caseSensitive"
                                    className="mr-2"
                                />
                                <label htmlFor="caseSensitive" className="text-sm text-gray-700">
                                    Sensible à la casse
                                </label>
                            </div>
                        </div>
                    )}

                    {activityType === 'DicteeActivity' && (
                        <div className="border-t pt-4 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Texte Correct <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={correctText}
                                    onChange={(e) => setCorrectText(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    placeholder="Ex: Je suis un étudiant"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    URLs Audio (optionnel)
                                </label>
                                {audioUrls.map((url, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        value={url}
                                        onChange={(e) => {
                                            const newUrls = [...audioUrls];
                                            newUrls[i] = e.target.value;
                                            setAudioUrls(newUrls);
                                        }}
                                        className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                                        placeholder="/media/audio/phrase.mp3"
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setAudioUrls([...audioUrls, ''])}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    + Ajouter un fichier audio
                                </button>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={caseSensitive}
                                    onChange={(e) => setCaseSensitive(e.target.checked)}
                                    id="caseDict"
                                    className="mr-2"
                                />
                                <label htmlFor="caseDict" className="text-sm text-gray-700">
                                    Sensible à la casse
                                </label>
                            </div>

                            {/* TTS Generation Section (visible on edit or after/during creation) */}
                            {(editActivity || activityType === 'DicteeActivity') && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-3">
                                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                                        ✨ {t('wizard.generate_audio_btn')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">{t('wizard.tts_voices_label')}</label>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVoices.includes('male')}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedVoices([...selectedVoices, 'male']);
                                                            else setSelectedVoices(selectedVoices.filter(v => v !== 'male'));
                                                        }}
                                                        className="rounded border-blue-300"
                                                    /> {t('wizard.tts_male')}
                                                </label>
                                                <label className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVoices.includes('female')}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedVoices([...selectedVoices, 'female']);
                                                            else setSelectedVoices(selectedVoices.filter(v => v !== 'female'));
                                                        }}
                                                        className="rounded border-blue-300"
                                                    /> {t('wizard.tts_female')}
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">{t('wizard.tts_speeds_label')}</label>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSpeeds.includes('0.9')}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedSpeeds([...selectedSpeeds, '0.9']);
                                                            else setSelectedSpeeds(selectedSpeeds.filter(s => s !== '0.9'));
                                                        }}
                                                        className="rounded border-blue-300"
                                                    /> {t('wizard.tts_slow')}
                                                </label>
                                                <label className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSpeeds.includes('1.0')}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedSpeeds([...selectedSpeeds, '1.0']);
                                                            else setSelectedSpeeds(selectedSpeeds.filter(s => s !== '1.0'));
                                                        }}
                                                        className="rounded border-blue-300"
                                                    /> {t('wizard.tts_normal')}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleGenerateTTS}
                                            disabled={isGenerating || createActivity.isPending || selectedVoices.length === 0 || selectedSpeeds.length === 0}
                                            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            {isGenerating || createActivity.isPending ? (
                                                <>
                                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    {t('wizard.generating_audio')}
                                                </>
                                            ) : t('wizard.generate_audio_btn')}
                                        </button>
                                        {isTimeout && (
                                            <span className="text-[10px] leading-tight text-yellow-600 dark:text-yellow-400 font-medium max-w-[200px]">
                                                {t('wizard.tts_timeout')}
                                            </span>
                                        )}
                                    </div>
                                    {ttsError && (
                                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">{ttsError}</p>
                                    )}
                                </div>
                            )}

                            {/* Render generated audios if any */}
                            {(() => {
                                const manualUrls = audioUrls.filter(u => u.trim());
                                const allUrls = Array.from(new Set([...manualUrls, ...generatedUrls]));
                                if (allUrls.length === 0) return null;

                                return (
                                    <div className="space-y-3 pt-2">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            🎧 Aperçu des audios
                                        </label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {allUrls.map((url, i) => {
                                                const fullUrl = url.startsWith('http') ? url : `${mediaBaseUrl}${url}`;
                                                // Extract voice/speed from filename for label
                                                const voiceMatch = url.match(/male|female/i);
                                                const speedMatch = url.match(/x(\d\.\d)/i);
                                                const voiceLabel = voiceMatch ? (voiceMatch[0].toLowerCase() === 'male' ? t('wizard.tts_male') : t('wizard.tts_female')) : 'Audio';
                                                const speedLabel = speedMatch ? speedMatch[1] + 'x' : '1.0x';
                                                const label = `${voiceLabel} - ${speedLabel}`;

                                                return (
                                                    <div key={i} className="flex flex-col gap-1 p-2 bg-gray-50 dark:bg-slate-800/50 rounded border border-gray-100 dark:border-slate-800 shadow-sm">
                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">{label}</span>
                                                        <audio src={fullUrl} controls className="h-8 w-full" />
                                                        <span className="text-[9px] text-gray-400 truncate font-mono">{url}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Version Notes */}
                    {editActivity && (
                        <div className="border-t pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes de Version / Raison du changement <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={versionNotes}
                                onChange={(e) => setVersionNotes(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                rows={2}
                                placeholder={isSuggestion ? "Expliquez pourquoi vous suggérez cette modification..." : "Qu'est-ce qui a changé dans cette version?"}
                                required
                            />
                        </div>
                    )}

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={createActivity.isPending || editActivityMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createActivity.isPending || editActivityMutation.isPending
                                ? 'Enregistrement...'
                                : isSuggestion
                                    ? 'Suggérer la Modification'
                                    : editActivity
                                        ? 'Enregistrer les Changements'
                                        : 'Créer l\'Activité'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}