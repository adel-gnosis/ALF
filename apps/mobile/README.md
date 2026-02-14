# Mobile App - Gamification Features

this app includes gamification elements to enhance the user experience.

## Testing "Game Feel"

### 🔊 Audio Feedback
- **Requirements**: Device must not be in "Silent Mode" (Check mute switch on iPhone).
- **Behavior**:
  - Correct Answer: Plays a "Ping" success sound.
  - Incorrect Answer: Plays a distinct error sound.
  - Session Completion: Plays a bonus sound.

### 📳 Haptics
- **Requirements**: System haptics must be enabled in device settings.
- **Behavior**:
  - Selection: Light impact feedback on choice tap.
  - Success/Error: Notification feedback patterns on validation.

### ✨ Animations (Reduced Motion)
- This app uses `react-native-reanimated` and `moti`.
- If "Reduce Motion" is enabled in system accessibility settings, animations will automatically skip to their final state.

## Troubleshooting
- **No Sound**: Ensure standard `expo-av` setup is working. Check `metro.config.js` includes `mp3` in `assetExts`.
- **Worklets Error**: Ensure `react-native-reanimated` matches the Expo SDK version (currently aligned to ~3.16.x for Expo 54 compatibility).
