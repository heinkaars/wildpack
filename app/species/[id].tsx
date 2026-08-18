import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLifelist } from '../../lib/lifelist-store';
import { categoryById } from '../../lib/categories';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radii, spacing } from '../../lib/theme';

export default function SpeciesCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getEntry } = useLifelist();
  const entry = getEntry(id);

  if (!entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>This species hasn't been logged yet.</Text>
          <PrimaryButton
            label="Back to Lifelist"
            onPress={() => router.dismissTo('/')}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const firstSeen = new Date(entry.firstSeenAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const category = categoryById(entry.categoryId);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Back returns to wherever the card was opened from — grid tile or celebration. */}
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backChevron}>‹</Text>
        <Text style={styles.backLabel}>Back to Lifelist</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Image source={{ uri: entry.photoUri }} style={styles.photo} />

        <View style={styles.body}>
          <Text style={styles.name}>{entry.commonName}</Text>
          <Text style={styles.scientific}>{entry.scientificName}</Text>

          <Text style={styles.description}>{entry.description}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>📅  {firstSeen}</Text>
            <Text style={styles.meta}>
              📍  {entry.location ?? 'Location not recorded'}
            </Text>
          </View>

          <View style={styles.tagRow}>
            {category && <Text style={styles.tag}>{category.label}</Text>}
            <Text style={styles.tag}>
              {entry.sightingCount} {entry.sightingCount === 1 ? 'sighting' : 'sightings'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* AMA peek bar — tapping expands into the full sheet. */}
      <Pressable
        style={({ pressed }) => [styles.amaPeek, pressed && styles.amaPeekPressed]}
        onPress={() => router.push(`/ama/${entry.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Ask about this ${entry.commonName}`}
      >
        <Text style={styles.amaPlaceholder} numberOfLines={1}>
          Ask about this {entry.commonName}…
        </Text>
        <View style={styles.amaIcon}>
          <Text style={styles.amaIconText}>↑</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  notFound: { color: colors.inkMuted, textAlign: 'center' },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backChevron: { fontSize: 22, color: colors.forest, marginRight: spacing.xs, lineHeight: 24 },
  backLabel: { fontSize: 15, fontWeight: '600', color: colors.forest },

  scroll: { paddingBottom: spacing.lg },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  body: { padding: spacing.lg },
  name: { fontSize: 26, fontWeight: '800', color: colors.ink },
  scientific: { fontSize: 15, color: colors.inkMuted, fontStyle: 'italic', marginTop: 2 },
  description: { marginTop: spacing.md, fontSize: 15, lineHeight: 22, color: colors.ink },

  metaRow: { marginTop: spacing.lg, gap: spacing.sm },
  meta: { fontSize: 14, color: colors.inkMuted },

  tagRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forest,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    overflow: 'hidden',
  },

  amaPeek: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  amaPeekPressed: { opacity: 0.9 },
  amaPlaceholder: { flex: 1, fontSize: 15, color: colors.inkMuted, marginLeft: spacing.xs },
  amaIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amaIconText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});
