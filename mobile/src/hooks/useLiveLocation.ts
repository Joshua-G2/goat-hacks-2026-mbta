import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '@store/locationStore';
import { calculateDistance } from '@utils/helpers';

// Constants
const GPS_MIN_MS = 5000; // 5 seconds
const GPS_MIN_DISTANCE_M = 10; // 10 meters
const MAX_JUMP_DISTANCE_M = 250; // Ignore jumps > 250m within 2s
const MIN_JUMP_INTERVAL_MS = 2000; // 2 seconds
const POOR_ACCURACY_THRESHOLD = 50; // meters
const ACCURACY_SAMPLES = 10; // for moving average

interface LocationData {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number;
  timestamp: number;
}

interface LocationStatus {
  granted: boolean;
  error: string | null;
  tracking: boolean;
}

export const useLiveLocation = () => {
  const { setUserLocation, setTracking, setError } = useLocationStore();
  const [status, setStatus] = useState<LocationStatus>({
    granted: false,
    error: null,
    tracking: false,
  });

  const lastLocationRef = useRef<LocationData | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const accuracyHistoryRef = useRef<number[]>([]);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Calculate moving average of accuracy
  const updateAccuracyAverage = (newAccuracy: number) => {
    accuracyHistoryRef.current.push(newAccuracy);
    if (accuracyHistoryRef.current.length > ACCURACY_SAMPLES) {
      accuracyHistoryRef.current.shift();
    }
    const average =
      accuracyHistoryRef.current.reduce((a, b) => a + b, 0) /
      accuracyHistoryRef.current.length;
    console.log(`[GPS] Accuracy avg: ${average.toFixed(1)}m (current: ${newAccuracy.toFixed(1)}m)`);
  };

  // Validate coordinates
  const isValidCoordinate = (lat: number, lng: number): boolean => {
    if (isNaN(lat) || isNaN(lng)) {
      console.error('[GPS] Invalid coordinates: NaN detected');
      return false;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error(`[GPS] Coordinates out of bounds: ${lat}, ${lng}`);
      return false;
    }
    return true;
  };

  // Anti-jitter filter
  const shouldAcceptLocation = (newLocation: LocationData): boolean => {
    if (!lastLocationRef.current) {
      return true; // First location, always accept
    }

    const lastLoc = lastLocationRef.current;
    const timeSinceLastUpdate = newLocation.timestamp - lastUpdateTimeRef.current;

    // Calculate distance from last position
    const distance = calculateDistance(
      { latitude: lastLoc.lat, longitude: lastLoc.lng },
      { latitude: newLocation.lat, longitude: newLocation.lng }
    );

    // Detect GPS glitch: large jump in short time with good accuracy
    if (
      distance > MAX_JUMP_DISTANCE_M &&
      timeSinceLastUpdate < MIN_JUMP_INTERVAL_MS &&
      newLocation.accuracy < POOR_ACCURACY_THRESHOLD
    ) {
      console.warn(
        `[GPS] Ignoring jump: ${distance.toFixed(0)}m in ${(timeSinceLastUpdate / 1000).toFixed(1)}s (likely glitch)`
      );
      return false;
    }

    // Accept if accuracy is poor (likely legitimate position correction)
    if (newLocation.accuracy > POOR_ACCURACY_THRESHOLD) {
      console.log('[GPS] Accepting position with poor accuracy (likely correction)');
      return true;
    }

    return true;
  };

  // Handle location update
  const handleLocationUpdate = (location: Location.LocationObject) => {
    const { latitude, longitude, heading, speed, accuracy } = location.coords;

    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      setError('Invalid GPS coordinates received');
      return;
    }

    const newLocation: LocationData = {
      lat: latitude,
      lng: longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? 0,
      timestamp: location.timestamp,
    };

    // Update accuracy average
    updateAccuracyAverage(newLocation.accuracy);

    // Apply anti-jitter filter
    if (!shouldAcceptLocation(newLocation)) {
      return;
    }

    // Update store
    setUserLocation({
      latitude,
      longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    });

    // Update refs
    lastLocationRef.current = newLocation;
    lastUpdateTimeRef.current = newLocation.timestamp;

    console.log(
      `[GPS] Updated: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | ` +
      `heading: ${heading?.toFixed(0) ?? 'N/A'}° | ` +
      `speed: ${speed?.toFixed(1) ?? 'N/A'} m/s`
    );
  };

  // Request permissions and start tracking
  const startTracking = async () => {
    try {
      // Request foreground permission
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (permissionStatus !== 'granted') {
        setStatus({
          granted: false,
          error: 'Location permission denied',
          tracking: false,
        });
        setError('Location permission denied');
        console.error('[GPS] Permission denied');
        return;
      }

      console.log('[GPS] Permission granted, starting watch...');
      setStatus((prev) => ({ ...prev, granted: true }));
      setTracking(true);

      // Get initial position
      try {
        const initialPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        handleLocationUpdate(initialPosition);
      } catch (err) {
        console.warn('[GPS] Could not get initial position:', err);
      }

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: GPS_MIN_MS,
          distanceInterval: GPS_MIN_DISTANCE_M,
        },
        (location) => {
          handleLocationUpdate(location);
        }
      );

      subscriptionRef.current = subscription;
      setStatus((prev) => ({ ...prev, tracking: true, error: null }));
      setError(null);
      console.log('[GPS] Tracking started successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'GPS initialization failed';
      console.error('[GPS] Error starting tracking:', errorMessage);
      setStatus({
        granted: false,
        error: errorMessage,
        tracking: false,
      });
      setError(errorMessage);

      // Fallback for development: manual location setting
      if (__DEV__) {
        console.warn('[GPS] DEV MODE: Falling back to manual location mode');
        console.warn('[GPS] Use MapGameScreen to tap and set location manually');
      }
    }
  };

  // Stop tracking
  const stopTracking = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
      console.log('[GPS] Tracking stopped');
    }
    setTracking(false);
    setStatus((prev) => ({ ...prev, tracking: false }));
  };

  // Auto-start on mount
  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, []);

  return {
    status,
    startTracking,
    stopTracking,
    lastLocation: lastLocationRef.current,
  };
};
