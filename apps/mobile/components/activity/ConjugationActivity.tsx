import { View, Text, TextInput } from 'react-native';
import { useState } from 'react';
import Button from '../Button';

interface ConjugationActivityProps {
    activity: any;
    onAnswer: (answer: string) => void;
    disabled?: boolean;
}

export default function ConjugationActivity({ activity, onAnswer, disabled }: ConjugationActivityProps) {
    const [conjugation, setConjugation] = useState('');

    const handleSubmit = () => {
        if (disabled || !conjugation.trim()) return;
        console.log('[ConjugationActivity] Submitting answer:', conjugation);
        onAnswer(conjugation.trim());
    };

    // Extract data from activity
    const verb = activity?.data?.verb_infinitive || activity?.verb_infinitive || '';
    const tense = activity?.data?.tense || activity?.tense || '';
    const pronoun = activity?.data?.pronoun || activity?.pronoun || '';

    console.log('[ConjugationActivity] Rendering:', { verb, tense, pronoun, disabled });

    return (
        <View className="w-full">
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
                    className="bg-white border-2 border-gray-300 rounded-xl p-4 text-lg"
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
        </View>
    );
}
