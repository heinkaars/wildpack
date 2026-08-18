import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../lib/theme';

const LOOK_EMOJI: Record<string, string> = {
  fox: '🦊',
  owl: '🦉',
  otter: '🦦',
  wolf: '🐺',
  deer: '🦌',
};

export function Avatar({ look, size = 56 }: { look: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: radii.pill }]}>
      <Text style={{ fontSize: size * 0.55 }}>{LOOK_EMOJI[look] ?? '🦊'}</Text>
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
