import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress, useFailedActivities, usePracticeFailed } from '../../services/progressService';
import { useStartSession } from '../../services/sessionService';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { getSubjectColor } from '../../constants/subjectColors';

export default function PracticeScreen() {
    const router = useRouter();
    const { data: progress } = useProgress();
    const { data: failedData } = useFailedActivities();
    const startSession = useStartSession();
    const practiceFailed = usePracticeFailed();

    // Fallback to highest unlocked level if no active level
    const currentLevel = progress?.levels?.find(l => l.status === 'ACTIVE')
        || progress?.levels?.sort((a, b) => b.level.order - a.level.order)[0];

    const handlePracticeFailed = () => {
        if (!currentLevel) return;

        practiceFailed.mutate(currentLevel.level.id, {
            onSuccess: (data) => {
                router.push(`/session/${data.session_id}`);
            },
        });
    };

    const handleSubjectMode = (subjectId: number) => {
        if (!currentLevel) return;

        startSession.mutate(
            {
                level_id: currentLevel.level.id,
                subject_id: subjectId,
                target_activities: 12,
            },
            {
                onSuccess: (data) => {
                    router.push(`/session/${data.session_id}`);
                },
            }
        );
    };

    if (!currentLevel) {
        return (
            <View className="flex-1 items-center justify-center p-4">
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                <Text className="text-xl font-bold mt-4">Aucun niveau actif</Text>
                <Text className="text-gray-600 text-center mt-2">
                    Commencez un nouveau niveau pour accéder aux exercices
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-orange-500 p-6 pt-12">
                <Text className="text-3xl font-bold text-white">Pratique</Text>
                <Text className="text-orange-100 mt-2">
                    Renforcez vos compétences
                </Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Failed Activities Practice */}
                {failedData && failedData.total_failed > 0 && (
                    <View className="mb-6">
                        <Text className="text-lg font-bold mb-3">Exercices Échoués</Text>

                        <View className="bg-white rounded-xl p-5 shadow-sm mb-3">
                            <View className="flex-row items-center mb-4">
                                <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mr-4">
                                    <Ionicons name="alert-circle" size={24} color="#EF4444" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold">
                                        {failedData.total_failed} exercices à réviser
                                    </Text>
                                    <Text className="text-sm text-gray-600">
                                        Pratiquez vos erreurs
                                    </Text>
                                </View>
                            </View>

                            {/* Breakdown by subject */}
                            {Object.entries(failedData.by_subject).map(([subject, count]) => (
                                <View
                                    key={subject}
                                    className="flex-row items-center justify-between py-2 border-t border-gray-100"
                                >
                                    <Text className="text-gray-700">{subject}</Text>
                                    <Text className="text-gray-500">{count} exercices</Text>
                                </View>
                            ))}

                            <Button
                                title="Commencer la Révision"
                                onPress={handlePracticeFailed}
                                loading={practiceFailed.isPending}
                                className="mt-4"
                            />
                        </View>
                    </View>
                )}

                {/* Subject-Focused Practice */}
                <View className="mb-6">
                    <Text className="text-lg font-bold mb-3">Pratique par Sujet</Text>
                    <Text className="text-sm text-gray-600 mb-3">
                        Concentrez-vous sur un sujet spécifique
                    </Text>

                    {/* Subject cards */}
                    <View className="gap-3">
                        {[
                            { id: 1, name: 'Grammaire', icon: '📚' },
                            { id: 2, name: 'Conjugaison', icon: '⏰' },
                            { id: 3, name: 'Vocabulaire / Lexique', icon: '🗣️' },
                            { id: 4, name: 'Orthographe', icon: '✏️' },
                            { id: 5, name: 'Compréhension', icon: '👂' },
                        ].map((subject) => (
                            <TouchableOpacity
                                key={subject.id}
                                onPress={() => handleSubjectMode(subject.id)}
                                className="bg-white rounded-xl p-4 shadow-sm flex-row items-center"
                                style={{ borderLeftWidth: 4, borderLeftColor: getSubjectColor(subject.name) }}
                            >
                                <Text className="text-3xl mr-4">{subject.icon}</Text>
                                <View className="flex-1">
                                    <Text className="text-lg font-semibold">{subject.name}</Text>
                                    <Text className="text-sm text-gray-600">30 exercices</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Stats */}
                <View className="mb-6">
                    <Text className="text-lg font-bold mb-3">Statistiques Rapides</Text>
                    <View className="bg-white rounded-xl p-5 shadow-sm">
                        <View className="flex-row justify-around">
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-blue-500">
                                    {currentLevel.total_attempts}
                                </Text>
                                <Text className="text-xs text-gray-600 mt-1">Total Tentatives</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-green-500">
                                    {Math.round(currentLevel.accuracy_percentage)}%
                                </Text>
                                <Text className="text-xs text-gray-600 mt-1">Précision</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-orange-500">
                                    {failedData?.total_failed || 0}
                                </Text>
                                <Text className="text-xs text-gray-600 mt-1">À Réviser</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
