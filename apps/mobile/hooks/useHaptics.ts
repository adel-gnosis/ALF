import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const useHaptics = () => {
    const selection = () => {
        if (Platform.OS === 'web') return;
        // Refined: Light impact for selection
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const success = () => {
        if (Platform.OS === 'web') return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const error = () => {
        if (Platform.OS === 'web') return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    const impactMedium = () => {
        if (Platform.OS === 'web') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    return {
        selection,
        success,
        error,
        impactMedium,
    };
};
