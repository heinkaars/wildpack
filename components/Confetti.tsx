import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

const PIECE_COLORS = [colors.amber, colors.leaf, colors.forest, '#E8C86B', '#8FCBA6'];
const PIECE_COUNT = 30;

/** Deterministic pseudo-random so pieces keep their shape across re-renders. */
function rand(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Piece({ index, width, height }: { index: number; width: number; height: number }) {
  const progress = useSharedValue(0);

  const startX = rand(index, 1) * width;
  const drift = (rand(index, 2) - 0.5) * 160;
  const delay = rand(index, 3) * 320;
  const duration = 1500 + rand(index, 4) * 800;
  const size = 7 + rand(index, 5) * 7;
  const spins = 1 + rand(index, 6) * 3;
  const isRound = rand(index, 7) > 0.55;
  const color = PIECE_COLORS[index % PIECE_COLORS.length];

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-70, height * 0.85]) },
      { translateX: interpolate(progress.value, [0, 1], [0, drift]) },
      { rotate: `${progress.value * 360 * spins}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.7, 1], [1, 1, 0]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          width: size,
          height: isRound ? size : size * 1.6,
          borderRadius: isRound ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function Confetti() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PIECE_COUNT }, (_, index) => (
        <Piece key={index} index={index} width={width} height={height} />
      ))}
    </View>
  );
}
