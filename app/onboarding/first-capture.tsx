import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing } from '../../lib/theme';

export default function FirstCaptureScreen() {
  const router = useRouter();

  // The lifelist has to sit under the camera: closing capture, and finishing a
  // capture, both return to it.
  function handleStart() {
    router.replace('/');
    router.push('/capture');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>Let&apos;s find your first species</Text>
        <Text style={styles.subtitle}>
          Point your camera at any bird, insect, or plant nearby. We&apos;ll identify it and add
          it to your collection.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Start Capturing" onPress={handleStart} />
        <PrimaryButton
          label="Maybe later"
          variant="ghost"
          onPress={() => router.replace('/')}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  subtitle: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
