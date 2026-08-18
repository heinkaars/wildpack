import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';

const CHIME = require('../assets/sounds/chime.wav');

/**
 * The "you added a species" reward: a rising haptic pattern plus a chime.
 * Deliberately does NOT set playsInSilentMode — if the phone is on silent,
 * the chime stays silent and the haptics carry the moment on their own.
 */
export function useRewardFeedback() {
  const player = useAudioPlayer(CHIME);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (Platform.OS !== 'web') {
      // Two taps building into the success notification, timed to the arpeggio.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      timers.push(
        setTimeout(
          () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
          90,
        ),
      );
      timers.push(
        setTimeout(
          () =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
          200,
        ),
      );
    }

    try {
      player.seekTo(0);
      player.play();
    } catch {
      // A missing audio route shouldn't break the celebration.
    }

    return () => timers.forEach(clearTimeout);
  }, []);
}
