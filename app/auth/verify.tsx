import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthScreen, Field, TextLink } from '../../components/AuthScreen';
import { useAuth } from '../../lib/auth';

/**
 * The second half of a password reset. A reset is the one thing that genuinely
 * needs a round trip through the inbox, and a typed code keeps that working
 * the same way on the web and on a phone — no deep links to configure.
 */
export default function VerifyScreen() {
  const router = useRouter();
  const { requestPasswordReset, resetPassword } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = code.trim().length === 6 && password.length >= 6 && !busy;

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await resetPassword(email, code.trim(), password);
      router.dismissTo('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await requestPasswordReset(email);
      setNotice('Sent. It can take a minute to arrive.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send another code.');
    }
  }

  return (
    <AuthScreen
      title="Check your email"
      subtitle={`We sent a 6-digit code to ${email}. Enter it below and choose your new password.`}
      error={error}
      footer={<TextLink label="Send the code again" onPress={handleResend} />}
    >
      <Field
        label="6-digit code"
        value={code}
        onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        editable={!busy}
        hint={notice ?? undefined}
      />
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        editable={!busy}
      />
      <PrimaryButton
        label={busy ? 'Checking…' : 'Set new password'}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </AuthScreen>
  );
}
