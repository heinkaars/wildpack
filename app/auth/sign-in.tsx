import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreen, Field, TextLink } from '../../components/AuthScreen';
import { useAuth } from '../../lib/auth';
import { previewMerge } from '../../lib/account-switch';
import { showFlash } from '../../lib/flash';
import { colors, radii, spacing } from '../../lib/theme';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [carrying, setCarrying] = useState<{ species: number; sightings: number } | null>(null);

  // What this device is holding, so the merge is stated up front rather than
  // happening silently behind the sign-in.
  useEffect(() => {
    let cancelled = false;
    previewMerge().then((counts) => {
      if (!cancelled && counts.sightings > 0) setCarrying(counts);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = email.trim();
  const canSubmit = trimmed.includes('@') && password.length > 0 && !busy;

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(trimmed, password);

      showFlash(`Welcome back. Signed in as ${trimmed}.`);

      // The lifelist store rebuilds itself around the new account; going back to
      // the root means landing on it once it has.
      router.dismissTo('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to bring your lifelist onto this phone."
      error={error}
      footer={
        <>
          <TextLink label="Forgot your password?" onPress={() => router.push('/auth/forgot-password')} />
          <TextLink label="Create an account instead" onPress={() => router.replace('/auth/create-account')} />
        </>
      }
    >
      {carrying && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            The {carrying.sightings === 1 ? 'sighting' : `${carrying.sightings} sightings`} on this
            phone {carrying.sightings === 1 ? 'moves' : 'move'} across to the account you sign in to.
            Nothing is lost.
          </Text>
        </View>
      )}

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        editable={!busy}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        editable={!busy}
      />
      <PrimaryButton
        label={busy ? 'Signing in…' : 'Sign in'}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: { fontSize: 14, lineHeight: 20, color: colors.inkMuted },
});
