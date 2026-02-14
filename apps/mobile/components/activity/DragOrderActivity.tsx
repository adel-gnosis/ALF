import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../Button';

interface TapOrderActivityProps {
  activity: any;
  onAnswer: (answer: string[]) => void;
  disabled?: boolean;
  feedback?: 'success' | 'error' | null;
  correctAnswer?: any;
}

type Slot = string | null;

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function TapOrderActivity({
  activity,
  onAnswer,
  disabled,
  feedback,
  correctAnswer,
}: TapOrderActivityProps) {
  const { t } = useTranslation();

  // Handle both old format (activity.data.words) and new format (activity.words)
  const words: string[] =
    activity?.words ||
    (activity as any)?.data?.words ||
    [];

  const questionText =
    activity?.question_text || t('activities.dragOrder.instruction');

  // Slots = target positions
  const [slots, setSlots] = useState<Slot[]>(() => words.map(() => null));

  // Bank = available words to select
  const [bank, setBank] = useState<string[]>(() => shuffleArray(words));

  const allFilled = useMemo(() => slots.every(Boolean), [slots]);

  const answer = useMemo(() => (slots.filter(Boolean) as string[]), [slots]);

  const handleSubmit = () => {
    if (disabled) return;
    onAnswer(answer);
  };

  const handleWordTap = (word: string) => {
    if (disabled) return;

    // Find first empty slot
    const firstEmptyIndex = slots.findIndex(slot => slot === null);

    if (firstEmptyIndex === -1) return; // No empty slots

    // Place word in first empty slot
    setSlots((prev) => {
      const next = [...prev];
      next[firstEmptyIndex] = word;
      return next;
    });

    // Remove from bank
    setBank((prev) => prev.filter((w) => w !== word));
  };

  const removeFromSlot = (slotIndex: number) => {
    if (disabled) return;

    setSlots((prev) => {
      const next = [...prev];
      const w = next[slotIndex];
      if (!w) return prev;
      next[slotIndex] = null;
      // Return to bank at the end
      setBank((b) => [...b, w]);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {activity?.instruction && (
        <Text className="text-sm font-medium text-gray-500 mb-1 italic">
          {activity.instruction}
        </Text>
      )}
      <Text style={styles.questionText}>{questionText}</Text>
      {!activity?.instruction && (
        <Text style={styles.subText}>{t('activities.dragOrder.subInstruction')}</Text>
      )}

      {/* SLOTS (ordered sequence) */}
      <View style={styles.dropZone}>
        {slots.map((slot, idx) => (
          <View key={`slot-${idx}`} style={styles.slotWrapper}>
            <Pressable
              disabled={!!disabled || !slot}
              onPress={() => removeFromSlot(idx)}
              style={[
                styles.slot,
                slot ? styles.slotFilled : styles.slotEmpty,
                disabled ? styles.slotDisabled : null,
              ]}
            >
              <Text style={slot ? styles.slotText : styles.slotPlaceholder}>
                {slot ?? '—'}
              </Text>
              {!!slot && !disabled && (
                <Text style={styles.slotHint}>{t('activities.dragOrder.tapToRemove')}</Text>
              )}
            </Pressable>
          </View>
        ))}
      </View>

      {/* WORD BANK */}
      <Text style={styles.bankTitle}>{t('activities.dragOrder.wordBank')}</Text>

      <View style={styles.bank}>
        {bank.map((word) => (
          <Pressable
            key={word}
            disabled={!!disabled}
            onPress={() => handleWordTap(word)}
            style={[styles.chip, disabled && styles.chipDisabled]}
          >
            <Text style={styles.chipText}>{word}</Text>
          </Pressable>
        ))}
      </View>

      {/* Correct Answer Display on Error */}
      {feedback === 'error' && correctAnswer && (
        <View className="bg-green-100 p-4 rounded-xl border-2 border-green-500 mb-4 w-full">
          <Text className="text-green-800 font-semibold mb-1 text-center">Réponse Correcte :</Text>
          <Text className="text-lg font-bold text-green-900 text-center">{correctAnswer}</Text>
        </View>
      )}

      <Button
        title={t('activities.dragOrder.check')}
        onPress={handleSubmit}
        disabled={!!disabled || !allFilled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', flex: 1 },

  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },

  dropZone: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  slotWrapper: {
    minWidth: 64,
  },
  slot: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  slotEmpty: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  slotFilled: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  slotDisabled: {
    opacity: 0.6,
  },
  slotText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  slotPlaceholder: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  slotHint: {
    marginTop: 2,
    fontSize: 10,
    color: '#6B7280',
  },

  bankTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },

  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  chipDisabled: {
    opacity: 0.6,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
});