import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LOOKS } from '../../components/Avatar';
import { useLifelist } from '../../lib/lifelist-store';
import { colors, radii, spacing } from '../../lib/theme';

export default function ChooseLookScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useLifelist();
  const [selected, setSelected] = useState(profile.look);

  async function handleNext() {
    await updateProfile({ look: selected });
    router.push('/onboarding/name');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>Choose your look</Text>

        <View style={styles.grid}>
          {LOOKS.map((look) => {
            const isSelected = look.id === selected;
            return (
              <Pressable
                key={look.id}
                onPress={() => setSelected(look.id)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={look.label}
              >
                <Text style={styles.optionEmoji}>{look.emoji}</Text>
                {isSelected && (
                  <View style={styles.check}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Next" onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
}

// Four across, two rows — the widest that fits a small phone at this padding.
const OPTION_SIZE = 64;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  option: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: { borderColor: colors.forest, backgroundColor: colors.amber },
  optionPressed: { opacity: 0.85 },
  optionEmoji: { fontSize: 30 },
  check: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  checkMark: { color: colors.surface, fontSize: 12, fontWeight: '700' },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
