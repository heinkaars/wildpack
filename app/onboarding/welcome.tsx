import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LOOKS } from '../../components/Avatar';
import { useOnboarding } from '../../lib/onboarding';
import { colors, radii, spacing } from '../../lib/theme';

// Placeholder artwork until there is a real logo: a different creature greets
// each launch. Drawn at module scope so it holds still while the screen is up.
const HERO_EMOJI = LOOKS[Math.floor(Math.random() * LOOKS.length)].emoji;

export default function WelcomeScreen() {
  const router = useRouter();
  const { skipForNow } = useOnboarding();

  async function handleSkip() {
    await skipForNow();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{HERO_EMOJI}</Text>
        </View>

        <Text style={styles.title}>Welcome to WildPack</Text>
        <Text style={styles.subtitle}>
          Photograph wildlife, identify species, and build your personal lifelist.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Get Started" onPress={() => router.push('/onboarding/look')} />
        <PrimaryButton
          label="Skip for now"
          variant="ghost"
          onPress={handleSkip}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  hero: {
    width: 132,
    height: 132,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heroEmoji: { fontSize: 64 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
