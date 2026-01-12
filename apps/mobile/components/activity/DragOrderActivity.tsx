import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';

interface DragOrderActivityProps {
    activity: any;
    onAnswer: (answer: string[]) => void;
    disabled?: boolean;
}


function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}


export default function DragOrderActivity({ activity, onAnswer, disabled }: DragOrderActivityProps) {
    // Extract words from activity data
    const words: string[] = activity?.data?.words || activity?.words || [];

    const [orderedWords, setOrderedWords] = useState<string[]>(
        shuffleArray(words)
    );


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

        // Backend expects the ordered WORDS, not indices
        console.log('[DragOrderActivity] Submitting order:', orderedWords);
        onAnswer(orderedWords);
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
