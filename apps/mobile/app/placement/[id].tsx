import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    usePlacementQuestion,
    useSubmitPlacementAnswer,
    useCompletePlacementTest,
} from '../../services/placementService';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import type { Activity } from '../../types/session';

// Import activity renderers
import MCQActivity from '../../components/activity/MCQActivity';
import FillBlankActivity from '../../components/activity/FillBlankActivity';
import MatchingActivity from '../../components/activity/MatchingActivity';
import DragOrderActivity from '../../components/activity/DragOrderActivity';
import ConjugationActivity from '../../components/activity/ConjugationActivity';
import MultipleAnswerActivity from '../../components/activity/MultipleAnswerActivity';
import TextInputActivity from '../../components/activity/TextInputActivity';

export default function PlacementTestScreen() {
    const { id: sessionId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [currentAnswer, setCurrentAnswer] = useState<any>(null);
    const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
    const [levelChange, setLevelChange] = useState<'up' | 'down' | null>(null);

    const { data: questionData, isLoading, refetch } = usePlacementQuestion(sessionId);
    const submitAnswer = useSubmitPlacementAnswer(sessionId);
    const completeTest = useCompletePlacementTest();

    const activity = questionData?.activity;
    const currentLevel = questionData?.current_level;
    const progress = questionData?.progress;

    useEffect(() => {
        if (activity) {
            setCurrentAnswer(null);
            setFeedback(null);
            setLevelChange(null);
        }
    }, [activity?.id]);

    const handleSubmit = async () => {
        if (!activity || currentAnswer === null) return;

        submitAnswer.mutate(
            {
                activity_id: activity.id,
                user_answer: currentAnswer,
            },
            {
                onSuccess: (data) => {
                    setFeedback(data.is_correct ? 'success' : 'error');

                    if (data.leveled_up) {
                        setLevelChange('up');
                    } else if (data.leveled_down) {
                        setLevelChange('down');
                    }
                },
            }
        );
    };

    const handleNext = () => {
        // Check if we've completed all questions
        if (progress && progress.completed >= progress.max_questions - 1) {
            handleComplete();
        } else {
            setFeedback(null);
            setLevelChange(null);
            setCurrentAnswer(null);
            refetch();
        }
    };

    const handleComplete = () => {
        completeTest.mutate(sessionId, {
            onSuccess: (data) => {
                router.replace({
                    pathname: '/placement/complete',
                    params: {
                        sessionId,
                        determinedLevel: data.determined_level.id,
                        levelTitle: data.determined_level.title,
                        accuracy: data.accuracy,
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

    if (!activity) {
        return (
            <View className="flex-1 items-center justify-center p-4">
                <Text className="text-xl font-bold">Test Terminé!</Text>
                <Button title="Voir les Résultats" onPress={handleComplete} className="mt-4" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Progress Header */}
            <View className="bg-blue-500 p-4 pt-12">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white font-semibold">
                        Question {(progress?.completed || 0) + 1}/{progress?.max_questions || 12}
                    </Text>
                    <Text className="text-white font-semibold">
                        Niveau: {currentLevel?.cefr_code}
                    </Text>
                </View>
                <View className="h-2 bg-blue-300 rounded-full overflow-hidden">
                    <View
                        className="h-full bg-white"
                        style={{
                            width: `${((progress?.completed || 0) / (progress?.max_questions || 12)) * 100}%`,
                        }}
                    />
                </View>

                {/* Level change indicator */}
                {levelChange && (
                    <View className="mt-2 flex-row items-center justify-center">
                        <Ionicons
                            name={levelChange === 'up' ? 'arrow-up' : 'arrow-down'}
                            size={20}
                            color="white"
                        />
                        <Text className="text-white font-bold ml-2">
                            {levelChange === 'up' ? 'Niveau +1' : 'Niveau -1'}
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Activity */}
                <View className="mb-4" key={activity.id}>
                    {renderActivity(activity, setCurrentAnswer, feedback !== null)}
                </View>

                {/* Feedback */}
                {feedback && (
                    <View
                        className={`p-4 rounded-lg mb-4 ${feedback === 'success' ? 'bg-green-50' : 'bg-red-50'
                            }`}
                    >
                        <Text
                            className={`text-lg font-semibold ${feedback === 'success' ? 'text-green-700' : 'text-red-700'
                                }`}
                        >
                            {feedback === 'success' ? '✓ Correct!' : '✗ Incorrect'}
                        </Text>
                    </View>
                )}

                {/* Actions */}
                <View>
                    {feedback ? (
                        <Button title="Question Suivante" onPress={handleNext} />
                    ) : (
                        <Button
                            title="Vérifier"
                            onPress={handleSubmit}
                            disabled={currentAnswer === null}
                            loading={submitAnswer.isPending}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

function renderActivity(
    activity: Activity,
    onAnswer: (answer: any) => void,
    disabled: boolean
) {
    switch (activity.resourcetype) {
        case 'MCQActivity':
            return <MCQActivity activity={activity} onAnswer={onAnswer} disabled={disabled} />;
        case 'FillBlankActivity':
            return <FillBlankActivity activity={activity} onAnswer={onAnswer} disabled={disabled} />;
        case 'MatchingActivity':
            return <MatchingActivity activity={activity} onAnswer={onAnswer} disabled={disabled} />;
        case 'DragOrderActivity':
            return <DragOrderActivity activity={activity} onAnswer={onAnswer} disabled={disabled} />;
        case 'ConjugationActivity':
            return <ConjugationActivity activity={activity} onAnswer={onAnswer} disabled={disabled} />;
        case 'MultipleAnswerActivity':
            return (
                <MultipleAnswerActivity activity={activity} onAnswer={onAnswer} disabled={disabled} />
            );
        case 'TextInputActivity':
            return <TextInputActivity activity={activity} onAnswer={onAnswer} disabled={disabled} />;
        default:
            return <Text>Type d'activité non supporté</Text>;
    }
}
