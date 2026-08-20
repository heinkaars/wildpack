import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../lib/theme';

/**
 * The frame every auth screen shares: a way back, a title, room for fields that
 * the keyboard cannot cover, and one place for the error to appear.
 */
export function AuthScreen({
  title,
  subtitle,
  error,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {router.canGoBack() && (
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
          )}

          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {error ? (
            <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fields}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        style={[styles.input, input.style]}
        placeholderTextColor={colors.inkMuted}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A quiet inline link, for "Forgot password?" and the like. */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },

  back: { alignSelf: 'flex-start', marginBottom: spacing.md },
  backText: { fontSize: 16, fontWeight: '600', color: colors.forest },

  title: { fontSize: 26, fontWeight: '700', color: colors.ink },
  subtitle: { marginTop: spacing.sm, fontSize: 15, lineHeight: 21, color: colors.inkMuted },

  errorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FBE9E7',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: { color: colors.danger, fontSize: 14, fontWeight: '600' },

  fields: { marginTop: spacing.lg, gap: spacing.md },
  field: { gap: spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.ink,
  },
  hint: { fontSize: 13, color: colors.inkMuted },

  footer: { marginTop: spacing.lg, gap: spacing.md, alignItems: 'center' },
  link: { fontSize: 15, fontWeight: '600', color: colors.forest },
});
