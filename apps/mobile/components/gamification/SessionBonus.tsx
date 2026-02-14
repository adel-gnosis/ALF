import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, AccessibilityInfo } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence
} from 'react-native-reanimated';
import { useAudioFeedback } from '../../hooks/useAudioFeedback';
import { useHaptics } from '../../hooks/useHaptics';

interface SessionBonusProps {
    visible: boolean;
    isPerfect: boolean;
    onDismiss: () => void;
}

export default function SessionBonus({ visible, isPerfect, onDismiss }: SessionBonusProps) {
    const { playSuccess } = useAudioFeedback();
    const haptics = useHaptics();

    // Panel Animations
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    // Confetti Animation
    const confettiY = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            playSuccess();
            haptics.success();
            AccessibilityInfo.announceForAccessibility(
                isPerfect ? "Départ parfait! Bonus 15 XP" : "Bonus de session débloqué! 15 XP"
            );

            // Entry Animation
            scale.value = withSpring(1, { damping: 15 });
            opacity.value = withTiming(1, { duration: 200 });

            // Confetti Loop
            confettiY.value = withRepeat(
                withTiming(-100, { duration: 1500 }),
                -1, // infinite
                false
            );

            // Auto-dismiss 1.2s
            const timer = setTimeout(onDismiss, 1200);
            return () => clearTimeout(timer);
        } else {
            // Exit Animation (if valid)
            scale.value = withTiming(0, { duration: 200 });
            opacity.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const panelStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }]
    }));

    const confettiStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: confettiY.value }],
        opacity: 0.1
    }));

    if (!visible) return null;

    return (
        <View className="absolute inset-0 z-[100] items-center justify-center bg-black/40 pointer-events-auto">
            <TouchableOpacity activeOpacity={1} onPress={onDismiss} className="absolute inset-0" />

            <Animated.View
                style={[{
                    backgroundColor: 'white',
                    padding: 24,
                    borderRadius: 24,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 5,
                    width: '75%',
                    overflow: 'hidden'
                }, panelStyle]}
            >
                {/* Confetti Emoji Fallback Background */}
                <Animated.View style={[{ position: 'absolute' }, confettiStyle]}>
                    <Text className="text-4xl leading-10">🎉 ✨ 🎊 ⭐ 🎉</Text>
                    <Text className="text-4xl leading-10">✨ 🎊 ⭐ 🎉 ✨</Text>
                </Animated.View>

                <Text className="text-5xl mb-2">
                    {isPerfect ? '⭐' : '🎉'}
                </Text>
                <Text className="text-lg font-bold text-gray-800 text-center mb-1">
                    {isPerfect ? 'Perfect Start!' : 'Bonus de Session!'}
                </Text>
                <Text className="text-amber-500 font-extrabold text-3xl mb-1">
                    +15 XP
                </Text>
                <Text className="text-gray-500 text-xs text-center">
                    {isPerfect ? '3/3 Correctes!' : 'Continuez comme ça!'}
                </Text>
            </Animated.View>
        </View>
    );
}
