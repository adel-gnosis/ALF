import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress } from '../../services/progressService';
import { useStartSession } from '../../services/sessionService';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import '../../i18n';

export default function Dashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const { data: progress, isLoading } = useProgress();
    const startSession = useStartSession();
    const { t } = useTranslation();

    const currentLevel = progress?.levels?.find((l) => l.status === 'ACTIVE');
    const hasNotTakenPlacementTest = !user?.placement_completed;

    const handleStartSession = () => {
        if (!currentLevel) return;

        startSession.mutate(
            { level_id: currentLevel.level.id, target_activities: 30 },
            {
                onSuccess: (data) => router.push(`/session/${data.session_id}`),
                onError: (error: any) => alert(error.response?.data?.error || t('common.error')),
            }
        );
    };

    const handlePlacementTest = () => router.push('/placement/start');

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background dark:bg-background-dark">
            {/* Header with Premium Gradient-like style */}
            <View className="bg-primary dark:bg-primary-dark p-6 pt-16 pb-12 rounded-b-[40px] shadow-xl z-10">
                <View className="flex-row justify-between items-start mb-6">
                    <View>
                        <Text className="text-3xl font-bold text-white tracking-tight">
                            {t('dashboard.greeting', { name: user?.username })}
                        </Text>
                        {currentLevel && (
                            <View className="bg-primary-dark/30 self-start px-3 py-1 rounded-full mt-2">
                                <Text className="text-blue-100 font-medium text-sm">
                                    {t('dashboard.currentLevel', { level: currentLevel.level.title })}
                                </Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/profile')}
                        className="bg-white/20 p-2 rounded-full border border-white/30"
                    >
                        <Ionicons name="person" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Gamification Stats */}
                <View className="flex-row justify-between bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md">
                    <View className="flex-row items-center flex-1 justify-center">
                        <Text className="text-3xl mr-3">⚡</Text>
                        <View>
                            <Text className="text-white font-extrabold text-xl">{user?.total_xp || 0}</Text>
                            <Text className="text-blue-200 text-xs uppercase font-bold tracking-widest">{t('dashboard.xpTotal')}</Text>
                        </View>
                    </View>
                    <View className="w-[1px] bg-white/20 my-1 mx-2" />
                    <View className="flex-row items-center flex-1 justify-center">
                        <Text className="text-3xl mr-3">🔥</Text>
                        <View>
                            <Text className="text-white font-extrabold text-xl">{user?.current_streak || 0}</Text>
                            <Text className="text-blue-200 text-xs uppercase font-bold tracking-widest">{t('dashboard.days')}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 px-4 -mt-6 pt-2" showsVerticalScrollIndicator={false}>
                {/* Promo / Action Card */}
                {hasNotTakenPlacementTest ? (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        className="bg-surface dark:bg-surface-dark rounded-3xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-800"
                    >
                        <View className="w-12 h-12 bg-accent/20 rounded-full items-center justify-center mb-4">
                            <Text className="text-2xl">📚</Text>
                        </View>
                        <Text className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t('dashboard.startJourney')}</Text>
                        <Text className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            {t('dashboard.startDescription')}
                        </Text>
                        <Button
                            title={t('dashboard.placementTest')}
                            onPress={handlePlacementTest}
                            className="mb-3"
                        />
                        <Button
                            title={t('dashboard.startA1')}
                            onPress={handleStartSession}
                            variant="outline"
                            loading={startSession.isPending}
                        />
                    </MotiView>
                ) : currentLevel ? (
                    <MotiView
                        from={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-surface dark:bg-surface-dark rounded-3xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-800"
                    >
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">
                                {currentLevel.level.title}
                            </Text>
                            <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                <Text className="text-green-700 dark:text-green-400 text-xs font-bold">ACTIVE</Text>
                            </View>
                        </View>

                        <View className="mb-6">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('dashboard.progress')}</Text>
                                <Text className="text-sm font-bold text-primary dark:text-primary-light">
                                    {Math.round(currentLevel.completion_percentage)}%
                                </Text>
                            </View>
                            <View className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${currentLevel.completion_percentage}%` }}
                                />
                            </View>
                        </View>

                        <View className="flex-row justify-between mb-6">
                            <View className="items-center flex-1">
                                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {currentLevel.total_attempts}
                                </Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">{t('dashboard.attempts')}</Text>
                            </View>
                            <View className="w-[1px] bg-gray-200 dark:bg-gray-700 h-10 self-center" />
                            <View className="items-center flex-1">
                                <Text className="text-2xl font-bold text-success dark:text-success">
                                    {Math.round(currentLevel.accuracy_percentage)}%
                                </Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">{t('dashboard.accuracy')}</Text>
                            </View>
                        </View>

                        <Button
                            title={t('dashboard.continueLearning')}
                            onPress={handleStartSession}
                            loading={startSession.isPending}
                            className="w-full shadow-md shadow-blue-500/20"
                        />
                    </MotiView>
                ) : null}

                {/* Quick Actions Grid */}
                <Text className="text-lg font-bold mb-4 text-gray-800 dark:text-white ml-2">{t('dashboard.quickActions')}</Text>
                <View className="flex-row flex-wrap gap-4 mb-8">
                    <TouchableOpacity
                        onPress={() => router.push('/practice')}
                        className="flex-1 min-w-[45%] bg-surface dark:bg-surface-dark rounded-2xl p-5 shadow-sm items-center border border-gray-100 dark:border-gray-800"
                    >
                        <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mb-3">
                            <Ionicons name="repeat" size={24} color="#3B82F6" />
                        </View>
                        <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.practice')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/levels')}
                        className="flex-1 min-w-[45%] bg-surface dark:bg-surface-dark rounded-2xl p-5 shadow-sm items-center border border-gray-100 dark:border-gray-800"
                    >
                        <View className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full items-center justify-center mb-3">
                            <Ionicons name="layers" size={24} color="#8B5CF6" />
                        </View>
                        <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.levels')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/progress')}
                        className="flex-1 min-w-[45%] bg-surface dark:bg-surface-dark rounded-2xl p-5 shadow-sm items-center border border-gray-100 dark:border-gray-800"
                    >
                        <View className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-3">
                            <Ionicons name="stats-chart" size={24} color="#10B981" />
                        </View>
                        <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.stats')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/profile')}
                        className="flex-1 min-w-[45%] bg-surface dark:bg-surface-dark rounded-2xl p-5 shadow-sm items-center border border-gray-100 dark:border-gray-800"
                    >
                        <View className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center mb-3">
                            <Ionicons name="person" size={24} color="#F59E0B" />
                        </View>
                        <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.profile')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Spacer */}
                <View className="h-8" />
            </ScrollView>
        </View>
    );
}
