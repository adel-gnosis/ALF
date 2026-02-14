import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';
import { resolveMediaUrl } from "../../services/api";

interface MultipleAnswerActivityProps {
    activity: any;
    onAnswer: (answer: any) => void;
    disabled?: boolean;
    feedback?: 'success' | 'error' | null;
    correctAnswer?: any;
}

export default function MultipleAnswerActivity({ activity, onAnswer, disabled, feedback, correctAnswer }: MultipleAnswerActivityProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const choices = activity?.choices_v2 || [];
    const questionText = activity?.question_text || '';

    const toggleChoice = (id: string) => {
        if (disabled) return;

        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            } else {
                return [...prev, id].sort();
            }
        });
    };

    const handleSubmit = () => {
        if (disabled) return;
        onAnswer({ choice_ids: selectedIds });
    };

    const correctChoiceIds = correctAnswer?.format === 'v2' ? (correctAnswer.choice_ids || []) : [];

    const renderChoiceContent = (choice: any, textColor: string) => {
        const type = choice.content?.type || 'text';
        const value = choice.content?.value || choice.rendered_value || '';

        if (type === 'image') {
            const imageUrl = resolveMediaUrl(value);
            return (
                <View className="flex-1">
                    {imageUrl && (
                        <View className="w-full h-32 rounded-lg bg-gray-50 items-center justify-center overflow-hidden mb-1">
                            <Image
                                source={{ uri: imageUrl }}
                                className="w-full h-full"
                                resizeMode="contain"
                            />
                        </View>
                    )}
                    {/* Keep label if available, or just image */}
                </View>
            );
        }

        return (
            <Text
                className={`flex-1 font-semibold ${textColor}`}
            >
                {choice.rendered_value || value}
            </Text>
        );
    }

    return (
        <View className="w-full">
            {activity?.instruction && (
                <Text className="text-sm font-medium text-gray-500 mb-1 italic">
                    {activity.instruction}
                </Text>
            )}
            <Text className="text-lg font-semibold text-gray-800 mb-2">{questionText}</Text>

            <View className="mb-6">
                {choices.map((choice: any) => {
                    const isSelected = selectedIds.includes(choice.id);
                    const isCorrect = correctChoiceIds.includes(choice.id);

                    let borderColor = 'border-gray-200';
                    let bgColor = 'bg-white';
                    let textColor = 'text-gray-800';
                    let checkboxBg = 'bg-white border-gray-300';

                    if (isSelected) {
                        borderColor = 'border-blue-500';
                        bgColor = 'bg-blue-50';
                        textColor = 'text-blue-700';
                        checkboxBg = 'bg-blue-500 border-blue-500';

                        if (feedback === 'success') {
                            borderColor = 'border-green-500';
                            bgColor = 'bg-green-100';
                            textColor = 'text-green-700';
                            checkboxBg = 'bg-green-500 border-green-500';
                        } else if (feedback === 'error') {
                            if (isCorrect) {
                                borderColor = 'border-green-500';
                                bgColor = 'bg-green-100';
                                textColor = 'text-green-700';
                            } else {
                                borderColor = 'border-red-500';
                                bgColor = 'bg-red-100';
                                textColor = 'text-red-700';
                                checkboxBg = 'bg-red-500 border-red-500';
                            }
                        }
                    } else if (feedback === 'error' && isCorrect) {
                        // Highlight should-have-been-selected
                        borderColor = 'border-green-500';
                        bgColor = 'bg-green-50';
                        textColor = 'text-green-700';
                    }

                    return (
                        <TouchableOpacity
                            key={choice.id}
                            onPress={() => toggleChoice(choice.id)}
                            disabled={disabled}
                            className={`p-4 rounded-xl border-2 mb-3 flex-row items-center ${borderColor} ${bgColor}`}
                        >
                            <View
                                className={`w-6 h-6 rounded mr-3 border-2 items-center justify-center ${checkboxBg}`}
                            >
                                {isSelected && (
                                    <Ionicons key="check-selected" name="checkmark" size={16} color="white" />
                                )}
                                {!isSelected && feedback === 'error' && isCorrect && (
                                    <Ionicons key="check-correct" name="checkmark" size={16} color="#10B981" />
                                )}
                            </View>
                            {renderChoiceContent(choice, textColor)}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {!feedback && (
                <Button
                    title={`Vérifier${selectedIds.length > 0 ? ` (${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''})` : ''}`}
                    onPress={handleSubmit}
                    disabled={disabled || selectedIds.length === 0}
                />
            )}
        </View>
    );
}
