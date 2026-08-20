import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLifelist } from '../lib/lifelist-store';
import { useCaptureSession } from '../lib/capture-session';
import { CelebrationModal } from '../components/CelebrationModal';
import { MILESTONES } from '../lib/milestones';
import { Avatar } from '../components/Avatar';
import { SyncIndicator } from '../components/SyncIndicator';
import { useOnboarding } from '../lib/onboarding';
import { FlashBanner } from '../lib/flash';
import { colors, radii, spacing } from '../lib/theme';
import { LifelistEntry } from '../lib/types';

export default function LifelistScreen() {
  const router = useRouter();
  const { ready, profile, entries, streak } = useLifelist();
  const { celebration, reset } = useCaptureSession();
  const { resetOnboarding } = useOnboarding();

  function handleCelebrationContinue() {
    if (!celebration) return;
    const speciesId = celebration.entry.id;
    reset();
    router.push(`/species/${speciesId}`);
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <Text style={styles.loading}>Loading your lifelist…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.push('/account')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Your account"
        >
          <Avatar look={profile.look} size={44} />
        </Pressable>
        <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
        {streak > 0 && (
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>{streak}-day streak</Text>
            <Text style={styles.streakFlame}>🔥</Text>
          </View>
        )}
      </View>

      <SyncIndicator />

      {__DEV__ && (
        <Pressable onPress={resetOnboarding} hitSlop={8}>
          <Text style={styles.devReplay}>↺ Replay onboarding (dev)</Text>
        </Pressable>
      )}

      <Text style={styles.sectionLabel}>Milestone Badges</Text>
      <View style={styles.badgeRow}>
        {MILESTONES.map((milestone) => {
          const earned = entries.length >= milestone.threshold;
          return (
            <View
              key={milestone.threshold}
              style={[styles.badge, earned && styles.badgeEarned]}
            >
              <Text style={[styles.badgeText, earned && styles.badgeTextEarned]}>
                {earned ? '🏅' : milestone.threshold}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Lifelist</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your lifelist is empty</Text>
            <Text style={styles.emptyBody}>
              Photograph your first species to start collecting.
            </Text>
          </View>
        }
        renderItem={({ item }: { item: LifelistEntry }) => (
          <Pressable style={styles.tile} onPress={() => router.push(`/species/${item.id}`)}>
            <Image source={{ uri: item.photoUri }} style={styles.tileImage} />
            <Text style={styles.tileName} numberOfLines={1}>{item.commonName}</Text>
          </Pressable>
        )}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/capture')}
        accessibilityRole="button"
        accessibilityLabel="Capture wildlife"
      >
        <Text style={styles.fabIcon}>📷</Text>
      </Pressable>

      {celebration && (
        <CelebrationModal payload={celebration} onContinue={handleCelebrationContinue} />
      )}

      {/* Confirms a sign-in or a new account, both of which land here. */}
      <FlashBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: colors.inkMuted },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm },
  name: { flex: 1, marginLeft: spacing.md, fontSize: 20, fontWeight: '700', color: colors.ink },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.forest,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  streakText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  streakFlame: { fontSize: 13, marginLeft: 4 },

  devReplay: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },

  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },

  badgeRow: { flexDirection: 'row', gap: spacing.sm },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEarned: { backgroundColor: colors.amber, borderColor: colors.amber },
  badgeText: { fontSize: 13, fontWeight: '700', color: colors.inkMuted },
  badgeTextEarned: { fontSize: 18 },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  gridRow: { gap: spacing.sm },
  tile: { flex: 1 / 3, marginBottom: spacing.sm },
  tileImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  tileName: { marginTop: spacing.xs, fontSize: 12, fontWeight: '600', color: colors.ink },

  empty: { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  emptyBody: { color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.forestDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabPressed: { opacity: 0.85 },
  fabIcon: { fontSize: 26 },
});
