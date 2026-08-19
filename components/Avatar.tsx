import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../lib/theme';

/** The picker on A3 and every avatar in the app read from this one list. */
export const LOOKS: { id: string; emoji: string; label: string }[] = [
  { id: 'fox', emoji: '🦊', label: 'Fox' },
  { id: 'owl', emoji: '🦉', label: 'Owl' },
  { id: 'otter', emoji: '🦦', label: 'Otter' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'deer', emoji: '🦌', label: 'Deer' },
  { id: 'frog', emoji: '🐸', label: 'Frog' },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly' },
  { id: 'turtle', emoji: '🐢', label: 'Turtle' },
];

export const DEFAULT_LOOK = LOOKS[0].id;

export function lookEmoji(look: string): string {
  return LOOKS.find((option) => option.id === look)?.emoji ?? LOOKS[0].emoji;
}

export function Avatar({ look, size = 56 }: { look: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: radii.pill }]}>
      <Text style={{ fontSize: size * 0.55 }}>{lookEmoji(look)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
