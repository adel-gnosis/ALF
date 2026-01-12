import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../services/api';
import Button from '../../components/Button';
import MCQActivity from '../../components/activity/MCQActivity';
import FillBlankActivity from '../../components/activity/FillBlankActivity';
import MatchingActivity from '../../components/activity/MatchingActivity';
import { Ionicons } from '@expo/vector-icons';

export default function LessonScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();

    // State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentAnswer, setCurrentAnswer] = useState<any>(null);
    const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    // Fetch Lesson Data
    const { data: lesson, isLoading } = useQuery({
        queryKey: ['lesson', id],
        queryFn: async () => {
            const res = await api.get(`/lessons/${id}/`);
            return res.data;
        }
    });

    const submitMutation = useMutation({
        mutationFn: async (data: { activityId: number, answer: any }) => {
            const res = await api.post(`/activity/${data.activityId}/submit/`, { answer: data.answer });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.correct) {
                setFeedback('success');
                queryClient.invalidateQueries({ queryKey: ['progress'] });
            } else {
                setFeedback('error');
                setFeedbackMessage(data.feedback || `Correct answer: ${JSON.stringify(data.correct_answer)}`);
            }
        }
    });

    if (isLoading || !lesson) return <ActivityIndicator className="mt-20" size="large" />;

    const activities = lesson.activities || [];
    const currentActivity = activities[currentIndex];

    // Handlers
    const handleCheck = () => {
        if (!currentActivity || currentAnswer === null) return;
        submitMutation.mutate({ activityId: currentActivity.id, answer: currentAnswer });
    };

    const handleNext = () => {
        setFeedback(null);
        setCurrentAnswer(null);
        setFeedbackMessage(null);
        if (currentIndex < activities.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsComplete(true);
        }
    };

    const renderActivity = () => {
        if (!currentActivity) return <Text>No activities found.</Text>;

        const props = {
            activity: currentActivity,
            onAnswer: (ans: any) => setCurrentAnswer(ans),
            disabled: submitMutation.isPending || !!feedback,
        };


        switch (currentActivity.resourcetype) {
            case 'MCQActivity': return <MCQActivity {...props} />;
            case 'FillBlankActivity': return <FillBlankActivity {...props} />;
            case 'MatchingActivity': return <MatchingActivity {...props} />;
            default: return <Text>Unknown Activity Type: {currentActivity.resourcetype}</Text>;
        }
    };

    // Completion View
    if (isComplete) {
        return (
            <View className="flex-1 bg-white items-center justify-center p-6">
                <Ionicons name="trophy" size={80} color="#fbbf24" className="mb-6" />
                <Text className="text-3xl font-bold text-gray-800 mb-2">Leçon Terminée!</Text>
                <Text className="text-lg text-gray-600 mb-8 text-center">You have completed {lesson.title}.</Text>
                <Button title="Continue" onPress={() => router.back()} />
            </View>
        );
    }

    const progressPercent = ((currentIndex) / activities.length) * 100;

    return (
        <View className="flex-1 bg-white pt-12 px-6 pb-8">
            {/* Header / Progress */}
            <View className="flex-row items-center mb-8">
                <Ionicons name="close" size={24} color="gray" onPress={() => router.back()} />
                <View className="flex-1 h-3 bg-gray-200 rounded-full mx-4 overflow-hidden">
                    <View
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                    />
                </View>
            </View>

            {/* Content */}
            <View className="flex-1">
                {renderActivity()}
            </View>

            {/* Footer */}
            <View>
                {feedback === 'success' && (
                    <View className="bg-green-100 p-4 rounded-xl mb-4 flex-row items-center">
                        <Ionicons name="checkmark-circle" size={30} color="green" />
                        <Text className="text-green-800 font-bold ml-2 text-lg">Correct!</Text>
                    </View>
                )}
                {feedback === 'error' && (
                    <View className="bg-red-100 p-4 rounded-xl mb-4">
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="close-circle" size={30} color="red" />
                            <Text className="text-red-800 font-bold ml-2 text-lg">Incorrect!</Text>
                        </View>
                        {feedbackMessage && <Text className="text-red-700 ml-9">{feedbackMessage}</Text>}
                    </View>
                )}

                {feedback ? (
                    <Button title="Continue" onPress={handleNext} variant={feedback === 'error' ? 'danger' : 'primary'} />
                ) : (
                    <Button
                        title="Check Answer"
                        onPress={handleCheck}
                        disabled={currentAnswer === null || submitMutation.isPending}
                        loading={submitMutation.isPending}
                    />

                )}
            </View>
        </View>
    );
}
