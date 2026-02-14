import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';

interface ActivityStageProps {
    children: React.ReactNode;
}

export default function ActivityStage({ children }: ActivityStageProps) {
    return (
        <Animated.View
            entering={FadeInDown.springify().damping(15)}
            // layout={Layout.springify()} // Optional: only if height changes drastically
            className="flex-1 px-4 pt-10 pb-4"
        >
            <View
                className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 w-full min-h-[50%]"
                style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 12,
                    elevation: 3
                }}
            >
                {children}
            </View>
        </Animated.View>
    );
}
