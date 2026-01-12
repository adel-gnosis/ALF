import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Button from '../components/Button';
import { getSubjectColor } from '../constants/subjectColors';
import type { CompleteSessionResponse } from '../types/session';
import { rehearseMissedSession } from '@/services/sessionService';

export default function SessionCompleteScreen() {
    const router = useRouter();
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

    // Fetch session results
    const { data, isLoading } = useQuery({

        
        queryKey: ['session-complete', sessionId],
        queryFn: async () => {
            const response = await api.post(`/sessions/${sessionId}/complete/`);
            return response.data as CompleteSessionResponse;
        },
        enabled: !!sessionId,
    });

    const rehearseMutation = useMutation({
        mutationFn: () => rehearseMissedSession(sessionId),
        onSuccess: (res) => {
            // Navigate to the newly created rehearsal session
            router.replace(`/session/${res.session_id}`);
        },
    });


    if (isLoading || !data) {
        return null;
    }

    const { passed, accuracy, outcome, message, subject_breakdown, recommendations } = data;

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className={`p-6 ${passed ? 'bg-green-500' : 'bg-orange-500'}`}>
                <Text className="text-3xl font-bold text-white text-center mb-2">
                    {passed ? '🎉 Félicitations!' : '💪 Continuez!'}
                </Text>
                <Text className="text-xl text-white text-center">{message}</Text>
                <View className="mt-4 bg-white/20 rounded-lg p-4">
                    <Text className="text-5xl font-bold text-white text-center">
                        {Math.round(accuracy)}%
                    </Text>
                    <Text className="text-white text-center">Précision</Text>
                </View>
            </View>

            {/* Subject Breakdown */}
            {subject_breakdown && subject_breakdown.length > 0 && (
                <View className="p-4">
                    <Text className="text-lg font-semibold mb-3">Performance par Sujet</Text>
                    {subject_breakdown.map((item, index) => (
                        <View
                            key={index}
                            className="mb-3 p-4 bg-white rounded-lg"
                            style={{ borderLeftWidth: 4, borderLeftColor: getSubjectColor(item.subject) }}
                        >
                            <View className="flex-row justify-between mb-2">
                                <Text className="font-semibold">{item.subject}</Text>
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
                            <Text className="text-sm text-gray-600">
                                {item.correct}/{item.total} correct
                            </Text>
                            <View className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <View
                                    className="h-full"
                                    style={{
                                        width: `${item.accuracy}%`,
                                        backgroundColor: getSubjectColor(item.subject),
                                    }}
                                />
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <View className="p-4">
                    <Text className="text-lg font-semibold mb-3">Recommandations</Text>
                    {recommendations.map((rec, index) => (
                        <View key={index} className="mb-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Text className="text-base mb-2">{rec.message}</Text>
                            {rec.weak_subjects && rec.weak_subjects.length > 0 && (
                                <Text className="text-sm text-gray-600">
                                    Focus: {rec.weak_subjects.map(s => s.name).join(', ')}
                                </Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Actions */}
            <View className="p-4 gap-3">
                {passed && data.suggested_level && (
                    <Button
                        title="Passer au Niveau Suivant"
                        onPress={() => {
                            router.replace('/(tabs)/dashboard');
                        }}
                    />
                )}

                <Button
                    title={passed ? 'Rejouer ce Niveau' : 'Réessayer'}
                    onPress={() => {
                        router.replace('/(tabs)/dashboard');
                    }}
                    variant="outline"
                />

                {!passed && (
                    <Button
                        title="Pratiquer les Erreurs"
                        onPress={() => rehearseMutation.mutate()}
                        loading={rehearseMutation.isPending}
                        variant="outline"
                    />
                )}


                <Button
                    title="Retour au Tableau de Bord"
                    onPress={() => {
                        router.replace('/(tabs)/dashboard');
                    }}
                    variant="ghost"
                />
            </View>
        </ScrollView>
    );
}
