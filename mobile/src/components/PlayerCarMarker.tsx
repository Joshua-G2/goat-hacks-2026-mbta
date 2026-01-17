import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Platform } from 'react-native';
import { useLocationStore } from '@store/locationStore';

// Conditional import for Marker
let Marker: any = null;
if (Platform.OS !== 'web') {
  const ReactNativeMaps = require('react-native-maps');
  Marker = ReactNativeMaps.Marker;
}

const CAR_ICON = '🚗'; // Unicode car emoji
const ANIMATION_DURATION = 500; // ms

interface PlayerCarMarkerProps {
  mapCenter?: { latitude: number; longitude: number };
}

export const PlayerCarMarker: React.FC<PlayerCarMarkerProps> = ({ mapCenter }) => {
  const { userLocation, isTracking } = useLocationStore();
  const [isFirstFix, setIsFirstFix] = useState(true);
  const animatedLat = useRef(new Animated.Value(mapCenter?.latitude || 42.3601)).current;
  const animatedLng = useRef(new Animated.Value(mapCenter?.longitude || -71.0589)).current;
  const animatedRotation = useRef(new Animated.Value(0)).current;
  const lastSpeedRef = useRef<number>(0);
  const animationFrequencyRef = useRef<number>(ANIMATION_DURATION);

  // Don't render on web or if no GPS tracking or no location
  if (Platform.OS === 'web' || !Marker || !isTracking || !userLocation) {
    console.log('[PlayerCarMarker] Not rendering: platform=' + Platform.OS + ', tracking=' + isTracking + ', location=' + !!userLocation);
    return null;
  }

  const { latitude, longitude, heading, speed } = userLocation;

  // Validate coordinates
  if (isNaN(latitude) || isNaN(longitude)) {
    console.error('[PlayerCarMarker] Invalid coordinates, not rendering');
    return null;
  }

  // Update heading with animation
  useEffect(() => {
    const targetHeading = heading ?? 0; // Default to 0 if heading is null
    
    Animated.timing(animatedRotation, {
      toValue: targetHeading,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [heading]);

  // Update position with animation
  useEffect(() => {
    if (!userLocation) return;

    const currentSpeed = speed ?? 0;
    lastSpeedRef.current = currentSpeed;

    // Reduce animation frequency when stationary
    if (currentSpeed === 0) {
      animationFrequencyRef.current = ANIMATION_DURATION * 2;
    } else {
      animationFrequencyRef.current = ANIMATION_DURATION;
    }

    // First fix: animate from map center to actual location
    if (isFirstFix && mapCenter) {
      console.log('[PlayerCarMarker] First GPS fix, animating from map center to location');
      
      Animated.parallel([
        Animated.timing(animatedLat, {
          toValue: latitude,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedLng, {
          toValue: longitude,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsFirstFix(false);
      });
    } else {
      // Smooth position updates
      Animated.parallel([
        Animated.timing(animatedLat, {
          toValue: latitude,
          duration: animationFrequencyRef.current,
          useNativeDriver: true,
        }),
        Animated.timing(animatedLng, {
          toValue: longitude,
          duration: animationFrequencyRef.current,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [latitude, longitude, speed]);

  // Create coordinate for marker
  const coordinate: LatLng = {
    latitude,
    longitude,
  };

  // Speed indicator for title
  const speedKmh = speed ? (speed * 3.6).toFixed(1) : '0.0';
  const headingDegrees = heading ?? 0;

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      rotation={headingDegrees}
      flat={true}
      title="You"
      description={`Speed: ${speedKmh} km/h | Heading: ${headingDegrees.toFixed(0)}°`}
    >
      <Animated.Text
        style={[
          styles.carIcon,
          {
            transform: [
              {
                rotate: animatedRotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        {CAR_ICON}
      </Animated.Text>
    </Marker>
  );
};

const styles = StyleSheet.create({
  carIcon: {
    fontSize: 32,
    textAlign: 'center',
  },
});
