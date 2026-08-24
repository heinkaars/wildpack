import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useCaptureSession } from '../../lib/capture-session';
import { IdentifyError, IdentifyErrorKind, identifySpecies } from '../../lib/identify-service';
import { colors, radii, spacing } from '../../lib/theme';

type Failure = { title: string; body: string };

// 'missing' is not a request failure — it means we arrived here with no photo
// at all, which would otherwise spin forever just like a dead network.
const FAILURES: Record<IdentifyErrorKind | 'missing' | 'unknown', Failure> = {
  offline: {
    title: 'No connection',
    body: "We couldn't reach the internet. Check your signal — your photo is safe and ready to try again.",
  },
  timeout: {
    title: 'This is taking too long',
    body: "The identification didn't come back in time. Your photo is still here, so you can try again.",
  },
  server: {
    title: "Couldn't identify that",
    body: 'Something went wrong on our end. Your photo is still here, so you can try again.',
  },
  auth: {
    title: 'We could not confirm your account',
    body: 'Close WildPack and open it again to refresh your session. Your photo is safe and will still be here.',
  },
  rate: {
    title: 'That is a lot of photos at once',
    body: 'Give it a minute to catch up, then try again. Your photo is safe and ready to go.',
  },
  unknown: {
    title: "Couldn't identify that",
    body: 'Something unexpected went wrong. Your photo is still here, so you can try again.',
  },
  missing: {
    title: "That photo didn't come through",
    body: 'We lost the picture on the way here. Take another one and we will identify it.',
  },
};

export default function IdentifyScreen() {
  const router = useRouter();
  const { photoUri, photoBase64, setOutcome } = useCaptureSession();
  const [failure, setFailure] = useState<Failure | null>(null);
  // Counts identification attempts. Bumping it re-runs the effect, which is
  // what "Try again" does.
  const [attempt, setAttempt] = useState(0);
  // Which attempt has already been fired off. Without this, React's
  // development double-mount would send the photo to OpenAI twice.
  const started = useRef(-1);

  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;

    if (!photoBase64) {
      setFailure(FAILURES.missing);
      return;
    }

    (async () => {
      try {
        const outcome = await identifySpecies(photoBase64);
        setOutcome(outcome);
        router.replace('/capture/result');
      } catch (error) {
        setFailure(error instanceof IdentifyError ? FAILURES[error.kind] : FAILURES.unknown);
      }
    })();
  }, [attempt, photoBase64]);

  function handleRetry() {
    setFailure(null);
    setAttempt((n) => n + 1);
  }

  if (failure) {
    const canRetry = Boolean(photoBase64);

    return (
      <SafeAreaView style={styles.errorSafe}>
        <View style={styles.errorBody}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.errorThumb} />}
          <Text style={styles.errorTitle}>{failure.title}</Text>
          <Text style={styles.errorText}>{failure.body}</Text>
        </View>

        <View style={styles.errorActions}>
          {canRetry && <PrimaryButton label="Try again" onPress={handleRetry} />}
          <PrimaryButton
            label={canRetry ? 'Retake photo' : 'Take another photo'}
            variant={canRetry ? 'secondary' : 'primary'}
            onPress={() => router.replace('/capture')}
            style={{ marginTop: canRetry ? spacing.sm : 0 }}
          />
          <PrimaryButton
            label="Back to lifelist"
            variant="ghost"
            onPress={() => router.dismissTo('/')}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color={colors.surface} />
        <Text style={styles.text}>Identifying…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  photo: { ...StyleSheet.absoluteFillObject, opacity: 0.45 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: { color: colors.surface, fontSize: 16, fontWeight: '600' },

  errorSafe: { flex: 1, backgroundColor: colors.background },
  errorBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorThumb: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.border,
  },
  errorTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  errorActions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
