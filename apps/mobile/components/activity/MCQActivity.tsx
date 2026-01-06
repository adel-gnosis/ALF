import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';

interface MCQActivityProps {
    activity: any;
    onAnswer: (answer: number) => void;
    disabled?: boolean;
}

export default function MCQActivity({ activity, onAnswer, disabled, feedback, correctAnswer }: any) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleSelect = (index: number) => {
        if (disabled) return;
        setSelectedIndex(index);
        onAnswer(index);
    };

    // Safely extract data
    const choices = activity?.data?.choices || activity?.choices || [];
    const questionText = activity?.question_text || '';

    // Helper to determine styling
    const getButtonStyle = (index: number) => {
        let borderColor = 'border-gray-200';
        let bgColor = 'bg-white';

        if (selectedIndex === index) {
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
        if (feedback === 'error' && correctAnswer === choices[index]) {
            borderColor = 'border-green-500';
            bgColor = 'bg-green-50';
        }

        return `${borderColor} ${bgColor}`;
    };

    const getTextStyle = (index: number) => {
        if (selectedIndex === index) {
            if (feedback === 'success') return 'text-green-700 font-bold';
            if (feedback === 'error') return 'text-red-700 font-bold';
            return 'text-blue-700 font-bold';
        }
        // Correct answer text color if wrong
        if (feedback === 'error' && correctAnswer === choices[index]) {
            return 'text-green-700 font-bold';
        }
        return 'text-gray-800 font-semibold';
    };

    return (
        <View className="w-full">
            {questionText && (
                <Text className="text-lg font-semibold text-gray-800 mb-4">{questionText}</Text>
            )}
            {choices.map((choice: string, index: number) => (
                <TouchableOpacity
                    key={`${activity.id}-${index}`} // Force fresh keys for new activity
                    onPress={() => handleSelect(index)}
                    disabled={disabled}
                    className={`p-4 rounded-xl border-2 mb-3 ${getButtonStyle(index)}`}
                >
                    <Text className={getTextStyle(index)}>
                        {choice}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
