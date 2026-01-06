import { View, Text, TextInput } from 'react-native';
import { useState } from 'react';

interface FillBlankActivityProps {
    activity: any;
    onAnswer: (answer: string) => void;
    disabled?: boolean;
}

export default function FillBlankActivity({ activity, onAnswer, disabled }: FillBlankActivityProps) {
    const [text, setText] = useState('');

    const handleChange = (val: string) => {
        setText(val);
        // Auto-submit on change for immediate feedback
        if (!disabled) {
            onAnswer(val);
        }
    };

    // Extract question text and split by blank marker
    const questionText = activity?.question_text || '';
    const parts = questionText.split('___');

    return (
        <View className="w-full items-center">
            <View className="flex-row flex-wrap items-center justify-center mb-8">
                <Text className="text-xl font-bold text-gray-800">{parts[0]}</Text>
                <View className="bg-gray-100 px-4 py-2 rounded-lg border-b-2 border-blue-500 mx-1 min-w-[100px]">
                    <TextInput
                        className="text-xl font-bold text-center text-blue-600 p-0"
                        placeholder="?"
                        value={text}
                        onChangeText={handleChange}
                        autoCapitalize="none"
                        editable={!disabled}
                    />
                </View>
                {parts[1] && <Text className="text-xl font-bold text-gray-800">{parts[1]}</Text>}
            </View>
        </View>
    );
}
