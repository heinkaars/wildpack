import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from './theme';

const VISIBLE_MS = 4500;

/**
 * Held outside React on purpose. A confirmation is raised on the screen the
 * user is leaving, and signing in tears the tree down behind them — component
 * state does not survive that, so the message would vanish before it was ever
 * drawn. Module state outlives the remount.
 */
let message: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/**
 * Raises a confirmation. It stays pending until a banner is actually on screen
 * to show it — the raiser deliberately does not start the clock, because it is
 * called from the screen the user is leaving, before the destination has
 * mounted. Starting the countdown here spends most of it on nothing.
 */
export function showFlash(next: string): void {
  message = next;
  emit();
}

function clearFlash(): void {
  message = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null {
  return message;
}

/**
 * Render this inside the lifelist screen, which is where both confirmations
 * land and which stays mounted throughout. Rendering it as a sibling of the
 * navigator instead looks tidier but does not survive: signing in tears two
 * screens down at once and takes the banner with them, so the message is set
 * but nothing is left on screen to show it.
 */
export function FlashBanner() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  // The countdown belongs to whoever is displaying the message. Remounting
  // restarts it rather than losing it, so a confirmation raised mid-navigation
  // still gets its full time on screen once things settle.
  useEffect(() => {
    if (!current) return undefined;
    const timer = setTimeout(clearFlash, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  // Deliberately not reanimated's `entering`/`exiting` layout animations.
  // Signing in tears down two screens at once, so this banner mounts and
  // unmounts within a few frames, and the exit animation wins the race and
  // strips the node before the message has been on screen at all. Driving
  // opacity ourselves keeps it on screen for as long as the message is set.
  useEffect(() => {
    progress.value = withTiming(current ? 1 : 0, {
      duration: current ? 260 : 200,
      easing: Easing.out(Easing.quad),
    });
  }, [current, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -12 }],
  }));

  if (!current) return null;

  return (
    <Animated.View
      style={[styles.banner, { top: insets.top + spacing.md }, animatedStyle]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.check}>✓</Text>
      <Text style={styles.text}>{current}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    zIndex: 10,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.forest,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    boxShadow: '0 6px 12px rgba(18, 53, 38, 0.25)',
    elevation: 6,
  },
  check: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  text: { flex: 1, color: colors.surface, fontSize: 14, fontWeight: '600', lineHeight: 19 },
});
