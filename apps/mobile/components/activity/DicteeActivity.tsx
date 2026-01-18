import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Audio } from "expo-av";

import { resolveMediaUrl } from "../../services/api";

type DicteeActivityProps = {
  activity: any;
  onAnswer: (answer: any) => void;
  disabled?: boolean;
  feedback?: "success" | "error" | null;
  correctAnswer?: any;
};

export default function DicteeActivity({
  activity,
  onAnswer,
  disabled = false,
  feedback = null,
}: DicteeActivityProps) {
  const [text, setText] = useState("");
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Resolve audio URL once (no require inside render)
  const fullAudioUrl = useMemo(() => {
    const rawPath =
      activity?.audio_urls && Array.isArray(activity.audio_urls) && activity.audio_urls.length > 0
        ? activity.audio_urls[0]
        : null;

    return resolveMediaUrl(rawPath);
  }, [activity]);

  // Cleanup sound on unmount or when sound changes
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => null);
      }
    };
  }, [sound]);

  const playSound = async () => {
    if (!fullAudioUrl) {
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
        { uri: fullAudioUrl },
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

  if (!fullAudioUrl) {
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
      <Text className="text-lg font-semibold text-gray-800 mb-8 text-center px-4">
        {activity?.question_text || "Écoutez et écrivez exactement ce que vous entendez"}
      </Text>

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

      {disabled && (
        <Text className="text-xs text-gray-400 mt-2">
          {isPlaying ? "Audio en cours..." : "Réponse soumise"}
        </Text>
      )}
    </View>
  );
}
