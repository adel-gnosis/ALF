import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { API_URL } from '../../services/api';

export default function DicteeActivity({ activity, onAnswer, disabled }: { activity: any, onAnswer: (answer: any) => void, disabled?: boolean }) {
    const [text, setText] = useState('');
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Get audio source
    // Use uploaded file (audio_file) if available, otherwise first url in audio_urls
    // Or fallback to checking activity.audio_urls array if backend sends it directly
    const audioUrl = activity.audio_urls && activity.audio_urls.length > 0
        ? activity.audio_urls[0]
        : null;

    // Construct full URL if it's relative
    // Remove '/api' from the end of API_URL to get the base host
    const baseUrl = API_URL.replace(/\/api$/, '');

    const fullAudioUrl = audioUrl && audioUrl.startsWith('/')
        ? `${baseUrl}${audioUrl}`
        : audioUrl;

    // Debug log
    useEffect(() => {
        if (audioUrl) {
            console.log('[DicteeActivity] Audio setup:', {
                rawUrl: audioUrl,
                baseUrl,
                fullUrl: fullAudioUrl
            });
        }
    }, [audioUrl, baseUrl, fullAudioUrl]);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const playSound = async () => {
        if (!fullAudioUrl) {
            console.error('[DicteeActivity] No audio URL available');
            return;
        }

        try {
            console.log('[DicteeActivity] Playing sound:', fullAudioUrl);
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: fullAudioUrl },
                { shouldPlay: true }
            );

            setSound(newSound);
            setIsPlaying(true);

            newSound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) {
                    setIsPlaying(false);
                }
            });
        } catch (error) {
            console.error('[DicteeActivity] Error playing sound:', error);
            setIsPlaying(false);
        }
    };

    const handleChange = (val: string) => {
        setText(val);
        onAnswer(val);
    };

    if (!fullAudioUrl) {
        return (
            <View className="p-4 bg-red-50 rounded-lg">
                <Text className="text-red-600 center">Audio introuvable</Text>
                <Text className="text-xs text-red-400 mt-2">{activity.audio_urls ? 'URL present but invalid' : 'No URL in data'}</Text>
            </View>
        );
    }

    return (
        <View className="w-full items-center">
            <Text className="text-lg font-semibold text-gray-800 mb-6 text-center">
                {activity.question_text || "Écoutez et écrivez ce que vous entendez"}
            </Text>

            <TouchableOpacity
                onPress={playSound}
                disabled={isPlaying || disabled}
                className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${isPlaying ? 'bg-blue-100' : 'bg-blue-500'
                    }`}
            >
                <Text className="text-3xl">{isPlaying ? '🔊' : '▶️'}</Text>
            </TouchableOpacity>

            <TextInput
                value={text}
                onChangeText={handleChange}
                placeholder="Écrivez le texte ici..."
                editable={!disabled}
                className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white text-lg mb-4"
                multiline
            />
        </View>
    );
}
