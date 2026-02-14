import { View, Text, TextInput } from 'react-native';
import { useState } from 'react';

interface ConjugationActivityProps {
    activity: any;
    onAnswer: (answer: string) => void;
    disabled?: boolean;
    feedback?: 'success' | 'error' | null;
    correctAnswer?: any;
}

export default function ConjugationActivity({
    activity,
    onAnswer,
    disabled,
    feedback,
    correctAnswer
}: ConjugationActivityProps) {
    const [conjugation, setConjugation] = useState('');

    const verb = activity?.data?.verb_infinitive || activity?.verb_infinitive || '';
    const tense = activity?.data?.tense || activity?.tense || '';
    const pronoun = activity?.data?.pronoun || activity?.pronoun || '';
    const questionText = activity?.question_text || '';

    const getInputStyle = () => {
        const baseStyle = "bg-white border-2 rounded-xl p-4 text-lg";
        if (feedback === 'error') return `${baseStyle} border-red-500 bg-red-50`;
        if (feedback === 'success') return `${baseStyle} border-green-500 bg-green-50`;
        return `${baseStyle} border-gray-300`;
    };

    return (
        <View className="w-full">
            {!!activity?.instruction && (
                <Text className="text-sm font-medium text-gray-500 mb-1 italic">
                    {activity.instruction}
                </Text>
            )}

            {!!questionText && (
                <Text className="text-lg font-semibold text-gray-800 mb-4">
                    {questionText}
                </Text>
            )}

            <View className="bg-blue-50 rounded-xl p-4 mb-6">
                <View className="flex-row items-center mb-2">
                    <Text className="text-sm text-gray-600 mr-2">Verbe:</Text>
                    <Text className="text-lg font-bold text-blue-700">{verb}</Text>
                </View>
                <View className="flex-row items-center mb-2">
                    <Text className="text-sm text-gray-600 mr-2">Temps:</Text>
                    <Text className="text-md font-semibold text-gray-800">{tense}</Text>
                </View>
                <View className="flex-row items-center">
                    <Text className="text-sm text-gray-600 mr-2">Pronom:</Text>
                    <Text className="text-md font-semibold text-gray-800">{pronoun}</Text>
                </View>
            </View>

            <View className="mb-6">
                <Text className="text-sm text-gray-600 mb-2">Conjugaison:</Text>
                <TextInput
                    className={getInputStyle()}
                    placeholder="Entrez la conjugaison..."
                    value={conjugation}
                    onChangeText={(text) => {
                        setConjugation(text);
                        onAnswer(text.trim());
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!disabled}
                />
            </View>

            {feedback === 'error' && correctAnswer && (
                <View className="bg-green-100 p-4 rounded-xl border-2 border-green-500 mb-4">
                    <Text className="text-green-800 font-semibold mb-1">Réponse Correcte :</Text>
                    <Text className="text-xl font-bold text-green-900">{correctAnswer}</Text>
                </View>
            )}
        </View>
    );
}
