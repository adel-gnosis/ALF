import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSessionHistory, useReplaySession } from '../../services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function HistoryScreen() {
    const { levelId, levelName } = useLocalSearchParams<{ levelId: string, levelName: string }>();
    const router = useRouter();

    const { data: historyData, isLoading } = useSessionHistory(levelId ? parseInt(levelId) : undefined);
    const replaySession = useReplaySession();

    const handleReplay = (sessionId: string) => {
        replaySession.mutate(sessionId, {
            onSuccess: (data) => {
                router.push(`/session/${data.session_id}`);
            },
            onError: (error: any) => {
                alert(error.response?.data?.error || 'Erreur lors du redémarrage de la session');
            }
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white p-6 pt-12 border-b border-gray-200">
                <View className="flex-row items-center mb-2">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-gray-900">Historique</Text>
                </View>
                <Text className="text-gray-500 ml-10">
                    Niveau {levelName || levelId}
                </Text>
            </View>

            <ScrollView className="flex-1 p-4">
                <View className="mb-6">
                    <Text className="text-gray-500 mb-4 uppercase text-xs font-bold tracking-wider">
                        Vos Séries Précédentes
                    </Text>

                    {historyData?.sessions?.length === 0 ? (
                        <View className="bg-white p-8 rounded-xl items-center justify-center">
                            <Text className="text-gray-400 text-center">Aucune session trouvée pour ce niveau.</Text>
                        </View>
                    ) : (
                        historyData?.sessions?.map((session: any) => (
                            <View
                                key={session.id}
                                className="bg-white p-4 rounded-xl mb-3 shadow-sm flex-row items-center justify-between"
                            >
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <Text className="font-bold text-gray-900 text-lg mr-2">
                                            {session.session_type === 'CUSTOM' ? 'Révision' : `Série ${session.set_number}`}
                                        </Text>
                                        <View className={`px-2 py-0.5 rounded-full ${session.outcome === 'PASSED' ? 'bg-green-100' :
                                                session.outcome === 'RETRY' ? 'bg-orange-100' : 'bg-gray-100'
                                            }`}>
                                            <Text className={`text-xs font-bold ${session.outcome === 'PASSED' ? 'text-green-700' :
                                                    session.outcome === 'RETRY' ? 'text-orange-700' : 'text-gray-700'
                                                }`}>
                                                {Math.round(session.accuracy_percentage)}%
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-gray-500 text-xs">
                                        {format(new Date(session.started_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                    </Text>
                                    {session.subject && (
                                        <Text className="text-blue-500 text-xs mt-1">
                                            {session.subject.name}
                                        </Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    onPress={() => handleReplay(session.id)}
                                    disabled={replaySession.isPending}
                                    className="bg-blue-50 px-4 py-2 rounded-lg flex-row items-center"
                                >
                                    <Ionicons name="refresh" size={16} color="#3B82F6" className="mr-1" />
                                    <Text className="text-blue-600 font-semibold">Replay</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
