import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface WaveProps {
  delay: number;
  coreSize: number;
  maxScale: number;
  duration: number;
  waveColor: string;
}

const Wave = ({ delay, coreSize, maxScale, duration, waveColor }: WaveProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false
      )
    );
  }, [delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [1, maxScale]);
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0.6, 0.4, 0]);

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: coreSize,
          height: coreSize,
          borderRadius: coreSize / 2,
          backgroundColor: waveColor,
        },
        animatedStyle,
      ]}
    />
  );
};

interface SonarCircleProps {
  coreSize?: number;
  waveCount?: number;
  maxScale?: number;
  duration?: number;
  coreColor?: string;
  waveColor?: string;
}

export default function SonarCircle({
  coreSize = 6,
  waveCount = 3,
  maxScale = 4,
  duration = 2000,
  coreColor = 'rgb(255, 215, 0)',
  waveColor = 'rgba(255, 215, 0, 0.5)',
}: SonarCircleProps) {
  return (
    <View
      style={{
        width: coreSize,
        height: coreSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: waveCount }).map((_, i) => (
        <Wave
          key={i}
          delay={(duration / waveCount) * i}
          coreSize={coreSize}
          maxScale={maxScale}
          duration={duration}
          waveColor={waveColor}
        />
      ))}
      <View
        style={{
          width: coreSize,
          height: coreSize,
          borderRadius: coreSize / 2,
          backgroundColor: coreColor,
        }}
      />
    </View>
  );
}