import { useState } from 'react';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreen, Field, TextLink } from '../../components/AuthScreen';
import { useAuth } from '../../lib/auth';
import { showFlash } from '../../lib/flash';

export default function CreateAccountScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = email.trim();
  const canSubmit = trimmed.includes('@') && password.length >= 6 && !busy;

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signUp(trimmed, password);
      // The account this device has been using is now theirs — same lifelist,
      // same everything, just with a way back into it.
      showFlash(`You are signed in as ${trimmed}.`);
      router.dismissTo('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Save your lifelist"
      subtitle="Everything you have collected so far stays exactly as it is — an account just means it survives a lost or replaced phone."
      error={error}
      footer={
        <TextLink
          label="I already have an account"
          onPress={() => router.replace('/auth/sign-in')}
        />
      }
    >
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
        hint="Double-check this one — it is how you get back in if you forget your password."
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        editable={!busy}
      />
      <PrimaryButton
        label={busy ? 'Creating…' : 'Create account'}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </AuthScreen>
  );
}
