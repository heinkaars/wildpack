import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSyncStatus, onSynced, sync, SyncStatus } from '../lib/sync';
import { useAuth } from '../lib/auth';
import { colors, radii, spacing } from '../lib/theme';

/**
 * Shows what has not reached the server yet. Without this a queue that keeps
 * failing looks identical to one that has finished, which is how five synced
 * species can quietly turn into none.
 */
export function SyncIndicator() {
  const { userId } = useAuth();
  const [status, setStatus] = useState<SyncStatus | null>(null);

  const refresh = useCallback(() => {
    getSyncStatus().then(setStatus);
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = onSynced(refresh);
    // The queue also drains on its own timers, so poll while anything is left.
    const timer = setInterval(refresh, 3000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [refresh]);

  if (!status || status.pending === 0) return null;

  const isStuck = status.stuck > 0;
  const label = isStuck
    ? `${status.pending} ${status.pending === 1 ? 'sighting' : 'sightings'} not uploaded`
    : `Saving ${status.pending}…`;

  return (
    <Pressable
      style={[styles.row, isStuck && styles.rowStuck]}
      onPress={() => userId && sync(userId)}
      accessibilityRole="button"
      accessibilityLabel={isStuck ? `${label}. Tap to retry.` : label}
    >
      <Text style={[styles.text, isStuck && styles.textStuck]}>
        {isStuck ? '⚠️ ' : '↑ '}
        {label}
      </Text>
      {isStuck && <Text style={styles.retry}>Retry</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  rowStuck: { borderColor: '#D9822B', backgroundColor: '#FDF3E7' },
  text: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' },
  textStuck: { color: '#8A4B08' },
  retry: { color: '#8A4B08', fontSize: 13, fontWeight: '700' },
});
