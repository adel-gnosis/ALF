import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GameHUDProps {
    levelTitle?: string;
    currentProgress: number; // 0 to total
    totalProgress: number;
    xp: number;
    onClose: () => void;
}

export default function GameHUD({ levelTitle, currentProgress, totalProgress, xp, onClose }: GameHUDProps) {
    const insets = useSafeAreaInsets();

    // Generate segments
    // Limit max segments to avoid tiny bars if total is huge (e.g. 50)
    // If total > 20, maybe just use a solid bar? Let's stick to segments for now up to ~30.
    const segments = Array.from({ length: totalProgress }, (_, i) => i);

    return (
        <View
            className="w-full bg-white border-b border-gray-100 z-50 shadow-sm"
            style={{ paddingTop: insets.top, paddingBottom: 12, paddingHorizontal: 16 }}
        >
            <View className="flex-row items-center justify-between mb-3">
                {/* Close Button */}
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text className="text-gray-400 text-2xl font-bold leading-none">✕</Text>
                </TouchableOpacity>

                {/* Level Title Pill */}
                <View className="bg-gray-100 px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {levelTitle || "Activité"}
                    </Text>
                </View>

                {/* XP Indicator */}
                <View className="flex-row items-center bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                    <Text className="text-amber-600 font-extrabold text-xs mr-1">💎</Text>
                    <Text className="text-amber-700 font-bold text-xs">{xp}</Text>
                </View>
            </View>

            {/* Segmented Progress Bar */}
            <View className="flex-row h-3 w-full gap-1">
                {segments.map((index) => {
                    const isCompleted = index < currentProgress;
                    const isCurrent = index === currentProgress;

                    return (
                        <View
                            key={index}
                            className={`h-full flex-1 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                }`}
                        />
                    );
                })}
            </View>
        </View>
    );
}
