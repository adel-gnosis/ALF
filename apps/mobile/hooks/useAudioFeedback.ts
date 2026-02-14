import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const SOUNDS = {
  SUCCESS: require('../assets/sfx/success.mp3'),
  ERROR: require('../assets/sfx/error.mp3'),
};

type SoundMap = {
  SUCCESS?: Audio.Sound;
  ERROR?: Audio.Sound;
};

export const useAudioFeedback = () => {
  const soundsRef = useRef<SoundMap>({});
  const { user } = useAuth(); // future: user.settings.soundEnabled

  const soundsEnabled = true;

  useEffect(() => {
    let isMounted = true;

    const loadSounds = async () => {
      console.log('[AudioFeedback] Mounting and loading sounds...');
      try {
        // Configure audio mode (important on iOS)
        console.log('[AudioFeedback] Setting audio mode...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        console.log('[AudioFeedback] Loading assets...');
        const { sound: successSound } = await Audio.Sound.createAsync(
          SOUNDS.SUCCESS,
          { shouldPlay: false }
        );
        console.log('[AudioFeedback] Success sound loaded.');

        const { sound: errorSound } = await Audio.Sound.createAsync(
          SOUNDS.ERROR,
          { shouldPlay: false }
        );
        console.log('[AudioFeedback] Error sound loaded.');

        if (!isMounted) return;

        soundsRef.current.SUCCESS = successSound;
        soundsRef.current.ERROR = errorSound;
      } catch (e) {
        console.warn('[AudioFeedback] Failed to load audio assets', e);
      }
    };

    loadSounds();

    return () => {
      isMounted = false;
      console.log('[AudioFeedback] Unloading sounds...');
      Object.values(soundsRef.current).forEach(sound => {
        sound?.unloadAsync();
      });
    };
  }, []);

  const playSuccess = useCallback(async () => {
    if (!soundsEnabled) return;
    const sound = soundsRef.current.SUCCESS;
    if (!sound) {
      console.warn('[AudioFeedback] playSuccess called but sound not loaded.');
      return;
    }

    try {
      console.log('[AudioFeedback] Playing success sound...');
      await sound.replayAsync();
    } catch (error) {
      console.warn('[AudioFeedback] Playback failed', error);
    }
  }, [soundsEnabled]);

  const playError = useCallback(async () => {
    if (!soundsEnabled) return;
    const sound = soundsRef.current.ERROR;
    if (!sound) {
      console.warn('[AudioFeedback] playError called but sound not loaded.');
      return;
    }

    try {
      console.log('[AudioFeedback] Playing error sound...');
      await sound.replayAsync();
    } catch (error) {
      console.warn('[AudioFeedback] Playback failed', error);
    }
  }, [soundsEnabled]);

  return {
    playSuccess,
    playError,
  };
};
