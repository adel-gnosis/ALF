import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { resolveMediaUrl } from "../../services/api";

type ActivityPair = {
  id: string;
  left: {
    value: string;
    rendered_value?: string;
    type?: 'text' | 'image';
  };
  right: {
    value: string;
    rendered_value?: string;
    type?: 'text' | 'image';
  };
};

type PairItem = {
  id: string;
  text: string;
  value: string;
  type: 'text' | 'image';
};

type MatchResult = {
  pair_id: string;
  right_value: string;
};

type Props = {
  activity: any;
  onAnswer: (answer: any) => void;
  disabled?: boolean;
  feedback?: 'success' | 'error' | null;
  correctAnswer?: any;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const COLORS = [
  { main: '#3B82F6', light: '#DBEAFE', glow: '#60A5FA' },
  { main: '#8B5CF6', light: '#EDE9FE', glow: '#A78BFA' },
  { main: '#EC4899', light: '#FCE7F3', glow: '#F472B6' },
  { main: '#F59E0B', light: '#FEF3C7', glow: '#FBBF24' },
  { main: '#10B981', light: '#D1FAE5', glow: '#34D399' },
  { main: '#06B6D4', light: '#CFFAFE', glow: '#22D3EE' },
];

export default function MatchingActivity({ activity, onAnswer, disabled, feedback, correctAnswer }: Props) {
  const { t } = useTranslation();
  const activityId = String(activity?.id ?? 'unknown');

  // Use pairs_v2
  const pairs: ActivityPair[] = activity?.pairs_v2 || [];

  const leftItems = useMemo<PairItem[]>(() => {
    return pairs.map((pair) => ({
      id: pair.id,
      text: pair.left?.rendered_value || pair.left?.value || '',
      type: pair.left?.type || 'text',
      value: pair.left?.value || ''
    }));
  }, [pairs]); // Changed dependency to pairs content

  const rightItems = useMemo<PairItem[]>(() => {
    const base = pairs.map((pair) => ({
      id: pair.id, // Keep ID for tracking correct match logic if needed
      text: pair.right?.rendered_value || pair.right?.value || '',
      type: pair.right?.type || 'text',
      value: pair.right?.value || ''
    }));
    return shuffleArray(base);
  }, [pairs]);

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // leftId -> rightId (original pair ID of the right item)
  const [submittedAnswer, setSubmittedAnswer] = useState<any>(null);

  const usedRightIds = useMemo(() => new Set(Object.values(matches)), [matches]);

  // ANIMATIONS
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Render content helper (supports Text or Image)
  const renderItemContent = (item: PairItem) => {
    if (item.type === 'image') {
      const imageUrl = resolveMediaUrl(item.value);
      if (!imageUrl) {
        return (
          <View className="w-full h-16 rounded-lg overflow-hidden bg-gray-100 items-center justify-center">
            <Text className="text-gray-400 text-xs">No Image</Text>
          </View>
        );
      }
      return (
        <View className="w-full h-16 rounded-lg overflow-hidden bg-gray-100 items-center justify-center">
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      );
    }
    // Default Text
    return (
      <Text className="font-bold text-gray-900 text-sm md:text-base flex-1 pr-2">
        {item.text}
      </Text>
    );
  };

  useEffect(() => {
    setSelectedLeftId(null);
    setMatches({});
    setSubmittedAnswer(null);

    entranceAnim.setValue(0);
    pulseAnim.setValue(0);

    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activityId]);

  useEffect(() => {
    pulseAnim.stopAnimation();
    if (!selectedLeftId) {
      pulseAnim.setValue(0);
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [selectedLeftId]);


  const handleLeftPress = (leftId: string) => {
    if (disabled) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // If already matched, unlink it
    if (matches[leftId]) {
      const newMatches = { ...matches };
      delete newMatches[leftId];
      setMatches(newMatches);
      setSelectedLeftId(null);
    } else {
      // Otherwise select/deselect
      setSelectedLeftId((prev) => (prev === leftId ? null : leftId));
    }
  };

  const handleRightPress = (rightId: string) => {
    if (disabled) return;

    // If already matched, unlink it (find which left was matched to this right)
    if (usedRightIds.has(rightId)) {
      const leftId = Object.keys(matches).find(key => matches[key] === rightId);
      if (leftId) {
        const newMatches = { ...matches };
        delete newMatches[leftId];
        setMatches(newMatches);
      }
      return;
    }

    if (!selectedLeftId) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newMatches = { ...matches, [selectedLeftId]: rightId };
    setMatches(newMatches);
    setSelectedLeftId(null);

    if (Object.keys(newMatches).length === leftItems.length) {
      // Generate the matches array for the backend
      const finalMatches = Object.entries(newMatches).map(([lId, rId]) => {
        const rightItem = rightItems.find(r => r.id === rId);
        return {
          pair_id: lId,
          right_value: rightItem?.value || rightItem?.text || ''
        };
      });

      const finalAnswer = { matches: finalMatches };
      setSubmittedAnswer(finalAnswer);
      onAnswer(finalAnswer);
    }
  };

  if (!pairs || pairs.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-gray-600 text-center">{t('activities.matching.noData')}</Text>
      </View>
    );
  }

  const isComplete = Object.keys(matches).length === leftItems.length;
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });

  // Parsing correct answer from backend for feedback
  // Safe cast or optional chaining
  const correctExpected: MatchResult[] | null =
    feedback && correctAnswer?.format === 'pairs_v2' && Array.isArray(correctAnswer.expected)
      ? correctAnswer.expected
      : null;

  return (
    <Animated.View
      className="w-full px-4"
      style={{
        opacity: entranceAnim,
      }}
    >
      {activity?.instruction && (
        <Text className="text-sm font-medium text-gray-500 mb-1 italic">
          {activity.instruction}
        </Text>
      )}
      {activity?.question_text && (
        <Text className="text-lg font-semibold text-gray-800 mb-6">
          {activity.question_text}
        </Text>
      )}

      <View className="w-full flex-row justify-between gap-3">
        {/* LEFT COLUMN */}
        <View className="flex-1">
          {leftItems.map((item, index) => {
            const isMatched = !!matches[item.id];
            const isSelected = selectedLeftId === item.id;
            const colorSet = COLORS[index % COLORS.length];

            // Check if this match is correct when feedback is shown
            let isCorrect = false;
            let isIncorrect = false;
            let correctRightValue = null;

            if (feedback && submittedAnswer && Array.isArray(submittedAnswer.matches) && correctExpected) {
              const userMatch = submittedAnswer.matches.find((m: any) => m.pair_id === item.id);
              const expectedMatch = correctExpected.find((m) => m.pair_id === item.id);

              if (userMatch && expectedMatch) {
                // Approximate check
                const userVal = userMatch.right_value;
                const expectedVal = expectedMatch.right_value;
                isCorrect = userVal === expectedVal;
                isIncorrect = !isCorrect;
                correctRightValue = expectedVal;

                if (isIncorrect) {
                  console.warn(`[Matching Debug] Mismatch for pair ${item.id} (${item.text}):
                    User sent: "${userVal}" (Type: ${typeof userVal})
                    Expected:  "${expectedVal}" (Type: ${typeof expectedVal})`);
                }
              }
            }

            const slideY = entranceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50 + index * 10, 0],
            });

            return (
              <Animated.View
                key={`left_${activityId}_${item.id}`}
                style={{
                  opacity: entranceAnim,
                  transform: [
                    { translateY: slideY },
                    { scale: isSelected && !isMatched ? pulseScale : 1 },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => handleLeftPress(item.id)}
                  activeOpacity={0.8}
                  disabled={disabled}
                  className="mb-3 rounded-2xl p-4 relative overflow-hidden flex-row items-center"
                  style={{
                    backgroundColor: isMatched ? colorSet.light : 'white',
                    borderWidth: 3,
                    borderColor: isMatched || isSelected ? colorSet.main : '#E5E7EB',
                    shadowColor: colorSet.main,
                    shadowOffset: { width: 0, height: isSelected && !isMatched ? 6 : 3 },
                    shadowOpacity: isSelected && !isMatched ? 0.25 : isMatched ? 0.15 : 0.08,
                    shadowRadius: isSelected && !isMatched ? 12 : 8,
                    elevation: isSelected && !isMatched ? 6 : 3,
                    minHeight: item.type === 'image' ? 80 : 60,
                  }}
                >
                  {/* Glow effect when selected */}
                  {isSelected && !isMatched && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colorSet.glow,
                        opacity: pulseOpacity.interpolate({
                          inputRange: [0.7, 1],
                          outputRange: [0.15, 0],
                        }),
                        borderRadius: 12,
                      }}
                    />
                  )}

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      {renderItemContent(item)}

                      {isCorrect && (
                        <View className="w-6 h-6 rounded-full items-center justify-center bg-green-500 ml-2">
                          <Text className="text-white text-sm font-bold">✓</Text>
                        </View>
                      )}
                      {isIncorrect && (
                        <View className="w-6 h-6 rounded-full items-center justify-center bg-red-500 ml-2">
                          <Text className="text-white text-sm font-bold">✗</Text>
                        </View>
                      )}
                    </View>

                    {/* Correction display */}
                    {isIncorrect && correctRightValue && (
                      <View className="mt-2 pt-2 border-t border-red-100">
                        <Text className="text-xs text-green-600 font-medium">
                          Correct: {correctRightValue}
                        </Text>
                        {/* Debug info for user to screenshot if needed */}
                        {/* <Text className="text-[10px] text-gray-400">Sent: {submittedAnswer?.matches?.find((m: any) => m.pair_id === item.id)?.right_value}</Text> */}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* RIGHT COLUMN */}
        <View className="flex-1">
          {rightItems.map((item, index) => {
            const isUsed = usedRightIds.has(item.id);
            const matchedLeftId = isUsed
              ? Object.keys(matches).find(lId => matches[lId] === item.id)
              : null;

            const matchedLeftIndex = matchedLeftId ? leftItems.findIndex(l => l.id === matchedLeftId) : -1;

            let isCorrect = false;
            let isIncorrect = false;

            if (feedback && matchedLeftId && submittedAnswer && Array.isArray(submittedAnswer.matches) && correctExpected) {
              const userMatch = submittedAnswer.matches.find((m: any) => m.pair_id === matchedLeftId);
              const expectedMatch = correctExpected.find((m) => m.pair_id === matchedLeftId);

              if (userMatch && expectedMatch) {
                isCorrect = userMatch.right_value === expectedMatch.right_value; // weak check
                if (userMatch.right_value === item.value) { // this item was chosen
                  isCorrect = userMatch.right_value === expectedMatch.right_value;
                  isIncorrect = !isCorrect;
                }
              }
            }

            const colorSet = matchedLeftIndex >= 0
              ? COLORS[matchedLeftIndex % COLORS.length]
              : { main: '#D1D5DB', light: '#F9FAFB', glow: '#9CA3AF' };

            const slideY = entranceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50 + index * 10, 0],
            });

            const isInteractive = selectedLeftId && !isUsed;

            return (
              <Animated.View
                key={`right_${item.id}`}
                style={{
                  opacity: entranceAnim,
                  transform: [
                    { translateY: slideY },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => handleRightPress(item.id)}
                  activeOpacity={0.8}
                  disabled={disabled || (!selectedLeftId && !isUsed)}
                  className="mb-3 rounded-2xl p-4 relative overflow-hidden flex-row items-center"
                  style={{
                    backgroundColor: isUsed ? colorSet.light : 'white',
                    borderWidth: 3,
                    borderColor: isUsed ? colorSet.main : isInteractive ? '#D1D5DB' : '#E5E7EB',
                    opacity: !selectedLeftId && !isUsed ? 0.6 : 1,
                    shadowColor: isUsed ? colorSet.main : '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isUsed ? 0.15 : 0.08,
                    shadowRadius: 8,
                    elevation: isUsed ? 3 : 2,
                    minHeight: item.type === 'image' ? 80 : 60,
                  }}
                >
                  {/* Subtle pulse when waiting for selection */}
                  {isInteractive && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#3B82F6',
                        opacity: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.08],
                        }),
                        borderRadius: 12,
                      }}
                    />
                  )}

                  <View className="flex-1 flex-row items-center justify-between">
                    {renderItemContent(item)}

                    {isCorrect && (
                      <View className="w-6 h-6 rounded-full items-center justify-center bg-green-500 ml-2">
                        <Text className="text-white text-sm font-bold">✓</Text>
                      </View>
                    )}
                    {isIncorrect && (
                      <View className="w-6 h-6 rounded-full items-center justify-center bg-red-500 ml-2">
                        <Text className="text-white text-sm font-bold">✗</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Progress */}
      <View className="mt-6 mb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-500">
            {t('activities.matching.progress')}
          </Text>
          <Text className="text-sm font-bold" style={{ color: isComplete ? '#10B981' : '#3B82F6' }}>
            {Object.keys(matches).length}/{leftItems.length}
          </Text>
        </View>

        <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <Animated.View
            style={{
              height: '100%',
              width: `${(Object.keys(matches).length / leftItems.length) * 100}%`,
              backgroundColor: isComplete ? '#10B981' : '#3B82F6',
              borderRadius: 9999,
            }}
          />
        </View>
      </View>
    </Animated.View>
  );
}
