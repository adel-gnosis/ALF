import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress } from '../../services/progressService';
import { useStartSession } from '../../services/sessionService';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
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
            <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
                <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'timing', duration: 400 }}
                >
                    <ActivityIndicator size="large" color="#3B82F6" />
                </MotiView>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900">
            {/* Animated Header with Gradient */}
            <MotiView
                from={{ translateY: -100, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 90 }}
            >
                <LinearGradient
                    colors={['#3B82F6', '#2563EB', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="pt-16 pb-8 px-6 rounded-b-[32px]"
                    style={{ shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 }}
                >
                    <View className="flex-row justify-between items-start mb-6">
                        <MotiView
                            from={{ translateX: -50, opacity: 0 }}
                            animate={{ translateX: 0, opacity: 1 }}
                            transition={{ delay: 200 }}
                        >
                            <Text className="text-white/80 text-sm font-medium mb-1">
                                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </Text>
                            <Text className="text-3xl font-bold text-white mb-2">
                                Bonjour, {user?.username}! 👋
                            </Text>
                            {currentLevel && (
                                <View className="bg-white/20 self-start px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/30">
                                    <Text className="text-white font-semibold text-xs">
                                        📚 {currentLevel.level.title}
                                    </Text>
                                </View>
                            )}
                        </MotiView>
                        
                        <MotiView
                            from={{ scale: 0, rotate: '-90deg' }}
                            animate={{ scale: 1, rotate: '0deg' }}
                            transition={{ delay: 300, type: 'spring' }}
                        >
                            <TouchableOpacity
                                onPress={() => router.push('/profile')}
                                className="bg-white/20 p-3 rounded-2xl border border-white/30 backdrop-blur-md"
                            >
                                <Ionicons name="person-circle-outline" size={28} color="white" />
                            </TouchableOpacity>
                        </MotiView>
                    </View>

                    {/* Gamification Stats Cards */}
                    <View className="flex-row gap-3">
                        <MotiView
                            from={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 400, type: 'spring' }}
                            className="flex-1 bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20"
                        >
                            <View className="flex-row items-center">
                                <View className="w-12 h-12 bg-amber-400/30 rounded-full items-center justify-center mr-3 border-2 border-amber-300/50">
                                    <Text className="text-2xl">⚡</Text>
                                </View>
                                <View>
                                    <Text className="text-white font-bold text-2xl">{user?.total_xp || 0}</Text>
                                    <Text className="text-blue-100 text-xs font-medium">XP Total</Text>
                                </View>
                            </View>
                        </MotiView>

                        <MotiView
                            from={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 500, type: 'spring' }}
                            className="flex-1 bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20"
                        >
                            <View className="flex-row items-center">
                                <View className="w-12 h-12 bg-orange-400/30 rounded-full items-center justify-center mr-3 border-2 border-orange-300/50">
                                    <Text className="text-2xl">🔥</Text>
                                </View>
                                <View>
                                    <Text className="text-white font-bold text-2xl">{user?.current_streak || 0}</Text>
                                    <Text className="text-blue-100 text-xs font-medium">Jours</Text>
                                </View>
                            </View>
                        </MotiView>
                    </View>
                </LinearGradient>
            </MotiView>

            <ScrollView className="flex-1 px-5 -mt-4" showsVerticalScrollIndicator={false}>
                {/* Main Action Card */}
                {hasNotTakenPlacementTest ? (
                    <MotiView
                        from={{ opacity: 0, translateY: 30, scale: 0.95 }}
                        animate={{ opacity: 1, translateY: 0, scale: 1 }}
                        transition={{ delay: 600, type: 'spring', damping: 15 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg mb-6 border border-gray-100 dark:border-gray-700"
                    >
                        <View className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl items-center justify-center mb-4">
                            <Text className="text-3xl">🎯</Text>
                        </View>
                        <Text className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                            Commencez votre aventure
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-base">
                            Découvrez votre niveau et commencez à apprendre le français de manière personnalisée
                        </Text>
                        <Button
                            title="🎓 Test de placement"
                            onPress={handlePlacementTest}
                            className="mb-3"
                        />
                        <Button
                            title="Commencer au niveau A1"
                            onPress={handleStartSession}
                            variant="outline"
                            loading={startSession.isPending}
                        />
                    </MotiView>
                ) : currentLevel ? (
                    <MotiView
                        from={{ opacity: 0, translateY: 30, scale: 0.95 }}
                        animate={{ opacity: 1, translateY: 0, scale: 1 }}
                        transition={{ delay: 600, type: 'spring', damping: 15 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg mb-6 border border-gray-100 dark:border-gray-700"
                    >
                        <View className="flex-row justify-between items-center mb-5">
                            <View>
                                <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                    {currentLevel.level.title}
                                </Text>
                                <Text className="text-gray-500 dark:text-gray-400 text-sm">
                                    Continue ton apprentissage
                                </Text>
                            </View>
                            <View className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full">
                                <Text className="text-green-700 dark:text-green-400 text-xs font-bold">✓ ACTIF</Text>
                            </View>
                        </View>

                        {/* Progress Bar with Animation */}
                        <View className="mb-6">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400">Progression</Text>
                                <Text className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {Math.round(currentLevel.completion_percentage)}%
                                </Text>
                            </View>
                            <View className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <MotiView
                                    from={{ width: 0 }}
                                    animate={{ width: `${currentLevel.completion_percentage}%` }}
                                    transition={{ delay: 800, type: 'spring', damping: 20 }}
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                                />
                            </View>
                        </View>

                        {/* Stats Grid */}
                        <View className="flex-row gap-3 mb-6">
                            <View className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                                <Text className="text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1 uppercase">Tentatives</Text>
                                <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {currentLevel.total_attempts}
                                </Text>
                            </View>
                            <View className="flex-1 bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800">
                                <Text className="text-green-600 dark:text-green-400 text-xs font-semibold mb-1 uppercase">Précision</Text>
                                <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {Math.round(currentLevel.accuracy_percentage)}%
                                </Text>
                            </View>
                        </View>

                        <Button
                            title="🚀 Continuer l'apprentissage"
                            onPress={handleStartSession}
                            loading={startSession.isPending}
                            className="shadow-lg shadow-blue-500/30"
                        />
                    </MotiView>
                ) : null}

                {/* Quick Actions Grid with Stagger Animation */}
                <Text className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
                    Actions rapides
                </Text>
                <View className="flex-row flex-wrap gap-3 mb-8">
                    {[
                        { icon: 'repeat', color: '#3B82F6', bgColor: '#EFF6FF', label: 'Pratique', route: '/practice', delay: 700 },
                        { icon: 'layers', color: '#8B5CF6', bgColor: '#F5F3FF', label: 'Niveaux', route: '/levels', delay: 750 },
                        { icon: 'stats-chart', color: '#10B981', bgColor: '#ECFDF5', label: 'Progrès', route: '/progress', delay: 800 },
                        { icon: 'trophy', color: '#F59E0B', bgColor: '#FFFBEB', label: 'Classement', route: '/leaderboard', delay: 850 },
                    ].map((action, index) => (
                        <MotiView
                            key={action.label}
                            from={{ opacity: 0, scale: 0.8, translateY: 20 }}
                            animate={{ opacity: 1, scale: 1, translateY: 0 }}
                            transition={{ delay: action.delay, type: 'spring', damping: 15 }}
                            className="flex-1 min-w-[45%]"
                        >
                            <TouchableOpacity
                                onPress={() => router.push(action.route as any)}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm items-center border border-gray-100 dark:border-gray-700"
                                activeOpacity={0.7}
                            >
                                <View
                                    className="w-14 h-14 rounded-2xl items-center justify-center mb-3"
                                    style={{ backgroundColor: action.bgColor }}
                                >
                                    <Ionicons name={action.icon as any} size={26} color={action.color} />
                                </View>
                                <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    {action.label}
                                </Text>
                            </TouchableOpacity>
                        </MotiView>
                    ))}
                </View>

                <View className="h-8" />
            </ScrollView>
        </View>
    );
}