import React, { useEffect } from 'react';
import { Text, View, AccessibilityInfo } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withDelay,
    Easing,
    runOnJS
} from 'react-native-reanimated';

interface ComboBadgeProps {
    streak: number;
}

export default function ComboBadge({ streak }: ComboBadgeProps) {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);
    const translateY = useSharedValue(10);

    useEffect(() => {
        if (streak >= 2) {
            // Accessibility Announcement
            AccessibilityInfo.announceForAccessibility(`Combo fois ${streak}`);

            // Reset values
            opacity.value = 0;
            scale.value = 0.5;
            translateY.value = 10;

            // Trigger Animation Sequence
            // 1. Pop In (300ms)
            opacity.value = withSequence(
                withTiming(1, { duration: 300 }),
                withDelay(900, withTiming(0, { duration: 300 })) // Hold then Fade
            );

            scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) });
            translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
        }
    }, [streak]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { scale: scale.value },
            { translateY: translateY.value }
        ]
    }));

    if (streak < 2) return null;

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top: 10,
                    right: 20,
                    zIndex: 50,
                },
                animatedStyle
            ]}
        >
            <View className="bg-orange-500 px-3 py-1 rounded-full shadow-lg border-2 border-white flex-row items-center">
                <Text className="text-xs mr-1">🔥</Text>
                <Text className="text-white font-bold text-sm italic">
                    COMBO x{streak}
                </Text>
            </View>
        </Animated.View>
    );
}
