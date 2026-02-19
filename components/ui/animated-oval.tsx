import { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

export default function AnimatedOval() {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulseScale = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseOpacity = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseScale.start();
    pulseOpacity.start();

    return () => {
      pulseScale.stop();
      pulseOpacity.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated circle with perspective tilt */}
      <Animated.View
        style={[
          styles.circle,
          {
            opacity: opacityAnim,
            transform: [
              { perspective: 600 },
              { rotateX: "60deg" },
              { rotateZ: "45deg" },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Inner highlight shimmer */}
        <View style={styles.innerHighlight} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0, 0, 0, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    // Shadow iOS
    shadowColor: "#64c8ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    // Shadow Android
    elevation: 20,
  },
  innerHighlight: {
    position: "absolute",
    top: "20%",
    left: "20%",
    width: "35%",
    height: "35%",
    borderRadius: 15,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
});