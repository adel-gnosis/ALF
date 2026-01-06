import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { getSubjectColor } from '../../constants/subjectColors';

export default function PlacementCompleteScreen() {
    const router = useRouter();
    const { sessionId, determinedLevel, levelTitle, accuracy } = useLocalSearchParams<{
        sessionId: string;
        determinedLevel: string;
        levelTitle: string;
        accuracy: string;
    }>();

    const { data: results } = useQuery({
        queryKey: ['placement-results', sessionId],
        queryFn: async () => {
            const response = await api.post(`/placement/${sessionId}/complete/`);
            return response.data;
        },
        enabled: !!sessionId,
    });

    const handleStartLearning = () => {
        router.replace('/(tabs)/dashboard');
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Success Header */}
            <View className="bg-green-500 p-6 pt-12">
                <View className="items-center">
                    <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4">
                        <Ionicons name="checkmark" size={40} color="#10B981" />
                    </View>
                    <Text className="text-3xl font-bold text-white text-center mb-2">
                        Test Terminé! 🎉
                    </Text>
                    <Text className="text-green-100 text-center text-lg">
                        Votre niveau a été déterminé
                    </Text>
                </View>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Determined Level Card */}
                <View className="bg-white rounded-xl p-6 shadow-sm mb-4">
                    <Text className="text-center text-gray-600 mb-2">Votre Niveau</Text>
                    <Text className="text-4xl font-bold text-blue-600 text-center mb-2">
                        {results?.determined_level?.cefr_code || levelTitle}
                    </Text>
                    <Text className="text-lg text-gray-700 text-center mb-4">
                        {results?.determined_level?.title || levelTitle}
                    </Text>

                    <View className="bg-blue-50 p-4 rounded-lg">
                        <Text className="text-center text-gray-700">
                            Score: {Math.round(parseFloat(accuracy || '0'))}%
                        </Text>
                    </View>
                </View>

                {/* Unlocked Levels */}
                {results?.unlocked_levels && results.unlocked_levels.length > 0 && (
                    <View className="mb-4">
                        <Text className="text-lg font-bold mb-3">Niveaux Débloqués</Text>
                        <View className="bg-white rounded-xl p-4 shadow-sm">
                            {results.unlocked_levels.map((level: any, index: number) => (
                                <View
                                    key={level.id}
                                    className={`flex-row items-center py-3 ${index < results.unlocked_levels.length - 1 ? 'border-b border-gray-100' : ''
                                        }`}
                                >
                                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                    <Text className="ml-3 flex-1 font-semibold">{level.title}</Text>
                                    <Text className="text-gray-500">{level.cefr_code}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Weakness Summary */}
                {results?.weakness_summary && results.weakness_summary.length > 0 && (
                    <View className="mb-4">
                        <Text className="text-lg font-bold mb-3">Analyse par Sujet</Text>
                        {results.weakness_summary.map((item: any, index: number) => (
                            <View
                                key={index}
                                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                                style={{
                                    borderLeftWidth: 4,
                                    borderLeftColor: getSubjectColor(item.subject),
                                }}
                            >
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="font-semibold text-lg">{item.subject}</Text>
                                    <Text
                                        className={`font-bold ${item.strength === 'STRONG'
                                                ? 'text-green-600'
                                                : item.strength === 'WEAK'
                                                    ? 'text-red-600'
                                                    : 'text-orange-600'
                                            }`}
                                    >
                                        {Math.round(item.accuracy)}%
                                    </Text>
                                </View>
                                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <View
                                        className="h-full"
                                        style={{
                                            width: `${item.accuracy}%`,
                                            backgroundColor: getSubjectColor(item.subject),
                                        }}
                                    />
                                </View>
                                <Text className="text-xs text-gray-500 mt-2">
                                    Niveau: {item.strength === 'STRONG' ? 'Fort' : item.strength === 'WEAK' ? 'Faible' : 'Moyen'}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Recommendations */}
                <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="bulb" size={20} color="#3B82F6" />
                        <Text className="text-blue-900 font-semibold ml-2">Recommandations</Text>
                    </View>
                    <Text className="text-blue-800 text-sm">
                        • Commencez par consolider vos bases au {results?.determined_level?.cefr_code}
                        {'\n'}• Concentrez-vous sur vos sujets faibles pour progresser plus vite
                        {'\n'}• Pratiquez régulièrement (15-30 min par jour recommandé)
                        {'\n'}• N'hésitez pas à revisiter les exercices échoués
                    </Text>
                </View>

                {/* CTA */}
                <Button
                    title="Commencer l'Apprentissage"
                    onPress={handleStartLearning}
                />

                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/levels')}
                    className="mt-3 p-4 items-center"
                >
                    <Text className="text-blue-600 font-semibold">
                        Explorer Tous les Niveaux
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
