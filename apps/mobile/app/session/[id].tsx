import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useNextActivity, useSubmitActivity, useCompleteSession } from '@alf/shared';
import Button from '../../components/Button';
import type { Session, Activity } from '@alf/shared';

// Activity renderers
import MCQActivity from '../../components/activity/MCQActivity';
import FillBlankActivity from '../../components/activity/FillBlankActivity';
import MatchingActivity from '../../components/activity/MatchingActivity';
import DragOrderActivity from '../../components/activity/DragOrderActivity';
import ConjugationActivity from '../../components/activity/ConjugationActivity';
import MultipleAnswerActivity from '../../components/activity/MultipleAnswerActivity';
import TextInputActivity from '../../components/activity/TextInputActivity';
import DicteeActivity from '../../components/activity/DicteeActivity';

export default function SessionScreen() {
    const { id: sessionId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [currentAnswer, setCurrentAnswer] = useState<any>(null);
    const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<number>(Date.now());

    // Fetch session data (which contains next activity)
    const { data: sessionData, isLoading, refetch } = useNextActivity(sessionId);
    const submitMutation = useSubmitActivity(sessionId);
    const completeMutation = useCompleteSession();

    const activity = sessionData?.activity;
    const progress = sessionData?.progress;
    const isRetry = sessionData?.is_retry || false;

    // Log activity loading
    useEffect(() => {
        if (activity) {
            console.log('[SessionScreen] New activity loaded:', {
                id: activity.id,
                type: activity.resourcetype,
                question: activity.question_text?.substring(0, 50)
            });
            setCurrentAnswer(null);
            setFeedback(null);
            setFeedbackMessage(null);
            setStartTime(Date.now());
        }
    }, [activity?.id]);

    const handleAnswer = (answer: any) => {
        console.log('[SessionScreen] Answer received:', { answer, type: typeof answer });
        setCurrentAnswer(answer);

        // Auto-submit for activities with built-in verify buttons
        const activityType = activity?.resourcetype;
        const hasBuiltInVerify = [
            'TextInputActivity',
            'DragOrderActivity',
            'MultipleAnswerActivity'
        ].includes(activityType || '');

        if (hasBuiltInVerify) {
            handleSubmit(answer);
        }
    };

    const handleSubmit = async (answerOverride?: any) => {
        const answerToSubmit = answerOverride !== undefined ? answerOverride : currentAnswer;

        if (!activity || answerToSubmit === null) {
            console.log('[SessionScreen] Cannot submit - missing activity or answer');
            return;
        }

        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        console.log('[SessionScreen] Submitting answer:', {
            activity_id: activity.id,
            answer: answerToSubmit,
            timeSpent
        });

        submitMutation.mutate(
            {
                activity_id: activity.id,
                user_answer: answerToSubmit,
                time_spent: timeSpent,
            },
            {
                onSuccess: (data) => {
                    console.log('[SessionScreen] Submit response:', data);
                    if (data.is_correct) {
                        setFeedback('success');
                        setFeedbackMessage('Correct! 🎉');
                    } else {
                        setFeedback('error');
                        setFeedbackMessage(data.feedback || 'Incorrect');
                    }
                },
                onError: (error: any) => {
                    console.error('[SessionScreen] Submit error:', error);
                    setFeedback('error');
                    setFeedbackMessage('Erreur lors de la soumission');
                },
            }
        );
    };

    const handleNext = () => {
        console.log('[SessionScreen] Moving to next activity');
        setFeedback(null);
        setFeedbackMessage(null);
        setCurrentAnswer(null);
        refetch();
    };

    const handleComplete = async () => {
        console.log('[SessionScreen] Completing session');
        completeMutation.mutate(sessionId, {
            onSuccess: (data) => {
                console.log('[SessionScreen] Session complete:', data);
                router.push({
                    pathname: '/session-complete',
                    params: {
                        sessionId,
                        passed: String(data.passed),
                        accuracy: data.accuracy,
                        outcome: data.outcome,
                    },
                });
            },
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Session complete or No Activity
    if (sessionData?.session_complete || (!isLoading && !activity)) {
        return (
            <View className="flex-1 items-center justify-center p-4">
                <Text className="text-2xl font-bold mb-4">
                    {sessionData?.session_complete ? "Session Terminée!" : "Aucune activité"}
                </Text>
                <Text className="text-lg text-gray-700 mb-6 text-center">
                    {sessionData?.session_complete
                        ? "Vous avez complété toutes les activités."
                        : "Aucune activité disponible pour ce niveau."}
                </Text>

                {sessionData?.session_complete ? (
                    <Button
                        title="Voir les Résultats"
                        onPress={handleComplete}
                        loading={completeMutation.isPending}
                    />
                ) : (
                    <Button
                        title="Retour"
                        onPress={() => router.back()}
                    />
                )}
            </View>
        );
    }

    // Determine if activity has built-in verify button
    const activityType = activity?.resourcetype;
    const hasBuiltInVerify = [
        'TextInputActivity',
        'DragOrderActivity',
        'MultipleAnswerActivity'
    ].includes(activityType || '');

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Progress bar */}
            {progress && (
                <View className="bg-white p-4 border-b border-gray-200">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm text-gray-600">
                            Activité {progress.completed + 1}/{progress.target}
                        </Text>
                        <Text className="text-sm text-gray-600">
                            {Math.round(progress.percentage)}%
                        </Text>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                            className="h-full bg-blue-500"
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </View>
                    {isRetry && (
                        <Text className="text-xs text-orange-600 mt-2">
                            🔄 Activité échouée précédemment - Essayez encore!
                        </Text>
                    )}
                </View>
            )}

            {/* Activity */}
            <View className="p-4">
                {activity && renderActivity(activity, handleAnswer, feedback !== null, feedback, feedback === 'error' ? feedbackMessage?.split(": ")[1] : null)}
            </View>

            {/* Feedback - Keep visible longer */}
            {feedback && (
                <View
                    className={`mx-4 p-6 rounded-xl mb-4 ${feedback === 'success' ? 'bg-green-100 border-2 border-green-500' : 'bg-red-100 border-2 border-red-500'
                        }`}
                >
                    <Text
                        className={`text-xl font-bold text-center mb-2 ${feedback === 'success' ? 'text-green-700' : 'text-red-700'
                            }`}
                    >
                        {feedback === 'success' ? '✅ Correct!' : '❌ Incorrect'}
                    </Text>
                    <Text className="text-center text-gray-800">{feedbackMessage}</Text>
                </View>
            )}

            {/* Actions - Only show verify for activities without built-in buttons */}
            <View className="p-4 pb-8">
                {feedback ? (
                    <Button
                        title="Suivant →"
                        onPress={handleNext}
                    />
                ) : !hasBuiltInVerify ? (
                    <Button
                        title="Vérifier"
                        onPress={() => handleSubmit()}
                        disabled={currentAnswer === null}
                        loading={submitMutation.isPending}
                    />
                ) : null}
            </View>
        </ScrollView>
    );
}

function renderActivity(
    activity: Activity,
    onAnswer: (answer: any) => void,
    disabled: boolean,
    feedbackStatus: 'success' | 'error' | null,
    correctAnswerData: any
) {
    console.log('[SessionScreen] Rendering activity:', activity.resourcetype);

    switch (activity.resourcetype) {
        case 'MCQActivity':
            return (
                <MCQActivity
                    key={activity.id} // Force reset state
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus ? (feedbackStatus === 'success' ? 'success' : 'error') : null}
                    correctAnswer={correctAnswerData}
                />
            );
        case 'FillBlankActivity':
            return (
                <FillBlankActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                />
            );
        case 'MatchingActivity':
            return (
                <MatchingActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                />
            );
        case 'DragOrderActivity':
            return (
                <DragOrderActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                />
            );
        case 'ConjugationActivity':
            return (
                <ConjugationActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                />
            );
        case 'MultipleAnswerActivity':
            return (
                <MultipleAnswerActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                />
            );
        case 'TextInputActivity':
            return (
                <TextInputActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                />
            );
        case 'DicteeActivity':
            return (
                <DicteeActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                />
            );
        default:
            return <Text>Type d'activité non supporté: {(activity as any).resourcetype}</Text>;
    }
}
