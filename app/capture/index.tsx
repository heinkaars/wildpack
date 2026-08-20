import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useCaptureSession } from '../../lib/capture-session';
import { normalizeWebImage } from '../../lib/photos';
import { colors, radii, spacing } from '../../lib/theme';

// expo-camera's `zoom` is a 0-1 fraction of the device's max zoom, not a
// scale factor, so a pinch has to be mapped into that range by hand.
const PINCH_SENSITIVITY = 0.5;

const clamp = (n: number) => Math.min(1, Math.max(0, n));

// Flash and torch are separate props, but they are one decision to the user:
// "how much light do I want?". One button cycles the whole range.
type LightMode = 'off' | 'auto' | 'on' | 'torch';
const LIGHT_CYCLE: LightMode[] = ['off', 'auto', 'on', 'torch'];
const LIGHT_LABEL: Record<LightMode, string> = {
  off: 'Off',
  auto: 'Auto',
  on: 'On',
  torch: 'Torch',
};

export default function CaptureScreen() {
  const router = useRouter();
  const { setPhoto } = useCaptureSession();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [taking, setTaking] = useState(false);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [light, setLight] = useState<LightMode>('off');
  const [zoom, setZoom] = useState(0);
  const zoomStart = useRef(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // `.runOnJS(true)` keeps these callbacks on the JS thread: they only set
  // React state, so there is nothing for a worklet to do here.
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      zoomStart.current = zoom;
    })
    .onUpdate((event) => {
      setZoom(clamp(zoomStart.current + (event.scale - 1) * PINCH_SENSITIVITY));
    });

  // Animals move. Getting back to a wide shot has to be one gesture, not a
  // careful reverse pinch.
  const resetZoom = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => setZoom(0));

  const gesture = Gesture.Simultaneous(pinch, resetZoom);

  async function handleShoot() {
    if (!cameraRef.current || taking || !ready) return;
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

  function handleFlip() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
    // Zoom range and torch both belong to the lens we are leaving behind.
    setZoom(0);
    setLight('off');
  }

  function handleCycleLight() {
    setLight((current) => LIGHT_CYCLE[(LIGHT_CYCLE.indexOf(current) + 1) % LIGHT_CYCLE.length]);
  }

  async function handleUpload() {
    setUploadError(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;

    // The web picker hands back whatever bytes the file has, unconverted —
    // including formats like HEIC that OpenAI's vision API rejects. The
    // native picker always re-encodes to JPEG, so only web needs this.
    if (Platform.OS === 'web') {
      try {
        const normalized = await normalizeWebImage(asset.uri);
        setPhoto(normalized.uri, normalized.base64);
        router.push('/capture/identify');
      } catch {
        setUploadError("That photo format isn't supported here. Try a different photo, or take one with the camera.");
      }
      return;
    }

    setPhoto(asset.uri, asset.base64);
    router.push('/capture/identify');
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
          {uploadError && <Text style={styles.uploadErrorText}>{uploadError}</Text>}
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
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            zoom={zoom}
            flash={light === 'torch' ? 'off' : light}
            enableTorch={light === 'torch'}
            onCameraReady={() => setReady(true)}
          />
        </View>
      </GestureDetector>

      {/* box-none throughout: the overlay must never swallow the pinch. */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            onPress={() => router.dismissTo('/')}
            accessibilityRole="button"
            accessibilityLabel="Close camera"
          >
            <Text style={styles.iconGlyph}>✕</Text>
          </Pressable>

          <View style={styles.topRight} pointerEvents="box-none">
            {/* Front cameras have no torch and no usable flash, so the
                control would be dead weight there. */}
            {facing === 'back' && (
              <Pressable
                style={({ pressed }) => [
                  styles.lightButton,
                  light !== 'off' && styles.lightButtonActive,
                  pressed && styles.pressed,
                ]}
                onPress={handleCycleLight}
                accessibilityRole="button"
                accessibilityLabel={`Light: ${LIGHT_LABEL[light]}. Tap to change`}
              >
                <Text style={[styles.iconGlyph, light !== 'off' && styles.iconGlyphActive]}>⚡</Text>
                <Text style={[styles.lightLabel, light !== 'off' && styles.iconGlyphActive]}>
                  {LIGHT_LABEL[light]}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              onPress={handleFlip}
              accessibilityRole="button"
              accessibilityLabel={
                facing === 'back' ? 'Switch to front camera' : 'Switch to back camera'
              }
            >
              <Text style={styles.iconGlyph}>⇄</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.controls} pointerEvents="box-none">
          {zoom > 0 && (
            <View style={styles.zoomPill} pointerEvents="none">
              <Text style={styles.zoomText}>Zoom {Math.round(zoom * 100)}%</Text>
            </View>
          )}

          {uploadError && (
            <View style={styles.uploadErrorPill} pointerEvents="none">
              <Text style={styles.uploadErrorPillText}>{uploadError}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.shutterOuter, pressed && styles.shutterPressed]}
            onPress={handleShoot}
            disabled={taking || !ready}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View style={[styles.shutterInner, (taking || !ready) && styles.shutterInnerDisabled]} />
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
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    margin: spacing.md,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pressed: { opacity: 0.7 },
  iconGlyph: { color: colors.surface, fontSize: 18, fontWeight: '600' },
  iconGlyphActive: { color: colors.ink },

  lightButton: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  lightButtonActive: { backgroundColor: colors.amber },
  lightLabel: { color: colors.surface, fontSize: 14, fontWeight: '600' },

  controls: { paddingBottom: spacing.xl, alignItems: 'center' },

  zoomPill: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  zoomText: { color: colors.surface, fontSize: 13, fontWeight: '600' },

  uploadErrorPill: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  uploadErrorPillText: { color: colors.surface, fontSize: 13, fontWeight: '600', textAlign: 'center' },

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
  shutterInnerDisabled: { opacity: 0.4 },

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
  uploadErrorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
