import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';

interface MCQActivityProps {
    activity: any;
    onAnswer: (answer: number) => void;
    disabled?: boolean;
}

export default function MCQActivity({ activity, onAnswer, disabled, feedback, correctAnswer }: any) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Safely extract data
    const choices = activity?.choices_v2 || [];
    const questionText = activity?.question_text || '';

    const handleSelect = (choiceId: string) => {
        if (disabled) return;
        setSelectedId(choiceId);
        onAnswer({ choice_id: choiceId });
    };

    // Helper to determine styling
    const getButtonStyle = (choice: any) => {
        let borderColor = 'border-gray-200';
        let bgColor = 'bg-white';

        if (selectedId === choice.id) {
            borderColor = 'border-blue-500';
            bgColor = 'bg-blue-50';

            if (feedback === 'success') {
                borderColor = 'border-green-500';
                bgColor = 'bg-green-100';
            } else if (feedback === 'error') {
                borderColor = 'border-red-500';
                bgColor = 'bg-red-100';
            }
        }

        // Highlight correct answer if wrong
        // correctAnswer format from backend (v2): { format: 'v2', choice_id: '...' }
        const correctChoiceId = correctAnswer?.format === 'v2' ? correctAnswer.choice_id : null;
        if (feedback === 'error' && correctChoiceId === choice.id) {
            borderColor = 'border-green-500';
            bgColor = 'bg-green-50';
        }

        return `${borderColor} ${bgColor}`;
    };

    const getTextStyle = (choice: any) => {
        const correctChoiceId = correctAnswer?.format === 'v2' ? correctAnswer.choice_id : null;
        if (selectedId === choice.id) {
            if (feedback === 'success') return 'text-green-700 font-bold';
            if (feedback === 'error') return 'text-red-700 font-bold';
            return 'text-blue-700 font-bold';
        }
        // Correct answer text color if wrong
        if (feedback === 'error' && correctChoiceId === choice.id) {
            return 'text-green-700 font-bold';
        }
        return 'text-gray-800 font-semibold';
    };

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
            {choices.map((choice: any) => (
                <TouchableOpacity
                    key={choice.id}
                    onPress={() => handleSelect(choice.id)}
                    disabled={disabled}
                    className={`p-4 rounded-xl border-2 mb-3 ${getButtonStyle(choice)}`}
                >
                    <Text className={getTextStyle(choice)}>
                        {choice.rendered_value}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
