import { useState } from 'react';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreen, Field } from '../../components/AuthScreen';
import { useAuth } from '../../lib/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = email.trim();

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(trimmed);
      router.replace({ pathname: '/auth/verify', params: { email: trimmed } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="Tell us the email on your account and we will send you a 6-digit code."
      error={error}
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
      />
      <PrimaryButton
        label={busy ? 'Sending…' : 'Send me a code'}
        onPress={handleSubmit}
        disabled={!trimmed.includes('@') || busy}
      />
    </AuthScreen>
  );
}
