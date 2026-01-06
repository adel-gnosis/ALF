import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress } from '../../services/progressService';
import { useStartSession } from '../../services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import { useCourseStore } from '../../stores/courseStore';
import { Redirect } from 'expo-router';
import { useStartPlacementTest } from '../../services/placementService';

export default function LevelsScreen() {
    const router = useRouter();
    const selectedCourse = useCourseStore((state) => state.selectedCourse);

    const { data: progress, isLoading } = useProgress(selectedCourse?.id);
    const startSession = useStartSession();
    const startPlacement = useStartPlacementTest();

    // Redirect if no course selected
    if (!selectedCourse) {
        return <Redirect href="/(tabs)/courses" />;
    }

    const handleLevelPress = (levelProgress: any) => {
        if (levelProgress.status === 'LOCKED') {
            return;
        }

        // Start a session for this level
        startSession.mutate(
            {
                level_id: levelProgress.level.id,
                target_activities: 12,
            },
            {
                onSuccess: (data: any) => {
                    router.push(`/session/${data.session_id}`);
                },
                onError: (error: any) => {
                    alert(error.response?.data?.error || 'Erreur lors du démarrage de la session');
                },
            }
        );
    };

    const handlePlacementTest = () => {
        if (!selectedCourse?.id) return;

        startPlacement.mutate(selectedCourse.id, {
            onSuccess: (data: any) => {
                router.push(`/placement/${data.session_id}`);
            },
            onError: (error: any) => {
                alert(error.response?.data?.error || 'Erreur lors du démarrage du test');
            }
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="p-6 pt-12" style={{ backgroundColor: selectedCourse.color || '#3B82F6' }}>
                <Text className="text-3xl font-bold text-white">Niveaux</Text>
                <Text className="text-blue-100 mt-2">{selectedCourse.title}</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Placement Test Button */}
                <TouchableOpacity
                    onPress={handlePlacementTest}
                    disabled={startPlacement.isPending}
                    className="bg-white rounded-xl p-4 mb-6 shadow-sm flex-row items-center border-[1px] border-blue-100"
                >
                    <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
                        <Ionicons name="speedometer-outline" size={24} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900">Test de positionnement</Text>
                        <Text className="text-sm text-gray-600">Trouvez votre niveau idéal</Text>
                    </View>
                    {startPlacement.isPending ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                    ) : (
                        <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                    )}
                </TouchableOpacity>

                {progress?.levels?.map((levelProgress: any, index: number) => {
                    return (
                        <TouchableOpacity
                            key={levelProgress.level?.id || `level-${index}`}
                            onPress={() => handleLevelPress(levelProgress)}
                            disabled={levelProgress.status === 'LOCKED' || startSession.isPending}
                            className={`bg-white rounded-xl p-5 mb-4 shadow-sm ${levelProgress.status === 'LOCKED' ? 'opacity-50' : ''
                                }`}
                            style={{
                                borderLeftWidth: 6,
                                borderLeftColor:
                                    levelProgress.status === 'COMPLETED'
                                        ? '#10B981'
                                        : levelProgress.status === 'ACTIVE'
                                            ? '#3B82F6'
                                            : '#9CA3AF',
                            }}
                        >
                            <View className="flex-row items-center">
                                {/* Status Icon */}
                                <View
                                    className={`w-14 h-14 rounded-full items-center justify-center mr-4 ${levelProgress.status === 'COMPLETED'
                                        ? 'bg-green-500'
                                        : levelProgress.status === 'ACTIVE'
                                            ? 'bg-blue-500'
                                            : 'bg-gray-300'
                                        }`}
                                >
                                    {levelProgress.status === 'LOCKED' ? (
                                        <Ionicons name="lock-closed" size={24} color="white" />
                                    ) : levelProgress.status === 'COMPLETED' ? (
                                        <Ionicons name="checkmark" size={28} color="white" />
                                    ) : (
                                        <Ionicons name="book" size={24} color="white" />
                                    )}
                                </View>

                                {/* Level Info */}
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-gray-900">
                                        {levelProgress.level.title}
                                    </Text>
                                    <Text className="text-sm text-gray-600 mt-1">
                                        {levelProgress.level.description}
                                    </Text>

                                    {levelProgress.status !== 'LOCKED' && (
                                        <View className="mt-3">
                                            <View className="flex-row justify-between mb-1">
                                                <Text className="text-xs text-gray-500">Progression</Text>
                                                <Text className="text-xs text-gray-500">
                                                    {Math.round(levelProgress.completion_percentage)}%
                                                </Text>
                                            </View>
                                            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <View
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${levelProgress.completion_percentage}%` }}
                                                />
                                            </View>

                                            {levelProgress.accuracy_percentage > 0 && (
                                                <Text className="text-xs text-gray-500 mt-1">
                                                    Précision: {Math.round(levelProgress.accuracy_percentage)}%
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* Actions */}
                                <View className="flex-row items-center">
                                    {levelProgress.status !== 'LOCKED' && (
                                        <TouchableOpacity
                                            onPress={() => router.push(`/history/${levelProgress.level.id}?levelName=${levelProgress.level.title}`)}
                                            className="mr-3 p-2 rounded-full bg-blue-50"
                                        >
                                            <Ionicons name="time-outline" size={20} color="#3B82F6" />
                                        </TouchableOpacity>
                                    )}

                                    {levelProgress.status !== 'LOCKED' && !startSession.isPending && (
                                        <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                                    )}
                                    {startSession.isPending && (
                                        <ActivityIndicator size="small" color="#3B82F6" />
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}
