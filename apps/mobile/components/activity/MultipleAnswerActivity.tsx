import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';

interface MultipleAnswerActivityProps {
    activity: any;
    onAnswer: (answer: number[]) => void;
    disabled?: boolean;
}

export default function MultipleAnswerActivity({ activity, onAnswer, disabled }: MultipleAnswerActivityProps) {
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    const choices = activity?.data?.choices || activity?.choices || [];
    const questionText = activity?.question_text || '';

    console.log('[MultipleAnswerActivity] Rendering:', { choices, disabled, selected: selectedIndices });

    const toggleChoice = (index: number) => {
        if (disabled) return;

        setSelectedIndices(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                return [...prev, index].sort((a, b) => a - b);
            }
        });
    };

    const handleSubmit = () => {
        if (disabled) return;
        console.log('[MultipleAnswerActivity] Submitting:', selectedIndices);
        onAnswer(selectedIndices);
    };

    return (
        <View className="w-full">
            <Text className="text-lg font-semibold text-gray-800 mb-2">{questionText}</Text>
            <Text className="text-sm text-blue-600 mb-4">Sélectionnez TOUTES les réponses correctes</Text>

            <View className="mb-6">
                {choices.map((choice: string, index: number) => {
                    const isSelected = selectedIndices.includes(index);
                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => toggleChoice(index)}
                            disabled={disabled}
                            className={`p-4 rounded-xl border-2 mb-3 flex-row items-center ${isSelected
                                    ? 'bg-blue-50 border-blue-500'
                                    : 'bg-white border-gray-200'
                                }`}
                        >
                            <View
                                className={`w-6 h-6 rounded mr-3 border-2 items-center justify-center ${isSelected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'bg-white border-gray-300'
                                    }`}
                            >
                                {isSelected && (
                                    <Ionicons name="checkmark" size={16} color="white" />
                                )}
                            </View>
                            <Text
                                className={`flex-1 font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-800'
                                    }`}
                            >
                                {choice}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Button
                title={`Vérifier${selectedIndices.length > 0 ? ` (${selectedIndices.length} sélectionné${selectedIndices.length > 1 ? 's' : ''})` : ''}`}
                onPress={handleSubmit}
                disabled={disabled || selectedIndices.length === 0}
            />
        </View>
    );
}
