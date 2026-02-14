import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useNextActivity, useSubmitActivity, useCompleteSession } from '@alf/shared';
import Button from '../../components/Button';
import type { Session, Activity } from '@alf/shared';

// Hooks
import { useGamification } from '../../hooks/useGamification';
import { useAudioFeedback } from '../../hooks/useAudioFeedback';
import { useHaptics } from '../../hooks/useHaptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Gamification Components
import FloatingXP from '../../components/gamification/FloatingXP';
import ComboBadge from '../../components/gamification/ComboBadge';
import SessionBonus from '../../components/gamification/SessionBonus';
import GameHUD from '../../components/session/GameHUD';
import ActivityStage from '../../components/session/ActivityStage';

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
    const insets = useSafeAreaInsets();

    const [currentAnswer, setCurrentAnswer] = useState<any>(null);
    const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | undefined>(undefined);

    const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [correctAnswer, setCorrectAnswer] = useState<any>(null);

    const [startTime, setStartTime] = useState<number>(Date.now());
    const [sessionXP, setSessionXP] = useState<number>(0); // Track actual XP from server

    // Gamification
    const gamification = useGamification();
    const { playSuccess, playError } = useAudioFeedback();
    const haptics = useHaptics();

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
            setCurrentAnswer(null);
            setFeedback(null);
            setFeedbackMessage(null);
            setStartTime(Date.now());
            setExplanation(null);
            setCorrectAnswer(null);
            setTapPosition(undefined);
        }
    }, [activity?.id]);

    // Handle Bonus Trigger
    useEffect(() => {
        if (gamification.shouldTriggerBonus) {
            gamification.awardSessionBonus();
        }
    }, [gamification.shouldTriggerBonus]);

    const handleAnswer = (answer: any, layout?: { x: number; y: number }) => {
        setCurrentAnswer(answer);
        if (layout) {
            setTapPosition(layout);
        }

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
            return;
        }

        const timeSpent = Math.floor((Date.now() - startTime) / 1000);

        submitMutation.mutate(
            {
                activity_id: activity.id,
                user_answer: answerToSubmit,
                time_spent: timeSpent,
                client_attempt_uuid: genUUIDv4(),
            },
            {
                onSuccess: (data) => {
                    setExplanation(data.explanation || null);
                    setCorrectAnswer(data.correct_answer ?? null);

                    // Track actual XP from server
                    const pointsEarned = data.points_earned || 0;
                    setSessionXP(prev => prev + pointsEarned);
                    gamification.registerAnswer(data.is_correct, pointsEarned, tapPosition);

                    if (data.is_correct) {
                        setFeedback('success');
                        setFeedbackMessage('Correct! 🎉');
                        playSuccess();
                        haptics.success();
                    } else {
                        setFeedback('error');
                        // Show clean user-friendly message (explanation is shown separately)
                        setFeedbackMessage('Incorrect');
                        playError();
                        haptics.error();
                    }
                },
                onError: (error: any) => {
                    setFeedback('error');
                    setFeedbackMessage('Erreur lors de la soumission');
                    haptics.error();
                },
            }
        );
    };

    const handleNext = () => {
        setFeedback(null);
        setFeedbackMessage(null);
        setCurrentAnswer(null);
        refetch();
    };

    const handleComplete = async () => {
        completeMutation.mutate(sessionId, {
            onSuccess: (data) => {
                gamification.resetSession();
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

    if (sessionData?.session_complete || (!isLoading && !activity)) {
        return (
            <View className="flex-1 items-center justify-center p-4">
                <Text className="text-2xl font-bold mb-4">
                    {sessionData?.session_complete ? "Session Terminée!" : "Aucune activité"}
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

    const activityType = activity?.resourcetype;
    const hasBuiltInVerify = [
        'TextInputActivity',
        'DragOrderActivity',
        'MultipleAnswerActivity'
    ].includes(activityType || '');

    return (
        <View className="flex-1 bg-slate-50">
            {/* Gamification Overlays */}
            <ComboBadge streak={gamification.correctStreak} />

            {gamification.xpAwards.map(award => (
                <FloatingXP
                    key={award.id}
                    id={award.id}
                    amount={award.amount}
                    startPosition={award.position}
                    onComplete={gamification.removeXpAward}
                />
            ))}

            <SessionBonus
                visible={gamification.showBonusOverlay}
                isPerfect={gamification.isPerfectStart}
                onDismiss={gamification.dismissBonusOverlay}
            />

            {/* Game HUD (Fixed Top) */}
            <GameHUD
                levelTitle={activity?.topic_title || "Session"}
                currentProgress={progress?.completed ?? 0}
                totalProgress={progress?.target ?? 0}
                xp={sessionXP}
                onClose={() => router.back()}
            />

            {/* Main Content Area (Scrollable Stage) */}
            <View className="flex-1 relative">
                <ActivityStage key={activity?.id || 'loading'}>
                    {activity && renderActivity(
                        activity,
                        handleAnswer,
                        feedback !== null,
                        feedback,
                        correctAnswer
                    )}
                </ActivityStage>
            </View>

            {/* Bottom Action Bar (Fixed) */}
            <View
                className="bg-white border-t border-gray-100 shadow-lg"
                style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 10,
                    paddingTop: 16,
                    paddingHorizontal: 16,
                    paddingBottom: Math.max(insets.bottom, 24) // Dynamic safe area + min padding
                }}
            >
                {/* Immediate Feedback Toast (In Action Bar) */}
                {feedback && (
                    <View className={`mb-4 flex-row items-center p-3 rounded-xl ${feedback === 'success' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                        <Text className="text-2xl mr-2">{feedback === 'success' ? '🎉' : '❌'}</Text>
                        <View className="flex-1">
                            <Text className={`font-bold ${feedback === 'success' ? 'text-green-800' : 'text-red-800'
                                }`}>
                                {feedbackMessage}
                            </Text>
                            {!!explanation && (
                                <Text className="text-xs text-gray-600 mt-1">{explanation}</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Primary Action Button */}
                {feedback ? (
                    <Button
                        key="continue-button"
                        title="CONTINUER"
                        onPress={handleNext}
                        variant="primary"
                    />
                ) : (
                    <Button
                        key="submit-button"
                        title={hasBuiltInVerify ? "..." : "VALIDER"}
                        onPress={() => handleSubmit()}
                        disabled={currentAnswer === null || hasBuiltInVerify}
                        loading={submitMutation.isPending}
                    />
                )}

                {/* Secondary Actions (Skip, etc.) - Placeholder */}
                {!feedback && !hasBuiltInVerify && (
                    <TouchableOpacity onPress={handleNext} className="mt-4 items-center">
                        <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">Passer</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

function renderActivity(
    activity: Activity,
    onAnswer: (answer: any, layout?: { x: number; y: number }) => void,
    disabled: boolean,
    feedbackStatus: 'success' | 'error' | null,
    correctAnswer: any
) {
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
                    key={activity.id}
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
                    key={activity.id}
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
                    key={activity.id}
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
                    key={activity.id}
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
                    key={activity.id}
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
                    key={activity.id}
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
        default:
            return null;
    }
}