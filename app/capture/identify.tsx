import { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCaptureSession } from '../../lib/capture-session';
import { identifySpecies } from '../../lib/identify-service';
import { colors, spacing } from '../../lib/theme';

export default function IdentifyScreen() {
  const router = useRouter();
  const { photoUri, photoBase64, setOutcome } = useCaptureSession();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !photoBase64) return;
    started.current = true;

    (async () => {
      const outcome = await identifySpecies(photoBase64);
      setOutcome(outcome);
      router.replace('/capture/result');
    })();
  }, [photoBase64]);

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
});
