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

// Feedback components
import DragOrderFeedback from '../../components/activity/feedback/DragOrderFeedback';

function genUUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default function SessionScreen() {
    const { id: sessionId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [currentAnswer, setCurrentAnswer] = useState<any>(null);
    const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [correctAnswer, setCorrectAnswer] = useState<any>(null);

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
            setExplanation(null);
            setCorrectAnswer(null);
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
                client_attempt_uuid: genUUIDv4(),
            },
            {
                onSuccess: (data) => {
                    console.log('[SessionScreen] Submit response:', data);
                    setExplanation(data.explanation || null);
                    setCorrectAnswer(data.correct_answer ?? null);

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
                {activity && renderActivity(
                    activity,
                    handleAnswer,
                    feedback !== null,
                    feedback,
                    correctAnswer
                )}
            </View>

            {/* Feedback with specialized components */}
            {feedback && (
                <View className="mx-4 mb-4">
                    <View
                        className={`p-6 rounded-xl mb-4 ${feedback === 'success'
                                ? 'bg-green-100 border-2 border-green-500'
                                : 'bg-red-100 border-2 border-red-500'
                            }`}
                    >
                        <Text
                            className={`text-xl font-bold text-center mb-2 ${feedback === 'success' ? 'text-green-700' : 'text-red-700'
                                }`}
                        >
                            {feedback === 'success' ? '✅ Correct!' : '❌ Incorrect'}
                        </Text>

                        {/* Explanation (for all activities) */}
                        {!!explanation && (
                            <View className="mt-4 p-4 rounded-lg bg-white border border-gray-200">
                                <Text className="text-sm font-semibold text-gray-800 mb-1">
                                    Explication
                                </Text>
                                <Text className="text-sm text-gray-700">
                                    {explanation}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Activity-specific feedback */}
                    {feedback === 'error' && renderActivityFeedback(
                        activity,
                        currentAnswer,
                        correctAnswer
                    )}
                </View>
            )}

            {/* Actions */}
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
    correctAnswer: any
) {
    console.log('[SessionScreen] Rendering activity:', activity.resourcetype);

    switch (activity.resourcetype) {
        case 'MCQActivity':
            return (
                <MCQActivity
                    key={activity.id}
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus}
                    correctAnswer={correctAnswer}
                />
            );
        case 'FillBlankActivity':
            return (
                <FillBlankActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus}
                    correctAnswer={correctAnswer}
                />
            );
        case 'MatchingActivity':
            return (
                <MatchingActivity
                    key={activity.id}
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus}
                    correctAnswer={correctAnswer}
                />
            );
        case 'DragOrderActivity':
            return (
                <DragOrderActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus}
                    correctAnswer={correctAnswer}
                />
            );
        case 'ConjugationActivity':
            return (
                <ConjugationActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus}
                    correctAnswer={correctAnswer}
                />
            );
        case 'MultipleAnswerActivity':
            return (
                <MultipleAnswerActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus}
                    correctAnswer={correctAnswer}
                />
            );
        case 'TextInputActivity':
            return (
                <TextInputActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus}
                    correctAnswer={correctAnswer}
                />
            );
        case 'DicteeActivity':
            return (
                <DicteeActivity
                    activity={activity}
                    onAnswer={onAnswer}
                    disabled={disabled}
                    feedback={feedbackStatus}
                    correctAnswer={correctAnswer}
                />
            );
        default:
            return <Text>Type d'activité non supporté: {(activity as any).resourcetype}</Text>;
    }
}

function renderActivityFeedback(
    activity: Activity,
    userAnswer: any,
    correctAnswer: any
) {
    switch (activity.resourcetype) {
        case 'DragOrderActivity':
            return (
                <DragOrderFeedback
                    userAnswer={userAnswer}
                    correctAnswer={correctAnswer}
                />
            );
        // MatchingActivity feedback is built into the component itself
        // Other activities can be added here as needed
        default:
            return null;
    }
}