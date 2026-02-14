import { View, Text, TouchableOpacity, Image, LayoutChangeEvent, Pressable } from 'react-native';
import { useState, useRef } from 'react';
import { resolveMediaUrl } from "../../services/api";
import { useHaptics } from '../../hooks/useHaptics';
import { MotiView } from 'moti';

interface MCQActivityProps {
    activity: any;
    onAnswer: (answer: any, layout?: { x: number; y: number }) => void;
    disabled?: boolean;
    feedback?: 'success' | 'error' | null;
    correctAnswer?: any;
}

export default function MCQActivity({ activity, onAnswer, disabled, feedback, correctAnswer }: MCQActivityProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const haptics = useHaptics();

    // Store layout positions of choices
    const choiceLayouts = useRef<{ [key: string]: { x: number; y: number; width: number; height: number } }>({});

    // Safely extract data
    const choices = activity?.choices_v2 || [];
    const questionText = activity?.question_text || '';

    const handleSelect = (choiceId: string) => {
        if (disabled) return;

        haptics.selection();
        setSelectedId(choiceId);

        const layout = choiceLayouts.current[choiceId];
        const centerPos = layout
            ? { x: layout.x + layout.width / 2, y: layout.y }
            : undefined;

        onAnswer({ choice_id: choiceId }, centerPos);
    };

    const handleLayout = (id: string, event: LayoutChangeEvent) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        choiceLayouts.current[id] = { x, y, width, height };
    };

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
        if (feedback === 'error' && correctChoiceId === choice.id) {
            return 'text-green-700 font-bold';
        }
        return 'text-gray-800 font-semibold';
    };

    const renderContent = (choice: any) => {
        const type = choice.content?.type || 'text';
        const value = choice.content?.value || choice.rendered_value || '';

        if (type === 'image') {
            const imageUrl = resolveMediaUrl(value);
            if (!imageUrl) return <Text className="text-gray-400">No Image</Text>;
            return (
                <View className="w-full h-32 rounded-lg bg-gray-100 items-center justify-center overflow-hidden my-1">
                    <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="contain" />
                </View>
            );
        }
        return (
            <Text className={getTextStyle(choice)}>
                {choice.rendered_value || value}
            </Text>
        );
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
            {choices.map((choice: any) => {
                const isSelected = selectedId === choice.id;

                // Refined Animation Curves
                // Pulse: scale 0.97 -> 1.03 -> 1, duration 360ms
                // Shake: translateX [-8, 8, -6, 6, 0], duration 420ms

                const animateState = (() => {
                    if (!isSelected) return {};
                    if (feedback === 'success') {
                        return { scale: [1, 0.97, 1.03, 1] };
                    }
                    if (feedback === 'error') {
                        return { translateX: [0, -8, 8, -6, 6, 0] };
                    }
                    return {};
                })();

                const duration = feedback === 'success' ? 360 : feedback === 'error' ? 420 : 300;

                return (
                    <MotiView
                        key={choice.id}
                        animate={animateState as any}
                        transition={{ type: 'timing', duration: duration }}
                        onLayout={(e) => handleLayout(choice.id, e)}
                        style={{ width: '100%' }}
                    >
                        <Pressable
                            onPress={() => handleSelect(choice.id)}
                            disabled={disabled}
                            className={`p-4 rounded-xl border-2 mb-3 ${getButtonStyle(choice)}`}
                        >
                            {renderContent(choice)}
                        </Pressable>
                    </MotiView>
                );
            })}
        </View>
    );
}
