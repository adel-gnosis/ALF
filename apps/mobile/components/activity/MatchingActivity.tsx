import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';

export default function MatchingActivity({ activity, onAnswer, disabled }: { activity: any, onAnswer: (answer: any) => void, disabled?: boolean }) {
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [matches, setMatches] = useState<Record<string, string>>({});

    // Safely access data from activity
    // Note: The structure might be nested in activity.data or direct properties depending on serializer
    const pairs = activity?.pairs || activity?.data?.pairs || {};
    const leftItems = Object.keys(pairs);
    const rightItems = Object.values(pairs) as string[];

    console.log('[MatchingActivity] Render:', {
        id: activity.id,
        pairsKeys: Object.keys(pairs),
        hasData: !!activity.data,
        directPairs: !!activity.pairs
    });

    const handleLeftPress = (item: string) => {
        if (disabled || matches[item]) return; // Already matched
        setSelectedLeft(item);
    };

    const handleRightPress = (item: string) => {
        if (disabled || !selectedLeft) return;

        // Create new matches object
        const newMatches = { ...matches, [selectedLeft]: item };
        setMatches(newMatches);
        setSelectedLeft(null);

        // Check if complete
        if (Object.keys(newMatches).length === leftItems.length) {
            onAnswer(newMatches);
        }
    };

    if (!pairs || leftItems.length === 0) {
        return (
            <View className="p-4">
                <Text className="text-gray-600 text-center">Aucune donnée d'activité disponible</Text>
            </View>
        );
    }

    return (
        <View className="w-full">
            {activity.question_text && (
                <Text className="text-lg font-semibold text-gray-800 mb-4">{activity.question_text}</Text>
            )}
            <View className="w-full flex-row justify-between">
                <View className="flex-1 mr-2">
                    {leftItems.map((item) => (
                        <TouchableOpacity
                            key={item}
                            onPress={() => handleLeftPress(item)}
                            className={`p-4 rounded-xl border-2 mb-3 bg-white items-center ${matches[item]
                                ? 'bg-green-100 border-green-500'
                                : selectedLeft === item
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200'
                                }`}
                            disabled={!!matches[item] || disabled}
                        >
                            <Text className="font-bold text-gray-800">{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View className="flex-1 ml-2">
                    {rightItems.map((item) => {
                        const isMatched = Object.values(matches).includes(item);
                        return (
                            <TouchableOpacity
                                key={item}
                                onPress={() => handleRightPress(item)}
                                className={`p-4 rounded-xl border-2 mb-3 bg-white items-center ${isMatched ? 'bg-green-100 border-green-500' : 'border-gray-200'
                                    }`}
                                disabled={isMatched || disabled}
                            >
                                <Text className="font-bold text-gray-800">{item}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}
