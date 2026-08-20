import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCaptureSession } from '../../lib/capture-session';
import { useLifelist } from '../../lib/lifelist-store';
import { LOW_CONFIDENCE_THRESHOLD } from '../../lib/identify-service';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SpeciesGuess } from '../../lib/types';
import { colors, radii, spacing } from '../../lib/theme';

export default function ResultScreen() {
  const router = useRouter();
  const { photoUri, photoBase64, outcome, setCelebration } = useCaptureSession();
  const { addSighting } = useLifelist();

  const [picked, setPicked] = useState<SpeciesGuess | null>(null);
  const [showAlternates, setShowAlternates] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!photoUri || !photoBase64 || !outcome) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>That capture didn't come through.</Text>
          <PrimaryButton
            label="Try again"
            onPress={() => router.replace('/capture')}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (outcome.best.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.fallback}>
          <Image source={{ uri: photoUri }} style={styles.unidentifiedThumb} />
          <Text style={styles.fallbackText}>
            We couldn't quite make this one out — nature can be sneaky. Try again?
          </Text>
          <PrimaryButton
            label="Try again"
            onPress={() => router.replace('/capture')}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const selected = picked ?? outcome.best;
  const isBest = selected.scientificName === outcome.best.scientificName;
  const others = [outcome.best, ...outcome.alternates].filter(
    (guess) => guess.scientificName !== selected.scientificName,
  );

  async function handleConfirm() {
    if (confirming) return;
    setConfirming(true);
    try {
      const payload = await addSighting(selected, photoBase64!, null);
      setCelebration(payload);
      router.dismissTo('/');
    } catch {
      setConfirming(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <Image source={{ uri: photoUri }} style={styles.photo} />

        <View style={styles.body}>
          <Text style={styles.name}>{selected.commonName}</Text>
          <Text style={styles.scientific}>{selected.scientificName}</Text>

          <View style={styles.confidencePill}>
            <Text style={styles.confidenceText}>
              {isBest ? 'Best guess' : 'Your pick'} — {Math.round(selected.confidence * 100)}% confidence
            </Text>
          </View>

          <View style={styles.alternates}>
            <Pressable
              style={styles.alternatesHeader}
              onPress={() => setShowAlternates((open) => !open)}
            >
              <Text style={styles.alternatesTitle}>See other matches</Text>
              <Text style={styles.alternatesChevron}>{showAlternates ? '⌃' : '⌄'}</Text>
            </Pressable>

            {showAlternates &&
              others.map((guess) => (
                <Pressable
                  key={guess.scientificName}
                  style={styles.alternateRow}
                  onPress={() => {
                    setPicked(guess);
                    setShowAlternates(false);
                  }}
                >
                  <Text style={styles.alternateName}>{guess.commonName}</Text>
                  <Text style={styles.alternateConfidence}>
                    {Math.round(guess.confidence * 100)}%
                  </Text>
                </Pressable>
              ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={confirming ? 'Adding…' : 'Confirm'}
          onPress={handleConfirm}
          disabled={confirming}
        />
        <PrimaryButton
          label="Not quite — try again"
          variant="secondary"
          onPress={() => router.replace('/capture')}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  fallbackText: { color: colors.inkMuted, textAlign: 'center' },
  unidentifiedThumb: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.border,
  },
  scroll: { paddingBottom: spacing.lg },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  body: { padding: spacing.lg },
  name: { fontSize: 26, fontWeight: '800', color: colors.ink },
  scientific: { fontSize: 15, color: colors.inkMuted, fontStyle: 'italic', marginTop: 2 },
  confidencePill: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confidenceText: { fontSize: 13, fontWeight: '600', color: colors.forest },
  alternates: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  alternatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  alternatesTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  alternatesChevron: { fontSize: 14, color: colors.inkMuted },
  alternateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  alternateName: { fontSize: 15, color: colors.ink },
  alternateConfidence: { fontSize: 13, color: colors.inkMuted },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
