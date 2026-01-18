import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import Button from '../Button';

interface DragOrderActivityProps {
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

export default function DragOrderActivity({
  activity,
  onAnswer,
  disabled,
}: DragOrderActivityProps) {
  const { t } = useTranslation();

  // Handle both old format (activity.data.words) and new format (activity.words)
  const words: string[] =
    activity?.words ||
    (activity as any)?.data?.words ||
    [];

  const questionText =
    activity?.question_text || t('activities.dragOrder.instruction');

  // Slots = target positions (wraps to multiple rows automatically)
  const [slots, setSlots] = useState<Slot[]>(() => words.map(() => null));

  // Bank = draggable chips remaining
  const [bank, setBank] = useState<string[]>(() => shuffleArray(words));

  // Layout measuring (2D) to support wrap (multiple rows)
  const dropZoneRef = useRef<View>(null);
  const [zoneAbs, setZoneAbs] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [slotRects, setSlotRects] = useState<
    { x: number; y: number; width: number; height: number }[]
  >([]);

  const allFilled = useMemo(() => slots.every(Boolean), [slots]);

  const answer = useMemo(() => (slots.filter(Boolean) as string[]), [slots]);

  const handleSubmit = () => {
    if (disabled) return;
    onAnswer(answer);
  };

  const placeWordInSlot = (word: string, slotIndex: number) => {
    setSlots((prev) => {
      if (prev[slotIndex]) return prev; // occupied
      const next = [...prev];
      next[slotIndex] = word;
      return next;
    });
    setBank((prev) => prev.filter((w) => w !== word));
  };

  const removeFromSlot = (slotIndex: number) => {
    setSlots((prev) => {
      const next = [...prev];
      const w = next[slotIndex];
      if (!w) return prev;
      next[slotIndex] = null;
      // return to bank (front)
      setBank((b) => [w, ...b]);
      return next;
    });
  };

  const findNearestSlotIndex2D = (absX: number, absY: number) => {
    if (!slotRects.length) return -1;

    // Convert absolute drop point to dropZone-local coordinates
    const localX = absX - zoneAbs.x;
    const localY = absY - zoneAbs.y;

    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < slotRects.length; i++) {
      const r = slotRects[i];
      if (!r) continue;

      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;

      const dx = localX - cx;
      const dy = localY - cy;
      const dist = dx * dx + dy * dy;

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    return bestIdx;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

        {/* DROP ZONE (slots) */}
        <View
          ref={dropZoneRef}
          style={styles.dropZone}
          onLayout={() => {
            dropZoneRef.current?.measureInWindow((x, y) => {
              setZoneAbs({ x, y });
            });
          }}
        >
          {slots.map((slot, idx) => (
            <View
              key={`slot-${idx}`}
              style={styles.slotWrapper}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                setSlotRects((prev) => {
                  const next = [...prev];
                  next[idx] = { x, y, width, height };
                  return next;
                });
              }}
            >
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

        {/* BANK */}
        <Text style={styles.bankTitle}>{t('activities.dragOrder.wordBank')}</Text>

        <View style={styles.bank}>
          {bank.map((word) => (
            <DraggableChip
              key={word}
              word={word}
              disabled={!!disabled}
              onDrop={(absX, absY) => {
                // if we haven't measured yet, ignore
                if (!slotRects.length) return;

                const idx = findNearestSlotIndex2D(absX, absY);
                if (idx === -1) return;

                // Only place if empty
                if (slots[idx]) return;

                placeWordInSlot(word, idx);
              }}
            />
          ))}
        </View>

        <Button title={t('activities.dragOrder.check')} onPress={handleSubmit} disabled={!!disabled || !allFilled} />
      </View>
    </GestureHandlerRootView>
  );
}

function DraggableChip({
  word,
  disabled,
  onDrop,
}: {
  word: string;
  disabled: boolean;
  onDrop: (absX: number, absY: number) => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dragging = useSharedValue(false);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      dragging.value = true;
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(onDrop)(e.absoluteX, e.absoluteY);

      tx.value = withSpring(0, { damping: 16, stiffness: 180 });
      ty.value = withSpring(0, { damping: 16, stiffness: 180 });
      dragging.value = false;
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: withSpring(dragging.value ? 1.06 : 1, { damping: 16 }) },
    ],
    zIndex: dragging.value ? 50 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.chip, style, disabled && styles.chipDisabled]}>
        <Text style={styles.chipText}>{word}</Text>
      </Animated.View>
    </GestureDetector>
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
