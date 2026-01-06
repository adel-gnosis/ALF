import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { useStartPlacementTest } from '../../services/placementService';

export default function PlacementStartScreen() {
    const router = useRouter();
    const startTest = useStartPlacementTest();

    const handleStart = () => {
        startTest.mutate(undefined, {
            onSuccess: (data) => {
                router.push(`/placement/${data.session_id}`);
            },
        });
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-blue-500 p-6 pt-12">
                <Text className="text-3xl font-bold text-white">Test de Placement</Text>
                <Text className="text-blue-100 mt-2">Trouvez votre niveau idéal</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Info Card */}
                <View className="bg-white rounded-xl p-6 shadow-sm mb-4">
                    <View className="items-center mb-4">
                        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-3">
                            <Ionicons name="school" size={40} color="#3B82F6" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 text-center">
                            Évaluez Votre Niveau
                        </Text>
                    </View>

                    <Text className="text-base text-gray-700 text-center mb-6">
                        Ce test adaptatif vous aidera à déterminer votre niveau de français et à commencer
                        votre apprentissage au bon endroit.
                    </Text>

                    {/* How it works */}
                    <View className="mb-6">
                        <Text className="text-lg font-bold mb-3">Comment ça marche?</Text>

                        <View className="flex-row items-start mb-3">
                            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                                <Text className="text-blue-600 font-bold">1</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-700">12 questions adaptatives</Text>
                                <Text className="text-sm text-gray-500">
                                    Les questions s'adaptent à vos réponses
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-start mb-3">
                            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                                <Text className="text-blue-600 font-bold">2</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-700">Le niveau s'ajuste automatiquement</Text>
                                <Text className="text-sm text-gray-500">
                                    Réponse correcte → niveau +1, incorrecte → niveau -1
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-start">
                            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                                <Text className="text-blue-600 font-bold">3</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-700">Résultats détaillés</Text>
                                <Text className="text-sm text-gray-500">
                                    Découvrez votre niveau et vos points faibles
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Tips */}
                    <View className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="bulb" size={20} color="#F59E0B" />
                            <Text className="text-yellow-800 font-semibold ml-2">Conseils</Text>
                        </View>
                        <Text className="text-sm text-yellow-700">
                            • Prenez votre temps{'\n'}
                            • Répondez honnêtement{'\n'}
                            • Pas de panique si c'est difficile - c'est normal!{'\n'}
                            • Le test dure environ 5-10 minutes
                        </Text>
                    </View>

                    <Button
                        title="Commencer le Test"
                        onPress={handleStart}
                        loading={startTest.isPending}
                    />
                </View>

                {/* What you'll unlock */}
                <View className="bg-white rounded-xl p-6 shadow-sm">
                    <Text className="text-lg font-bold mb-3">Ce que vous débloquerez</Text>

                    <View className="flex-row items-center mb-3">
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text className="text-gray-700 ml-3 flex-1">
                            Accès à votre niveau déterminé et à tous les niveaux inférieurs
                        </Text>
                    </View>

                    <View className="flex-row items-center mb-3">
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text className="text-gray-700 ml-3 flex-1">
                            Recommandations personnalisées par sujet
                        </Text>
                    </View>

                    <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text className="text-gray-700 ml-3 flex-1">
                            Parcours d'apprentissage adapté à votre niveau
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
