import { useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '@store/locationStore';
import { calculateDistance } from '@utils/helpers';
import type { Location as LocationType } from '@types';

/**
 * Custom hook for GPS tracking with watchPosition
 */
export const useLocation = () => {
  const {
    userLocation,
    watchId,
    isTracking,
    error,
    setUserLocation,
    setWatchId,
    setTracking,
    setError,
  } = useLocationStore();

  /**
   * Start watching user location
   */
  const startTracking = useCallback(async () => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }

      setTracking(true);
      setError(null);

      // Get initial position
      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const initialLocation: LocationType = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
        altitude: initialPosition.coords.altitude,
        accuracy: initialPosition.coords.accuracy,
        heading: initialPosition.coords.heading,
        speed: initialPosition.coords.speed,
        timestamp: initialPosition.timestamp,
      };

      setUserLocation(initialLocation);

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (position) => {
          const newLocation: LocationType = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };

          setUserLocation(newLocation);
        }
      );

      // Store subscription for cleanup
      setWatchId(subscription.remove as any);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start tracking';
      setError(errorMessage);
      setTracking(false);
      console.error('Location tracking error:', err);
    }
  }, [setUserLocation, setWatchId, setTracking, setError]);

  /**
   * Stop watching user location
   */
  const stopTracking = useCallback(() => {
    if (watchId) {
      (watchId as any)();
      setWatchId(null);
    }
    setTracking(false);
  }, [watchId, setWatchId, setTracking]);

  /**
   * Calculate distance from user to target
   */
  const getDistanceToTarget = useCallback(
    (target: { latitude: number; longitude: number }): number | null => {
      if (!userLocation) return null;
      return calculateDistance(userLocation, target);
    },
    [userLocation]
  );

  /**
   * Auto-start tracking on mount
   */
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, []);

  return {
    userLocation,
    isTracking,
    error,
    startTracking,
    stopTracking,
    getDistanceToTarget,
  };
};
