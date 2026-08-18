import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PrimaryButton } from './PrimaryButton';
import { Confetti } from './Confetti';
import { useRewardFeedback } from '../lib/use-reward';
import { CelebrationPayload } from '../lib/types';
import { colors, radii, spacing } from '../lib/theme';

type Props = {
  payload: CelebrationPayload;
  onContinue: () => void;
};

/** A ring that bursts outward from behind the photo as the card lands. */
function Halo() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + progress.value * 1.6 }],
    opacity: (1 - progress.value) * 0.55,
  }));

  return <Animated.View pointerEvents="none" style={[styles.halo, style]} />;
}

/**
 * C4. Each block is independent — omit any one of them and the container still
 * reads correctly (species-only, species + streak, and so on).
 */
export function CelebrationModal({ payload, onContinue }: Props) {
  const { entry, isNewSpecies, streak, milestone, speciesNumber } = payload;

  // Haptic pattern + chime, fired once as the modal appears.
  useRewardFeedback();

  return (
    <View style={styles.backdrop}>
      <Confetti />

      <Animated.View
        entering={ZoomIn.springify().damping(13).mass(0.85)}
        style={styles.card}
      >
        <View style={styles.headlineBlock}>
          <View style={styles.photoWrap}>
            <Halo />
            <Animated.Image
              entering={ZoomIn.delay(90).springify().damping(11)}
              source={{ uri: entry.photoUri }}
              style={styles.photo}
            />
          </View>
          <View style={styles.headlineText}>
            <Text style={styles.headline}>{isNewSpecies ? 'New species!' : 'Sighting logged!'}</Text>
            <Text style={styles.speciesName} numberOfLines={2}>{entry.commonName}</Text>
          </View>
        </View>

        {milestone && (
          <Animated.View
            entering={FadeInDown.delay(240).springify().damping(15)}
            style={[styles.block, styles.milestoneBlock]}
          >
            <Text style={styles.blockIcon}>🏅</Text>
            <Text style={styles.blockText}>
              Species #{speciesNumber} — {milestone.label} unlocked
            </Text>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(340).springify().damping(15)}
          style={styles.block}
        >
          <Text style={styles.blockIcon}>🔥</Text>
          <Text style={styles.blockText}>{streak}-day streak</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(460)}>
          <PrimaryButton label="Continue" onPress={onContinue} style={{ marginTop: spacing.lg }} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 53, 38, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  headlineBlock: { flexDirection: 'row', alignItems: 'center' },
  photoWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: colors.amber,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  headlineText: { flex: 1, marginLeft: spacing.md },
  headline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.leaf,
  },
  speciesName: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2 },

  block: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  milestoneBlock: { backgroundColor: '#FBF0D9', borderColor: colors.amber },
  blockIcon: { fontSize: 18, marginRight: spacing.sm },
  blockText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
});
