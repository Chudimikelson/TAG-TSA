import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

type Props = {
  compact?: boolean;
  fullScreen?: boolean;
};

export function TagoraLoader({ compact = false, fullScreen = false }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, [pulse, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });

  const loaderSize = compact ? 14 : 67;
  const ringInset = compact ? -1 : -2;
  const ringBorder = compact ? 1 : 1.5;

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <View style={[styles.markWrap, { width: loaderSize, height: loaderSize }]}>
        <Animated.View
          style={[
            styles.ring,
            {
              top: ringInset,
              right: ringInset,
              bottom: ringInset,
              left: ringInset,
              borderWidth: ringBorder,
              transform: [{ rotate }],
            },
          ]}
        />
        <Animated.Image
          source={require('../../assets/tagora-preloader.png')}
          resizeMode="contain"
          style={[
            styles.image,
            {
              width: loaderSize,
              height: loaderSize,
              borderRadius: loaderSize / 2,
              transform: [{ scale }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  markWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderTopColor: 'rgba(200,154,34,0.95)',
    borderRightColor: 'rgba(246,222,155,0.8)',
    borderBottomColor: 'rgba(200,154,34,0.28)',
    borderLeftColor: 'rgba(200,154,34,0.28)',
  },
  image: {
    opacity: 0.98,
    shadowColor: '#0a1f44',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});