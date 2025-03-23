import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface ThreeDotsLoaderProps {
  size?: number;
  color?: string;
}

const ThreeDotsLoader: React.FC<ThreeDotsLoaderProps> = ({ 
  size = 12,
  color = '#FF5733'
}) => {
  const dots: Animated.Value[] = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current
  ];
  const colors: string[] = ['#FF5733', '#33FF57', '#339FFF'];

  useEffect(() => {
    dots.forEach((dot, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            delay: index * 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.dotsContainer}>
      {dots.map((opacity, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors[index],
              opacity,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    marginHorizontal: 5,
  },
});

export default ThreeDotsLoader;
