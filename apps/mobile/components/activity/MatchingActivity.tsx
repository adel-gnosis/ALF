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
} from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  activity: any;
  onAnswer: (answer: any) => void;
  disabled?: boolean;
  feedback?: 'success' | 'error' | null;
  correctAnswer?: Record<string, string>;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function shuffleArray<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tinyHash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
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
  const pairs = activity?.pairs_v2 || [];

  const leftItems = useMemo(() => {
    return pairs.map((pair: any) => ({
      id: pair.id,
      text: pair.left?.rendered_value || pair.left?.value || '',
    }));
  }, [activityId]);

  const rightItems = useMemo(() => {
    const base = pairs.map((pair: any) => ({
      id: pair.id, // We'll keep the pair ID to know what it SHOULD match to easily on the frontend if needed, but we shuffle.
      text: pair.right?.rendered_value || pair.right?.value || '',
    }));
    return shuffleArray(base);
  }, [activityId]);

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // leftId -> rightId (in this case both are same if correct, but user can match any)
  const [submittedAnswer, setSubmittedAnswer] = useState<any>(null);

  const usedRightIds = useMemo(() => new Set(Object.values(matches)), [matches]);

  const entranceAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef<Record<string, Animated.Value>>({}).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSelectedLeftId(null);
    setMatches({});
    setSubmittedAnswer(null);
    Object.keys(itemAnims).forEach(key => delete itemAnims[key]);

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

  const getItemAnim = (key: string) => {
    if (!itemAnims[key]) {
      itemAnims[key] = new Animated.Value(0);
    }
    return itemAnims[key];
  };

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
      // Format: {"matches":[{"pair_id":"p_001","right_value":"and"}, ...]}
      const finalMatches = Object.entries(newMatches).map(([lId, rId]) => {
        const rightItem = rightItems.find(r => r.id === rId);
        return {
          pair_id: lId,
          right_value: rightItem?.text || ''
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
  // Format: { format: 'pairs_v2', expected: [...], readable: {...} }
  const correctExpected = feedback && correctAnswer?.format === 'pairs_v2' ? correctAnswer.expected : null;

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

            if (feedback && submittedAnswer) {
              const userMatch = submittedAnswer.matches.find((m: any) => m.pair_id === item.id);
              const expectedMatch = correctExpected?.find((m: any) => m.pair_id === item.id);

              if (userMatch && expectedMatch) {
                isCorrect = userMatch.right_value === expectedMatch.right_value;
                isIncorrect = !isCorrect;
                correctRightValue = expectedMatch.right_value;
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
                  className="mb-3 rounded-2xl p-5 relative overflow-hidden"
                  style={{
                    backgroundColor: isMatched ? colorSet.light : 'white',
                    borderWidth: 3,
                    borderColor: isMatched || isSelected ? colorSet.main : '#E5E7EB',
                    shadowColor: colorSet.main,
                    shadowOffset: { width: 0, height: isSelected && !isMatched ? 6 : 3 },
                    shadowOpacity: isSelected && !isMatched ? 0.25 : isMatched ? 0.15 : 0.08,
                    shadowRadius: isSelected && !isMatched ? 12 : 8,
                    elevation: isSelected && !isMatched ? 6 : 3,
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
                          range: [0.7, 1],
                          outputRange: [0.15, 0],
                        }),
                        borderRadius: 12,
                      }}
                    />
                  )}

                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-gray-900 text-base flex-1 pr-2">
                      {item.text}
                    </Text>
                    {isCorrect && (
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#10B981' }}
                      >
                        <Text className="text-white text-lg font-bold">✓</Text>
                      </View>
                    )}
                    {isIncorrect && (
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#EF4444' }}
                      >
                        <Text className="text-white text-lg font-bold">✗</Text>
                      </View>
                    )}
                  </View>

                  {isIncorrect && correctRightValue && (
                    <View className="mt-3 pt-3 border-t border-red-300">
                      <Text className="text-xs text-gray-500 mb-2">{t('activities.matching.shouldMatch')}</Text>
                      <View
                        className="px-4 py-3 rounded-xl border-2"
                        style={{
                          backgroundColor: '#D1FAE5',
                          borderColor: '#10B981'
                        }}
                      >
                        <Text className="font-bold text-green-800 text-center">
                          {correctRightValue}
                        </Text>
                      </View>
                    </View>
                  )}
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

            if (feedback && matchedLeftId && submittedAnswer) {
              const userMatch = submittedAnswer.matches.find((m: any) => m.pair_id === matchedLeftId);
              const expectedMatch = correctExpected?.find((m: any) => m.pair_id === matchedLeftId);

              if (userMatch && expectedMatch) {
                isCorrect = userMatch.right_value === item.text && item.text === expectedMatch.right_value;
                isIncorrect = userMatch.right_value === item.text && item.text !== expectedMatch.right_value;
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
                key={`right_${item.id}_${index}`} // Use index in key because multiple right items could have same text (though unlikely with pairs_v2)
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
                  className="mb-3 rounded-2xl p-5 relative overflow-hidden"
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

                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-gray-900 text-base flex-1 pr-2">
                      {item.text}
                    </Text>
                    {isCorrect && (
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#10B981' }}
                      >
                        <Text className="text-white text-lg font-bold">✓</Text>
                      </View>
                    )}
                    {isIncorrect && (
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#EF4444' }}
                      >
                        <Text className="text-white text-lg font-bold">✗</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Elegant progress indicator */}
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
