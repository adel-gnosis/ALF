import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress } from '../../services/progressService';
import { useStartSession } from '../../services/sessionService';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';

export default function Dashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const { data: progress, isLoading } = useProgress();
    const startSession = useStartSession();

    // Find current active level
    const currentLevel = progress?.levels?.find((l) => l.status === 'ACTIVE');

    // Check if user has NOT taken placement test
    // Criteria: Only first level unlocked with 0% completion and no activity done
    const hasNotTakenPlacementTest =
        progress?.levels &&
        progress.levels.length >= 1 &&
        progress.levels.filter((l) => l.status !== 'LOCKED').length === 1 &&
        progress.levels[0].level.order === 1 &&
        progress.levels[0].completion_percentage === 0 &&
        progress.levels[0].total_attempts === 0;

    const handleStartSession = () => {
        if (!currentLevel) return;

        startSession.mutate(
            {
                level_id: currentLevel.level.id,
                target_activities: 30,
            },
            {
                onSuccess: (data) => {
                    router.push(`/session/${data.session_id}`);
                },
                onError: (error: any) => {
                    alert(error.response?.data?.error || 'Erreur lors du démarrage de la session');
                },
            }
        );
    };

    const handlePlacementTest = () => {
        router.push('/placement/start');
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
            <View className="bg-blue-500 p-6 pt-12">
                <Text className="text-3xl font-bold text-white">
                    Bonjour, {user?.username}! 👋
                </Text>
                {currentLevel && (
                    <Text className="text-blue-100 mt-2">
                        Niveau actuel: {currentLevel.level.title}
                    </Text>
                )}
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Show Placement Test option for brand new users */}
                {hasNotTakenPlacementTest ? (
                    <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
                        <Text className="text-lg font-bold mb-3">📚 Commencez Votre Parcours</Text>
                        <Text className="text-gray-600 mb-4">
                            Déterminez votre niveau avec un test de placement ou commencez directement au niveau débutant.
                        </Text>
                        <Button
                            title="Test de Placement"
                            onPress={handlePlacementTest}
                            className="mb-3"
                        />
                        <Button
                            title="Commencer au Niveau A1.1"
                            onPress={handleStartSession}
                            variant="outline"
                            loading={startSession.isPending}
                        />
                    </View>
                ) : currentLevel ? (
                    /* Current Progress Card for users who have started */
                    <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
                        <Text className="text-lg font-bold mb-3">
                            📚 {currentLevel.level.title}
                        </Text>

                        <View className="mb-4">
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-sm text-gray-600">Progression</Text>
                                <Text className="text-sm text-gray-600">
                                    {Math.round(currentLevel.completion_percentage)}%
                                </Text>
                            </View>
                            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-blue-500"
                                    style={{ width: `${currentLevel.completion_percentage}%` }}
                                />
                            </View>
                        </View>

                        <View className="flex-row justify-around mb-4 py-3 border-t border-gray-100">
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-blue-500">
                                    {currentLevel.total_attempts}
                                </Text>
                                <Text className="text-xs text-gray-600">Tentatives</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-green-500">
                                    {Math.round(currentLevel.accuracy_percentage)}%
                                </Text>
                                <Text className="text-xs text-gray-600">Précision</Text>
                            </View>
                        </View>

                        <Button
                            title="Continuer l'Apprentissage"
                            onPress={handleStartSession}
                            loading={startSession.isPending}
                        />
                    </View>
                ) : null}

                {/* Quick Actions */}
                <View className="mb-4">
                    <Text className="text-lg font-bold mb-3">Actions Rapides</Text>
                    <View className="flex-row flex-wrap gap-3">
                        <TouchableOpacity
                            onPress={() => router.push('/practice')}
                            className="flex-1 min-w-[45%] bg-white rounded-xl p-4 shadow-sm items-center"
                        >
                            <Ionicons name="repeat" size={28} color="#3B82F6" />
                            <Text className="text-sm font-semibold mt-2">Pratique</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/levels')}
                            className="flex-1 min-w-[45%] bg-white rounded-xl p-4 shadow-sm items-center"
                        >
                            <Ionicons name="layers" size={28} color="#8B5CF6" />
                            <Text className="text-sm font-semibold mt-2">Niveaux</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/progress')}
                            className="flex-1 min-w-[45%] bg-white rounded-xl p-4 shadow-sm items-center"
                        >
                            <Ionicons name="stats-chart" size={28} color="#10B981" />
                            <Text className="text-sm font-semibold mt-2">Progrès</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/profile')}
                            className="flex-1 min-w-[45%] bg-white rounded-xl p-4 shadow-sm items-center"
                        >
                            <Ionicons name="person" size={28} color="#F59E0B" />
                            <Text className="text-sm font-semibold mt-2">Profil</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Study Streak */}
                {progress && (
                    <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
                        <View className="flex-row items-center mb-3">
                            <Ionicons name="flame" size={24} color="#F59E0B" />
                            <Text className="text-lg font-bold ml-2">Série d'Apprentissage</Text>
                        </View>
                        <Text className="text-gray-600">
                            Continuez à apprendre chaque jour pour maintenir votre série!
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
