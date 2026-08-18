import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useCaptureSession } from '../../lib/capture-session';
import { colors, radii, spacing } from '../../lib/theme';

export default function CaptureScreen() {
  const router = useRouter();
  const { setPhoto } = useCaptureSession();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [taking, setTaking] = useState(false);

  async function handleShoot() {
    if (!cameraRef.current || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (photo?.uri && photo.base64) {
        setPhoto(photo.uri, photo.base64);
        router.push('/capture/identify');
      }
    } finally {
      setTaking(false);
    }
  }

  async function handleUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) {
      setPhoto(asset.uri, asset.base64);
      router.push('/capture/identify');
    }
  }

  if (!permission) {
    return <View style={styles.permissionSafe} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionSafe}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            WildPack needs your camera to photograph wildlife for your lifelist.
          </Text>
          <PrimaryButton label="Allow Camera" onPress={requestPermission} style={{ marginTop: spacing.lg }} />
          <PrimaryButton
            label="Choose from library instead"
            variant="secondary"
            onPress={handleUpload}
            style={{ marginTop: spacing.sm }}
          />
          <PrimaryButton
            label="Cancel"
            variant="ghost"
            onPress={() => router.dismissTo('/')}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          onPress={() => router.dismissTo('/')}
          accessibilityRole="button"
          accessibilityLabel="Close camera"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>

        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [styles.shutterOuter, pressed && styles.shutterPressed]}
            onPress={handleShoot}
            disabled={taking}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <Pressable onPress={handleUpload} style={styles.uploadLink}>
            <Text style={styles.uploadText}>Upload from library</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  permissionSafe: { flex: 1, backgroundColor: colors.background },
  overlay: { flex: 1, justifyContent: 'space-between' },

  close: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    margin: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  closePressed: { opacity: 0.7 },
  closeIcon: { color: colors.surface, fontSize: 18, fontWeight: '600' },

  controls: { paddingBottom: spacing.xl, alignItems: 'center' },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { opacity: 0.8 },
  shutterInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.surface },

  uploadLink: { marginTop: spacing.lg, padding: spacing.sm },
  uploadText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  permissionBox: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  permissionBody: { color: colors.inkMuted, textAlign: 'center', marginTop: spacing.sm },
});
