import React, { useEffect } from 'react';
import { Text, AccessibilityInfo } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    runOnJS,
    Easing
} from 'react-native-reanimated';

interface FloatingXPProps {
    id: string;
    amount: number;
    startPosition: { x: number; y: number };
    onComplete: (id: string) => void;
}

export default function FloatingXP({ id, amount, startPosition, onComplete }: FloatingXPProps) {
    const opacity = useSharedValue(1);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(0.85);

    useEffect(() => {
        // Accessibility
        AccessibilityInfo.announceForAccessibility(`Plus ${amount} XP`);

        // Animation Sequence
        // 1. Move Up and Fade Out over 700ms
        translateY.value = withTiming(-28, { duration: 700 });
        opacity.value = withTiming(0, { duration: 700 }, (finished) => {
            if (finished) {
                runOnJS(onComplete)(id);
            }
        });

        // 2. Scale Keyframes: 0.85 -> 1.05 -> 1
        scale.value = withSequence(
            withTiming(1.05, { duration: 350 }),
            withTiming(1, { duration: 350 })
        );

    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateY: translateY.value },
            { scale: scale.value }
        ]
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left: startPosition.x - 40,
                    top: startPosition.y - 20,
                    width: 80,
                    alignItems: 'center',
                    zIndex: 9999,
                    pointerEvents: 'none',
                },
                animatedStyle
            ]}
        >
            <Text className="text-amber-500 font-extrabold text-2xl shadow-sm text-center">
                +{amount} XP
            </Text>
        </Animated.View>
    );
}
