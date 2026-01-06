import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
    useProgress,
    useWeaknessAlerts,
    useFailedActivities,
    useDismissAlert,
} from '../../services/progressService';
import { Ionicons } from '@expo/vector-icons';
import { getSubjectColor } from '../../constants/subjectColors';
import Button from '../../components/Button';

export default function ProgressScreen() {
    const router = useRouter();
    const { data: progress, isLoading } = useProgress();
    const { data: alerts } = useWeaknessAlerts();
    const { data: failedData } = useFailedActivities();
    const dismissAlert = useDismissAlert();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const currentLevel = progress?.levels?.find(l => l.status === 'ACTIVE');

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-purple-500 p-6 pt-12">
                <Text className="text-3xl font-bold text-white">Progression</Text>
                {currentLevel && (
                    <Text className="text-purple-100 mt-2">
                        Niveau actuel: {currentLevel.level.title}
                    </Text>
                )}
            </View>

            <ScrollView className="flex-1">
                {/* Overall Stats */}
                <View className="p-4">
                    <View className="bg-white rounded-xl p-5 shadow-sm">
                        <Text className="text-lg font-bold mb-4">Statistiques Globales</Text>
                        <View className="flex-row justify-around">
                            <View className="items-center">
                                <Text className="text-3xl font-bold text-blue-500">
                                    {progress?.levels?.filter(l => l.status === 'COMPLETED').length || 0}
                                </Text>
                                <Text className="text-xs text-gray-600 mt-1">Niveaux Complétés</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-3xl font-bold text-green-500">
                                    {Math.round(progress?.overall_accuracy || 0)}%
                                </Text>
                                <Text className="text-xs text-gray-600 mt-1">Précision Globale</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-3xl font-bold text-orange-500">
                                    {failedData?.total_failed || 0}
                                </Text>
                                <Text className="text-xs text-gray-600 mt-1">À Réviser</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Weakness Alerts */}
                {alerts && alerts.length > 0 && (
                    <View className="px-4 pb-4">
                        <Text className="text-lg font-bold mb-3">Points Faibles Détectés</Text>
                        {alerts.map((alert) => (
                            <View
                                key={alert.id}
                                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                                style={{
                                    borderLeftWidth: 4,
                                    borderLeftColor:
                                        alert.severity === 'CRITICAL'
                                            ? '#EF4444'
                                            : alert.severity === 'MODERATE'
                                                ? '#F59E0B'
                                                : '#FCD34D',
                                }}
                            >
                                <View className="flex-row items-start justify-between mb-2">
                                    <View className="flex-1">
                                        <Text className="font-semibold text-lg">{alert.subject.title}</Text>
                                        <Text className="text-sm text-gray-600 mt-1">{alert.message}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => dismissAlert.mutate(alert.id)}
                                        className="p-2"
                                    >
                                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>

                                <View className="bg-gray-100 p-3 rounded-lg mb-3">
                                    <Text className="text-sm text-gray-700">{alert.recommendation}</Text>
                                </View>

                                <View className="flex-row items-center justify-between">
                                    <Text className="text-xs text-gray-500">
                                        {alert.sessions_analyzed} sessions • {Math.round(alert.average_accuracy)}%
                                        précision
                                    </Text>
                                    <TouchableOpacity className="bg-blue-500 px-4 py-2 rounded-lg">
                                        <Text className="text-white font-semibold text-sm">Pratiquer</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Level Progress */}
                {progress && progress.levels && progress.levels.length > 0 && (
                    <View className="px-4 pb-4">
                        <Text className="text-lg font-bold mb-3">Progression par Niveau</Text>
                        {progress.levels.map((levelProgress) => (
                            <View
                                key={levelProgress.id}
                                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                            >
                                <View className="flex-row items-center justify-between mb-3">
                                    <View>
                                        <Text className="font-semibold text-lg">
                                            {levelProgress.level.title}
                                        </Text>
                                        <Text className="text-sm text-gray-600">
                                            {levelProgress.level.cefr_code}
                                        </Text>
                                    </View>
                                    <View
                                        className={`px-3 py-1 rounded-full ${levelProgress.status === 'COMPLETED'
                                                ? 'bg-green-100'
                                                : levelProgress.status === 'ACTIVE'
                                                    ? 'bg-blue-100'
                                                    : 'bg-gray-100'
                                            }`}
                                    >
                                        <Text
                                            className={`text-xs font-semibold ${levelProgress.status === 'COMPLETED'
                                                    ? 'text-green-700'
                                                    : levelProgress.status === 'ACTIVE'
                                                        ? 'text-blue-700'
                                                        : 'text-gray-700'
                                                }`}
                                        >
                                            {levelProgress.status === 'COMPLETED'
                                                ? 'Complété'
                                                : levelProgress.status === 'ACTIVE'
                                                    ? 'En Cours'
                                                    : 'Verrouillé'}
                                        </Text>
                                    </View>
                                </View>

                                {levelProgress.status !== 'LOCKED' && (
                                    <>
                                        <View className="mb-2">
                                            <View className="flex-row justify-between mb-1">
                                                <Text className="text-xs text-gray-600">Progression</Text>
                                                <Text className="text-xs text-gray-600">
                                                    {Math.round(levelProgress.completion_percentage)}%
                                                </Text>
                                            </View>
                                            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <View
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${levelProgress.completion_percentage}%` }}
                                                />
                                            </View>
                                        </View>

                                        <View className="flex-row justify-around pt-3 border-t border-gray-100">
                                            <View className="items-center">
                                                <Text className="font-bold text-blue-500">
                                                    {levelProgress.total_attempts}
                                                </Text>
                                                <Text className="text-xs text-gray-600">Tentatives</Text>
                                            </View>
                                            <View className="items-center">
                                                <Text className="font-bold text-green-500">
                                                    {Math.round(levelProgress.accuracy_percentage)}%
                                                </Text>
                                                <Text className="text-xs text-gray-600">Précision</Text>
                                            </View>
                                            <View className="items-center">
                                                <Text className="font-bold text-orange-500">
                                                    {levelProgress.retry_count}
                                                </Text>
                                                <Text className="text-xs text-gray-600">Reprises</Text>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Failed Activities Summary */}
                {failedData && failedData.total_failed > 0 && (
                    <View className="px-4 pb-6">
                        <Text className="text-lg font-bold mb-3">Exercices à Réviser</Text>
                        <View className="bg-white rounded-xl p-4 shadow-sm">
                            <Text className="text-2xl font-bold text-red-500 mb-2">
                                {failedData.total_failed} exercices
                            </Text>
                            {Object.entries(failedData.by_subject).map(([subject, count]) => (
                                <View
                                    key={subject}
                                    className="flex-row items-center justify-between py-2 border-t border-gray-100"
                                >
                                    <Text className="text-gray-700">{subject}</Text>
                                    <Text className="text-gray-500">{count}</Text>
                                </View>
                            ))}
                            <Button
                                title="Commencer la Révision"
                                onPress={() => router.push('/(tabs)/practice')}
                                className="mt-3"
                            />
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
