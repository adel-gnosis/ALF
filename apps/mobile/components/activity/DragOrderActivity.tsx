import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';

interface DragOrderActivityProps {
    activity: any;
    onAnswer: (answer: number[]) => void;
    disabled?: boolean;
}

export default function DragOrderActivity({ activity, onAnswer, disabled }: DragOrderActivityProps) {
    // Extract words from activity data
    const words = activity?.data?.words || activity?.words || [];
    const [orderedWords, setOrderedWords] = useState<string[]>([...words]);

    console.log('[DragOrderActivity] Rendering:', { words, disabled });

    const moveUp = (index: number) => {
        if (index === 0 || disabled) return;
        const newOrder = [...orderedWords];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setOrderedWords(newOrder);
    };

    const moveDown = (index: number) => {
        if (index === orderedWords.length - 1 || disabled) return;
        const newOrder = [...orderedWords];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setOrderedWords(newOrder);
    };

    const handleSubmit = () => {
        if (disabled) return;
        // Map words to their original indices
        const order = orderedWords.map(word => words.indexOf(word));
        console.log('[DragOrderActivity] Submitting order:', order);
        onAnswer(order);
    };

    const questionText = activity?.question_text || 'Remettez les mots dans le bon ordre:';

    return (
        <View className="w-full">
            <Text className="text-lg font-semibold text-gray-800 mb-4">{questionText}</Text>

            <View className="mb-6">
                {orderedWords.map((word, index) => (
                    <View
                        key={`${word}-${index}`}
                        className="flex-row items-center bg-white rounded-xl p-4 mb-3 border-2 border-gray-200"
                    >
                        <View className="flex-row mr-3">
                            <TouchableOpacity
                                onPress={() => moveUp(index)}
                                disabled={index === 0 || disabled}
                                className={`p-2 ${index === 0 || disabled ? 'opacity-30' : ''}`}
                            >
                                <Ionicons name="arrow-up" size={20} color="#3B82F6" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => moveDown(index)}
                                disabled={index === orderedWords.length - 1 || disabled}
                                className={`p-2 ${index === orderedWords.length - 1 || disabled ? 'opacity-30' : ''}`}
                            >
                                <Ionicons name="arrow-down" size={20} color="#3B82F6" />
                            </TouchableOpacity>
                        </View>
                        <Text className="flex-1 text-lg font-semibold text-gray-800">{word}</Text>
                        <Text className="text-sm text-gray-500 ml-2">#{index + 1}</Text>
                    </View>
                ))}
            </View>

            <Button
                title="Vérifier"
                onPress={handleSubmit}
                disabled={disabled}
            />
        </View>
    );
}
