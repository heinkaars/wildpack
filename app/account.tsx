import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { Avatar, LOOKS } from '../components/Avatar';
import { useAuth } from '../lib/auth';
import { useLifelist } from '../lib/lifelist-store';
import { confirmAction } from '../lib/confirm';
import { colors, radii, spacing } from '../lib/theme';

export default function AccountScreen() {
  const router = useRouter();
  const { isAnonymous, email, signOut } = useAuth();
  const { profile, profileLoaded, entries, updateProfile } = useLifelist();

  const [name, setName] = useState(profile.name);

  // The displayed name is a stand-in until the account's real one arrives.
  // Keep the field in step with it, and out of reach until then, so a
  // placeholder cannot be committed as if the user had chosen it.
  useEffect(() => {
    setName(profile.name);
  }, [profile.name]);

  // The account is only real once the emailed code has been entered, so an
  // address without a confirmed session still counts as unsaved.
  const saved = !isAnonymous && !!email;

  function commitName() {
    const trimmed = name.trim();
    if (!profileLoaded || !trimmed || trimmed === profile.name) {
      setName(profile.name);
      return;
    }
    updateProfile({ name: trimmed });
  }

  async function handleSignOut() {
    const confirmed = await confirmAction({
      title: 'Sign out?',
      message:
        'Your lifelist stays safe on your account. This phone goes back to a blank one until you sign in again.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (!confirmed) return;

    await signOut();
    router.dismissTo('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bar}>
        <Text style={styles.barTitle}>Account</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Avatar look={profile.look} size={72} />
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={commitName}
            onSubmitEditing={commitName}
            returnKeyType="done"
            editable={profileLoaded}
            style={[styles.nameInput, !profileLoaded && styles.nameInputWaiting]}
            maxLength={24}
            accessibilityLabel="Your name"
          />
          <Text style={styles.count}>
            {entries.length} {entries.length === 1 ? 'species' : 'species'} collected
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Your look</Text>
        <View style={styles.lookRow}>
          {LOOKS.map((look) => (
            <Pressable
              key={look.id}
              onPress={() => profileLoaded && updateProfile({ look: look.id })}
              accessibilityRole="button"
              accessibilityLabel={look.label}
              style={[styles.lookTile, profile.look === look.id && styles.lookTileActive]}
            >
              <Text style={styles.lookEmoji}>{look.emoji}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Account</Text>

        {saved ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Signed in</Text>
            <Text style={styles.cardBody}>{email}</Text>
            <Text style={styles.cardNote}>
              Your lifelist is backed up. Sign in on another phone to pick up where you left off.
            </Text>

            <PrimaryButton
              label="Sign out"
              variant="secondary"
              onPress={handleSignOut}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your lifelist only lives on this phone</Text>
            <Text style={styles.cardBody}>
              Lose the phone and you lose the list. An account keeps it safe and lets you carry it
              to a new one.
            </Text>
            <PrimaryButton
              label="Create an account"
              onPress={() => router.push('/auth/create-account')}
              style={{ marginTop: spacing.md }}
            />
            <PrimaryButton
              label="I already have one"
              variant="secondary"
              onPress={() => router.push('/auth/sign-in')}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  barTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  done: { fontSize: 16, fontWeight: '600', color: colors.forest },

  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  identity: { alignItems: 'center', paddingVertical: spacing.md },
  nameInput: {
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    minWidth: 180,
  },
  nameInputWaiting: { color: colors.inkMuted, borderBottomColor: 'transparent' },
  count: { marginTop: spacing.sm, fontSize: 14, color: colors.inkMuted },

  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },

  lookRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lookTile: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookTileActive: { borderColor: colors.forest, backgroundColor: colors.amber },
  lookEmoji: { fontSize: 24 },

  card: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  cardBody: { marginTop: spacing.xs, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  cardNote: { marginTop: spacing.sm, fontSize: 13, lineHeight: 19, color: colors.inkMuted },

});
