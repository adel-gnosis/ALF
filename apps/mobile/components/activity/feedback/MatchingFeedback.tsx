import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

interface MatchingFeedbackProps {
  userAnswer: Record<string, string>;
  correctAnswer: Record<string, string>;
  leftTexts: string[];
}

export default function MatchingFeedback({
  userAnswer,
  correctAnswer,
  leftTexts,
}: MatchingFeedbackProps) {
  const { t } = useTranslation();

  return (
    <View className="mt-4 bg-white rounded-2xl p-4 border-2 border-gray-200">
      <Text className="text-base font-bold text-gray-800 mb-3">
        {t('activities.feedback.matching.yourAssociations')}
      </Text>

      {leftTexts.map((leftText, index) => {
        const userChoice = userAnswer[leftText];
        const correctChoice = correctAnswer[leftText];
        const isCorrect = userChoice === correctChoice;

        return (
          <View
            key={leftText}
            className={`mb-3 p-3 rounded-xl ${
              isCorrect ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="font-bold text-gray-900 mr-2">{leftText}</Text>
                  <Text className="text-gray-600">→</Text>
                  <Text
                    className={`ml-2 font-bold ${
                      isCorrect ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {userChoice}
                  </Text>
                </View>

                {!isCorrect && (
                  <View className="flex-row items-center mt-1">
                    <Text className="text-xs text-gray-600 mr-2">{t('activities.feedback.matching.correct')}:</Text>
                    <Text className="text-xs font-bold text-green-700">
                      {leftText} → {correctChoice}
                    </Text>
                  </View>
                )}
              </View>

              <View
                className={`w-8 h-8 rounded-full items-center justify-center ml-2 ${
                  isCorrect ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                <Text className="text-white text-lg font-bold">
                  {isCorrect ? '✓' : '✗'}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
