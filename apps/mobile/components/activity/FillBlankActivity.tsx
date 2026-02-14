import { View, Text, TextInput } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FillBlankActivityProps {
    activity: any;
    onAnswer: (answer: string) => void;
    disabled?: boolean;
    feedback?: 'success' | 'error' | null;
    correctAnswer?: any;
}

export default function FillBlankActivity({
    activity,
    onAnswer,
    disabled,
    feedback,
    correctAnswer,
}: FillBlankActivityProps) {
    const { t } = useTranslation();
    const [text, setText] = useState('');

    // Debug: log when feedback/correctAnswer change
    console.log('[FillBlankActivity] feedback:', feedback, 'correctAnswer:', correctAnswer);

    const handleChange = (val: string) => {
        setText(val);
        if (!disabled) {
            onAnswer(val);
        }
    };

    /**
     * 1️⃣ Instruction (always comes from question_text)
     * This is what gets translated via question_text_key
     */
    const instruction = activity?.question_text || '';

    /**
     * 2️⃣ Phrase (new field)
     * Fallback to old question_text ONLY if it contains blanks
     */
    const rawPhrase =
        activity?.phrase ||
        (typeof activity?.question_text === 'string' &&
            activity.question_text.includes('___')
            ? activity.question_text
            : '');

    /**
     * Safety: avoid crashing UI if data is malformed
     */
    if (!rawPhrase) {
        return (
            <View className="w-full items-center">
                {!!instruction && (
                    <Text className="text-base text-gray-600 font-semibold mb-4 text-center">
                        {instruction}
                    </Text>
                )}
                <Text className="text-sm text-gray-400">
                    {t('activities.fillBlank.missingPhrase')}
                </Text>
            </View>
        );
    }

    const parts = rawPhrase.split('___');

    return (
        <View className="w-full items-center">
            {activity?.instruction && (
                <Text className="text-sm font-medium text-gray-500 mb-1 italic text-center">
                    {activity.instruction}
                </Text>
            )}
            {/* Instruction (Specific text or legacy instruction) */}
            {!!instruction && (
                <Text className="text-base text-gray-600 font-semibold mb-4 text-center">
                    {instruction}
                </Text>
            )}

            {/* Phrase with blank */}
            <View className="flex-row flex-wrap items-center justify-center mb-8">
                <Text key="part-0" className="text-xl font-bold text-gray-800">
                    {parts[0]}
                </Text>

                <View key="blank-container" className="bg-gray-100 px-4 py-2 rounded-lg border-b-2 border-blue-500 mx-1 min-w-[100px]">
                    <TextInput
                        className="text-xl font-bold text-center text-blue-600 p-0"
                        placeholder={t('activities.fillBlank.placeholder')}
                        value={text}
                        onChangeText={handleChange}
                        autoCapitalize="none"
                        editable={!disabled}
                    />
                </View>

                {parts[1] && (
                    <Text key="part-1" className="text-xl font-bold text-gray-800">
                        {parts[1]}
                    </Text>
                )}
            </View>

            {feedback === 'error' && correctAnswer && (
                <View className="bg-green-100 p-4 rounded-xl border-2 border-green-500 mb-4 w-full">
                    <Text className="text-green-800 font-semibold mb-1 text-center">Réponse Correcte :</Text>
                    <Text className="text-xl font-bold text-green-900 text-center">
                        {typeof correctAnswer === 'string' ? correctAnswer : JSON.stringify(correctAnswer)}
                    </Text>
                </View>
            )}
        </View>
    );
}
