import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

interface DragOrderFeedbackProps {
  userAnswer: string[];
  correctAnswer: string[] | string;
}

export default function DragOrderFeedback({
  userAnswer,
  correctAnswer,
}: DragOrderFeedbackProps) {
  const { t } = useTranslation();

  // Parse correctAnswer safely - handle string, JSON string, or array
  let parsedCorrectAnswer: string[];
  
  try {
    if (Array.isArray(correctAnswer)) {
      parsedCorrectAnswer = correctAnswer;
    } else if (typeof correctAnswer === 'string') {
      let jsonString = correctAnswer;
      
      // Handle mixed quotes: ["C'", 'est', 'un']
      // Strategy: Replace only quotes that are used as string delimiters, not apostrophes
      // Step 1: Replace single quotes used as delimiters (after comma or bracket) with double quotes
      jsonString = jsonString.replace(/(\[|,\s*)'/g, '$1"'); // Start quotes: [' or , '
      jsonString = jsonString.replace(/'(\s*,|\s*\])/g, '"$1'); // End quotes: ' , or ']
      
      // Try to parse if it looks like JSON array
      if (jsonString.trim().startsWith('[')) {
        parsedCorrectAnswer = JSON.parse(jsonString);
      } else {
        // If it's just a plain string, split it
        parsedCorrectAnswer = correctAnswer.split(' ').filter(Boolean);
      }
    } else {
      parsedCorrectAnswer = [];
    }
  } catch (error) {
    console.error('Error parsing correctAnswer:', error, 'Raw value:', correctAnswer);
    // Last resort: try to extract words manually using regex
    try {
      if (typeof correctAnswer === 'string') {
        const matches = correctAnswer.match(/["']([^"']+)["']/g);
        if (matches) {
          parsedCorrectAnswer = matches.map(m => m.slice(1, -1)); // Remove quotes
        } else {
          parsedCorrectAnswer = [];
        }
      } else {
        parsedCorrectAnswer = [];
      }
    } catch {
      parsedCorrectAnswer = [];
    }
  }

  if (parsedCorrectAnswer.length === 0) {
    return null;
  }

  return (
    <View className="mt-4 bg-white rounded-2xl p-4 border-2 border-gray-200">
      <Text className="text-base font-bold text-gray-800 mb-3">
        {t('activities.feedback.dragOrder.wordOrder')}
      </Text>

      {/* User's answer */}
      <View className="mb-4">
        <Text className="text-xs text-gray-600 mb-2 font-semibold">{t('activities.feedback.dragOrder.yourAnswer')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {userAnswer.map((word, index) => {
            const isCorrect = word === parsedCorrectAnswer[index];
            return (
              <View
                key={`user-${index}`}
                className={`px-3 py-2 rounded-lg border-2 ${
                  isCorrect
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <Text
                  className={`font-bold ${
                    isCorrect ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {word}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Correct answer */}
      {userAnswer.join(' ') !== parsedCorrectAnswer.join(' ') && (
        <View>
          <Text className="text-xs text-gray-600 mb-2 font-semibold">
            {t('activities.feedback.dragOrder.correctOrder')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {parsedCorrectAnswer.map((word: string, index: number) => (
              <View
                key={`correct-${index}`}
                className="px-3 py-2 rounded-lg bg-green-100 border-2 border-green-500"
              >
                <Text className="font-bold text-green-700">{word}</Text>
              </View>
            ))}
          </View>

          {/* Show complete sentence */}
          <View className="mt-3 p-3 bg-green-50 rounded-lg">
            <Text className="text-sm text-green-800 font-semibold text-center">
              {parsedCorrectAnswer.join(' ')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
