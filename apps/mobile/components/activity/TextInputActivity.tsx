import { View, Text, TextInput } from 'react-native';
import { useState } from 'react';
import Button from '../Button';

interface TextInputActivityProps {
    activity: any;
    onAnswer: (answer: string) => void;
    disabled?: boolean;
    feedback?: 'success' | 'error' | null;
    correctAnswer?: any;
}

export default function TextInputActivity({ activity, onAnswer, disabled }: TextInputActivityProps) {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        if (disabled || !text.trim()) return;
        console.log('[TextInputActivity] Submitting answer:', text);
        onAnswer(text.trim());
    };

    const questionText = activity?.question_text || '';
    const multiline = activity?.data?.multiline || false;

    console.log('[TextInputActivity] Rendering:', { questionText, disabled, multiline });

    return (
        <View className="w-full">
            {activity?.instruction && (
                <Text className="text-sm font-medium text-gray-500 mb-1 italic">
                    {activity.instruction}
                </Text>
            )}
            {questionText && (
                <Text className="text-lg font-semibold text-gray-800 mb-4">{questionText}</Text>
            )}

            <View className="mb-6">
                <TextInput
                    className="bg-white border-2 border-gray-300 rounded-xl p-4 text-lg"
                    placeholder="Entrez votre réponse..."
                    value={text}
                    onChangeText={setText}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    autoCapitalize="none"
                    editable={!disabled}
                />
            </View>

            <Button
                title="Vérifier"
                onPress={handleSubmit}
                disabled={disabled || !text.trim()}
            />
        </View>
    );
}
