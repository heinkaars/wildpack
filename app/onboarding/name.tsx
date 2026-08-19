import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useLifelist } from '../../lib/lifelist-store';
import { useOnboarding } from '../../lib/onboarding';
import { colors, radii, spacing } from '../../lib/theme';

export default function ChooseNameScreen() {
  const router = useRouter();
  const { updateProfile } = useLifelist();
  const { markComplete } = useOnboarding();
  const [name, setName] = useState('');

  async function handleNext() {
    const trimmed = name.trim();
    // Left blank, the generated Explorer_NN name already on the profile stands.
    if (trimmed) await updateProfile({ name: trimmed });
    // Look and name are saved, so quitting on A5 should not restart the flow.
    await markComplete();
    router.push('/onboarding/first-capture');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.title}>Choose your name</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={24}
            returnKeyType="done"
            onSubmitEditing={handleNext}
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Next" onPress={handleNext} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  input: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.ink,
  },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
