import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Audio } from "expo-av";

import { resolveMediaUrl } from "../../services/api";

type DicteeActivityProps = {
  activity: any;
  onAnswer: (answer: any) => void;
  disabled?: boolean;
  feedback?: "success" | "error" | null;
  correctAnswer?: any;
};

// Helper to guess label from filename (since we don't store labels explicitly yet)
const getAudioLabel = (url: string, index: number) => {
  const lower = url.toLowerCase();
  if (lower.includes('male_slow')) return '👨‍🏫 Homme (Lent)';
  if (lower.includes('male_default')) return '👨 Homme (Normal)';
  if (lower.includes('female_slow')) return '👩‍🏫 Femme (Lent)';
  if (lower.includes('female_default')) return '👩 Femme (Normal)';

  if (lower.includes('slow')) return '🐢 Lent';
  if (lower.includes('fast')) return '🐇 Rapide';

  return `Audio ${index + 1}`;
};

export default function DicteeActivity({
  activity,
  onAnswer,
  disabled = false,
  feedback = null,
  correctAnswer,
}: DicteeActivityProps) {
  const [text, setText] = useState("");
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);

  // Parse all available audio URLs
  const audioOptions = useMemo(() => {
    const urls = activity?.audio_urls || [];
    if (!Array.isArray(urls)) return [];

    return urls.map((url: string, index: number) => ({
      url: resolveMediaUrl(url),
      label: getAudioLabel(url, index),
      id: index
    }));
  }, [activity]);

  const currentAudioUrl = audioOptions[selectedAudioIndex]?.url;

  // Cleanup sound on unmount or when sound changes
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => null);
      }
    };
  }, [sound]);

  // Reset sound when switching tracks
  useEffect(() => {
    if (sound) {
      sound.unloadAsync().catch(() => null);
      setSound(null);
      setIsPlaying(false);
    }
  }, [selectedAudioIndex]);


  const playSound = async () => {
    if (!currentAudioUrl) {
      console.error("[DicteeActivity] No audio URL available");
      return;
    }

    try {
      setIsPlaying(true);

      // Stop previous sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentAudioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error("[DicteeActivity] Error playing sound:", error);
      setIsPlaying(false);
    }
  };

  const handleChange = (val: string) => {
    setText(val);
    onAnswer(val);
  };

  // Determine border + background based on feedback
  let borderColor = "border-gray-200";
  if (feedback === "success") borderColor = "border-green-500 bg-green-50";
  if (feedback === "error") borderColor = "border-red-500 bg-red-50";

  if (audioOptions.length === 0) {
    return (
      <View className="p-4 bg-red-50 rounded-lg w-full items-center">
        <Text className="text-red-600 font-bold mb-1">Audio introuvable</Text>
        <Text className="text-xs text-red-400">
          {activity?.audio_urls ? "URL invalide" : "Aucune URL fournie"}
        </Text>
      </View>
    );
  }

  return (
    <View className="w-full items-center">
      {activity?.instruction && (
        <Text className="text-sm font-medium text-gray-500 mb-1 italic text-center">
          {activity.instruction}
        </Text>
      )}
      <Text className="text-lg font-semibold text-gray-800 mb-6 text-center px-4">
        {activity?.question_text || "Écoutez et écrivez exactement ce que vous entendez"}
      </Text>

      {/* Audio Selector (if multiple) */}
      {audioOptions.length > 1 && (
        <View className="flex-row flex-wrap justify-center gap-2 mb-6">
          {audioOptions.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setSelectedAudioIndex(opt.id)}
              disabled={isPlaying}
              className={`px-3 py-2 rounded-full border ${selectedAudioIndex === opt.id
                ? "bg-blue-100 border-blue-500"
                : "bg-white border-gray-200"
                }`}
            >
              <Text className={`text-xs font-medium ${selectedAudioIndex === opt.id ? "text-blue-700" : "text-gray-600"
                }`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={playSound}
        disabled={isPlaying || disabled}
        className={`w-24 h-24 rounded-full items-center justify-center mb-8 shadow-md active:opacity-80 ${isPlaying ? "bg-blue-100" : "bg-blue-500"
          }`}
      >
        <Text className="text-4xl">{isPlaying ? "🔊" : "▶️"}</Text>
      </TouchableOpacity>

      <View className="w-full mb-2">
        <Text className="text-gray-500 mb-2 ml-1 font-medium">Votre réponse :</Text>
        <TextInput
          value={text}
          onChangeText={handleChange}
          placeholder="Écrivez ici..."
          editable={!disabled}
          className={`w-full p-4 border-2 rounded-xl text-lg min-h-[120px] ${borderColor}`}
          multiline
          autoCapitalize="sentences"
          textAlignVertical="top"
        />
      </View>

      {feedback === 'error' && correctAnswer && (
        <View className="bg-green-100 p-4 rounded-xl border-2 border-green-500 mb-4 w-full">
          <Text className="text-green-800 font-semibold mb-1 text-center">Réponse Correcte :</Text>
          <Text className="text-xl font-bold text-green-900 text-center">{correctAnswer}</Text>
        </View>
      )}

      {disabled && (
        <Text className="text-xs text-gray-400 mt-2">
          {isPlaying ? "Audio en cours..." : "Réponse soumise"}
        </Text>
      )}
    </View>
  );
}
